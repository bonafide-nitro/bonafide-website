#!/usr/bin/env python3
"""
Shared, read-only GitHub protocol-event parsing library.

Issue #171 (harness golden-path sync) retired this module's former
controller behavior: Block 1E (Issue #113) used to compute and apply one
mutually-exclusive GitHub state label (`CLAUDE_WORKING`/`SANTIAGO_REVIEWING`/
`CORRECTION_IN_PROGRESS`/`NEEDS_ZANETA`/`VERIFIED`/`COMPLETED`, plus
`CLAUDE_STALLED`/`SANTIAGO_STALLED` from Block 1F) and an edited-in-place
"CURRENT STATUS" comment, and to page Žaneta by email on a human-gate
transition. That controller competed with, and wrote labels forbidden by,
the golden Claude<->Codex/Santiago transport this repository now runs (see
`docs/HARNESS_GOLDEN_PATH.md` and `docs/decisions/0087-harness-golden-path-
retirement.md`) -- it has been removed, along with `.github/workflows/
claude-task-status.yml`, `.github/workflows/claude-stall-watchdog.yml`,
`scripts/claude_stall_watchdog.py`, and `scripts/claude_notify.py`.

What remains is only the comment/review classification this module always
used to derive status from -- kept because `scripts/claude_cloud_bridge.py`
has a real functional dependency on it for the bridge's own per-(PR, head
SHA, correction round) dispatch idempotency (Issue #137): `classify_comments`,
`fetch_comments`, `fetch_reviews`, and `count_pr_correction_rounds`. Nothing
below writes a label, posts/edits a comment, or sends a notification -- every
function here is a pure read/parse, exactly as safe to import as a library
as it always was for that one purpose.

`gh_runner` stays an injected, keyword-only parameter on every function that
needs it, exactly like `scripts/claude_cloud_bridge.py`'s own pattern, so
every function here is exercisable offline with no real process spawned.
"""

import json
import subprocess
import sys
from dataclasses import dataclass

#: Historical marker of the retired "CURRENT STATUS" comment. No code here
#: produces this comment anymore, but `classify_comments` still skips a
#: comment that starts with it -- an already-open Block from before this
#: retirement may still carry one, and it must never be mistaken for a
#: protocol event (its body legitimately contains prose like "State:
#: NEEDS_ZANETA", which is not a standalone keyword line, but skipping the
#: whole comment is simpler and strictly safer than relying on that).
STATUS_MARKER = "<!-- CLAUDE_TASK_STATUS:v1 -->"

#: The seven canonical protocol states, exactly as docs/AGENT_WORKFLOW.md
#: defines them (`READY_FOR_CLAUDE` never appears as a *comment* keyword --
#: it is set by Žaneta applying a label, not by a comment -- so it is
#: intentionally absent from this list of comment-body keywords).
PROTOCOL_STATE_KEYWORDS = (
    "CONTEXT_RECEIPT",
    "IMPLEMENTING",
    "READY_FOR_SANTIAGO",
    "CHANGES_REQUESTED",
    "NEEDS_ZANETA",
    "VERIFIED",
    "COMPLETED",
)

#: The Cloud Claude Routine bridge's own comment formats (see
#: scripts/claude_cloud_bridge.py) -- not one of the seven protocol states,
#: but a genuine bridge event `classify_comments`/`find_existing_pr_dispatch`
#: must recognize as such rather than via a raw substring search.
BRIDGE_KEYWORDS = ("ROUTINE_DISPATCHED", "ROUTINE_FIRE_FAILED", "ROUTINE_DISPATCH_CLAIMED")

#: Žaneta's answer to a NEEDS_ZANETA. `.github/workflows/harness-requeue.yml`
#: restarts Claude on it, so it opens a new correction round exactly like
#: CHANGES_REQUESTED -- otherwise the bridge's per-(PR, head SHA, round)
#: idempotency would refuse to restart Claude on an unchanged head.
HUMAN_DECISION_KEYWORDS = ("ZANETA_DECISION",)

RECOGNIZED_KEYWORDS = (frozenset(PROTOCOL_STATE_KEYWORDS) | frozenset(BRIDGE_KEYWORDS)
                       | frozenset(HUMAN_DECISION_KEYWORDS))


class TaskStatusError(RuntimeError):
    """A protocol-event read operation could not be completed safely."""


@dataclass(frozen=True)
class WorkItem:
    """One exact GitHub issue or PR to read protocol events for."""

    kind: str  # "issue" or "pr"
    number: int
    repo: str  # "owner/repo"

    def __post_init__(self):
        if self.kind not in ("issue", "pr"):
            raise TaskStatusError(f"unknown work item kind {self.kind!r}")

    @property
    def label(self):
        return "Issue" if self.kind == "issue" else "Pull Request"

    @property
    def gh_subcommand(self):
        return "issue" if self.kind == "issue" else "pr"


@dataclass(frozen=True)
class ProtocolEvent:
    """One recognized keyword line found in one (non-status) comment."""

    author: str
    keyword: str
    body: str
    #: The comment's own `created_at` (GitHub's ISO-8601 UTC string, e.g.
    #: "2026-09-04T08:34:31Z") -- sorts correctly as a plain string, which
    #: is what `merge_events_chronologically` relies on. Defaults to "" so
    #: every existing caller that builds a `ProtocolEvent` without a
    #: timestamp (tests, mainly) keeps working unchanged; events sharing an
    #: empty/equal timestamp keep their original relative order because the
    #: sort merge_events_chronologically performs is stable.
    created_at: str = ""


# ---------------------------------------------------------------------------
# Pure computation -- no gh_runner, no network, exercisable with plain data.
# ---------------------------------------------------------------------------


def extract_keyword(body):
    """The last standalone line in `body` that exactly matches a recognized
    protocol/bridge keyword. "Last" mirrors docs/AGENT_WORKFLOW.md's own
    backward-scan rule ("the most recent state comment wins"), applied
    within a single comment for the one documented case where one comment
    carries two keyword lines: the correction-comment format posts
    CONTEXT_RECEIPT near the top and READY_FOR_SANTIAGO later in the same
    body -- the second one is the comment's real, terminal state.

    Issue #137: a line inside a fenced code block (delimited by a line
    whose stripped form starts with "```") is never considered a candidate,
    even when it exactly matches a keyword. Every real occurrence of a
    keyword line in every documented comment format
    (docs/AGENT_WORKFLOW.md's own "Structured comment formats" section) is
    posted as plain top-level text, never fenced -- fencing is only ever
    used there to *illustrate* the format (e.g. quoting the NEEDS_ZANETA
    template verbatim as documentation/example text inside a comment). Not
    excluding fenced text let a comment that merely explains or quotes the
    protocol (rather than actually declaring a new state) flip this
    module's own computed status -- this closes that false-positive
    without touching the "last standalone matching line" rule real comments
    still rely on."""
    found = ""
    in_fence = False
    for line in body.splitlines():
        stripped = line.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if stripped in RECOGNIZED_KEYWORDS:
            found = stripped
    return found


def classify_comments(comments):
    """Turn a chronological list of raw comment dicts (each with `body` and
    optionally `user: {login}`) into the ordered list of `ProtocolEvent`s
    they carry. A comment identified by `STATUS_MARKER` (the retired
    "CURRENT STATUS" comment) is always skipped -- it must never be
    mistaken for a protocol event."""
    events = []
    for comment in comments:
        body = comment.get("body") or ""
        if body.lstrip().startswith(STATUS_MARKER):
            continue
        keyword = extract_keyword(body)
        if not keyword:
            continue
        author = (comment.get("user") or {}).get("login", "unknown")
        created_at = comment.get("created_at") or ""
        events.append(
            ProtocolEvent(author=author, keyword=keyword, body=body, created_at=created_at))
    return events


def classify_reviews(reviews):
    """Turn a list of raw PR review dicts (each with `body`, `user: {login}`,
    and `submitted_at`) into the `ProtocolEvent`s they carry -- the same
    standalone-keyword-line convention `classify_comments` already reads,
    applied to the PR review stream instead of the issue/PR comment stream.

    A genuine protocol review is posted via GitHub's separate PR review API
    (`pull_request_review_write` / `POST .../pulls/{n}/reviews`), not the
    issues/PR comments endpoint `classify_comments`/`fetch_comments` read
    (`GET .../issues/{n}/comments`) -- without this, such a review would be
    invisible to any caller (e.g. `count_pr_correction_rounds`) that needs to
    count it. `submitted_at` (a review's own timestamp field -- reviews have
    no `created_at`) is mapped onto `ProtocolEvent.created_at` so
    `merge_events_chronologically` can interleave review events with comment
    events by real chronological order. A review with no recognized keyword
    line (a plain APPROVE with no body, an ordinary inline-comment-only
    review) yields no event, same as a non-protocol comment."""
    events = []
    for review in reviews:
        body = review.get("body") or ""
        keyword = extract_keyword(body)
        if not keyword:
            continue
        author = (review.get("user") or {}).get("login", "unknown")
        created_at = review.get("submitted_at") or ""
        events.append(
            ProtocolEvent(author=author, keyword=keyword, body=body, created_at=created_at))
    return events


def merge_events_chronologically(*event_lists):
    """Merge any number of event lists into one combined list ordered by
    each event's own `created_at` timestamp, so a later state on one item
    always wins over an earlier one on its linked counterpart regardless of
    which list it came from -- replacing a naive "list A then list B"
    concatenation, which silently assumed the invoking item's events always
    postdate the linked item's (or vice versa). Events with an equal or
    missing timestamp keep their relative input order, since Python's sort
    is stable; every list passed in is already itself chronological
    (`fetch_comments` returns oldest-first), so this is a true chronological
    merge, not just a sort of arbitrarily-ordered input."""
    combined = [event for events in event_lists for event in events]
    combined.sort(key=lambda event: event.created_at)
    return combined


def count_correction_rounds(events):
    """How many `CHANGES_REQUESTED` (or `ZANETA_DECISION`) protocol events `events` (already
    classified/merged) contains -- the current correction-round number a
    Block is on. Factored out (Issue #137) so `scripts/claude_cloud_bridge.py`
    can compute the exact same round number its own persistent
    per-(PR, head SHA, round) dispatch-idempotency check needs, without
    duplicating this counting rule."""
    return sum(1 for event in events
               if event.keyword == "CHANGES_REQUESTED" or event.keyword in HUMAN_DECISION_KEYWORDS)


def count_pr_correction_rounds(comments, reviews):
    """`count_correction_rounds` computed directly from a PR's own raw
    `comments`/`reviews` collections (Issue #137) -- classifies both
    streams and interleaves them chronologically internally, so a caller
    like `scripts/claude_cloud_bridge.py`'s own per-tuple dispatch check
    never needs to import or call the chronological-ordering helper by
    name itself; it only ever needs the resulting round count."""
    events = merge_events_chronologically(classify_comments(comments), classify_reviews(reviews))
    return count_correction_rounds(events)


# ---------------------------------------------------------------------------
# gh-wiring functions -- pure logic above, `gh_runner` injected below so
# every one of these is exercisable offline with a fake runner.
# ---------------------------------------------------------------------------


def _real_gh_runner(argv):
    result = subprocess.run(argv, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise TaskStatusError(
            f"{' '.join(argv)} exited {result.returncode}: {result.stderr.strip()}")
    return result.stdout


def fetch_comments(item, *, gh_runner):
    """All comments on `item`, oldest first -- issue and PR "conversation"
    comments share the same REST collection (`/issues/{number}/comments`),
    regardless of `item.kind`."""
    raw = gh_runner([
        "gh", "api", f"repos/{item.repo}/issues/{item.number}/comments", "--paginate",
    ])
    return json.loads(raw or "[]")


def fetch_reviews(item, *, gh_runner):
    """Every review on `item`, oldest first -- a PR only. An Issue has no
    review stream of its own (GitHub's PR review API exists only for pull
    requests), so this returns `[]` immediately without spawning a `gh`
    call at all. REST (`repos/{repo}/pulls/{number}/reviews`), the same
    style every other fetch in this module already uses."""
    if item.kind != "pr":
        return []
    raw = gh_runner([
        "gh", "api", f"repos/{item.repo}/pulls/{item.number}/reviews", "--paginate",
    ])
    return json.loads(raw or "[]")


if __name__ == "__main__":
    print(
        "scripts/claude_task_status.py is a read-only library now, not a CLI "
        "entry point -- see its own module docstring and "
        "docs/HARNESS_GOLDEN_PATH.md.",
        file=sys.stderr,
    )
    sys.exit(1)
