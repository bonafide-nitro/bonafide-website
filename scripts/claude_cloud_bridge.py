#!/usr/bin/env python3
"""
Claude cloud Routine bridge -- fires a pre-configured Claude Code Routine's
HTTP API endpoint so a GitHub work item can start a Claude cloud session
with **no dependency on Žaneta's Mac being awake or online**, superseding
the Mac-local direction of Issue #104.

Block 1C (Issue #105) originally split this into two paths: a native
GitHub-event Routine trigger for a Block's PR, and this script as a
separately-invoked API caller for a fresh Block's Issue. Santiago's
CHANGES_REQUESTED review on PR #107 found that split insufficient for an
always-on, safely-idempotent bridge and requested one unified,
repository-controlled path instead: this script, invoked by exactly one
GitHub Actions workflow (`.github/workflows/claude-cloud-routine-bridge.yml`)
on `issues: labeled`/`pull_request: labeled` events. There is no longer a
native Routine GitHub-event trigger configured for this protocol at all --
every fire, for an Issue or a PR, goes through this one path.

## At-most-once delivery: claim before firing, not after

The exact label `READY_FOR_CLAUDE_CLOUD` is both the trigger filter (the
workflow only runs when this exact label is the one just added) and the
idempotency guard -- but *when* the label is removed matters. Anthropic's
Routines `/fire` endpoint has no idempotency key: every successful POST
creates a new session, full stop. A design that fires first and only
removes the label after a confirmed 2xx (this module's prior shape) leaves
an ambiguous-outcome window: if the POST succeeds but the process then
crashes, loses the response, or `remove_label` itself fails, the label is
still present, and a later rerun or duplicate delivery can fire a *second*
session for work a first session already started. Santiago's review named
this precisely and required the opposite ordering.

This module now **claims the item before firing**: `check_label_present`
still confirms the label is present, but `remove_label` runs immediately
after that check and *before* the `/fire` POST -- so the durable "has this
already been dispatched" fact (the label's absence) is established before
any network call that could fail, hang, or outlive the process. This is a
deliberate at-most-once guarantee, not at-least-once: an ambiguous outcome
(the POST fails, or the process dies before learning the result) leaves the
label removed and no automatic re-fire -- the item is no longer visibly
queued, and requires an explicit human/Santiago/authorized-controller
re-queue (re-applying the label) rather than being silently retried. This
trades "a rare crash mid-fire requires a human to notice and re-queue" for
"no code path can ever create two sessions for one queued item," which is
the tradeoff Žaneta's own requirement (an unattended, subscription-
consuming autonomous run) calls for.

The workflow additionally serializes same-item runs with a per-item
`concurrency` group, so two deliveries of the same label-add event can
never even evaluate the label check concurrently -- see the workflow's own
comments for why `cancel-in-progress: false` (queue, never cancel) is the
correct setting here.

`is_actionable(None)`-style "no marker means still allowed" logic is gone
entirely: `fire_once` only ever proceeds past the label check when the
label is actually present, so a caller can never fire an item that was
never explicitly queued.

## What this module does

Given one exact GitHub work item (a repo + issue/PR number):

  1. Checks whether `READY_FOR_CLAUDE_CLOUD` is currently on the item
     (`check_label_present`, read-only `gh issue/pr view --json labels`).
     If it is not, there is nothing to do -- either it was never queued, or
     a concurrent/earlier run already dispatched and removed it.
  1a. For a PR item only (Issue #137): before claiming anything, checks
     whether the *exact* `(repo, PR number, current head SHA, correction
     round)` tuple this label application would dispatch already has a
     dispatch claimed or completed on the PR -- see "Per-tuple dispatch
     idempotency" and "Persisting the claim before firing" below. If so,
     this is a duplicate requeue for work already dispatched (or already in
     flight): the label is cleared (it is no longer an accurate "still
     queued" signal) and no fire is attempted.
  1b. For a PR item that is not a duplicate: after claiming the label but
     before the `/fire` POST, posts one durable `ROUTINE_DISPATCH_CLAIMED`
     comment naming the exact tuple (correction round 1) -- see
     "Persisting the claim before firing" below.
  2. Builds one small `text` payload naming the exact repo, item kind,
     number, and URL (`build_fire_payload`) -- never a full instruction
     set. Per Anthropic's docs, the Routine's own **saved prompt**
     (configured once, by a human, in Claude Code web -- see
     `docs/AGENT_WORKFLOW.md` for the exact one-time checklist) is what
     tells the fired session to load `CLAUDE.md`, `AGENTS.md`,
     `docs/AGENT_WORKFLOW.md`, then act on the
     work item named in the fire payload, preserving the same
     `CONTEXT_RECEIPT`/`READY_FOR_SANTIAGO`/`NEEDS_ZANETA`/STOP discipline
     every other Block already follows.
  3. Removes the `READY_FOR_CLAUDE_CLOUD` label (`remove_label`) -- this is
     the claim, made *before* any network call to Anthropic, and is what
     makes delivery at-most-once (see above).
  4. Makes exactly one POST to the Routine's `/fire` endpoint (the full URL
     supplied via `CLAUDE_ROUTINE_FIRE_URL`, never templated from a
     separate id) with the per-routine bearer token in an `Authorization:
     Bearer` header and the documented `anthropic-beta`/`anthropic-version`
     headers. No automatic retry of any kind, at any layer -- one call, one
     outcome.
  5. On a confirmed 2xx: posts a durable `ROUTINE_DISPATCHED` comment
     naming the returned session id/url (see `docs/AGENT_WORKFLOW.md` for
     the exact format). A later correction round now requires a human or
     Santiago to explicitly re-apply the label -- an accidental retry can
     no longer fire it again. For a PR, this comment also carries the
     `(round, head SHA)` dispatch marker step 1a checks for.
  6. On failure (a non-2xx response, or a transport-level error such as a
     DNS/connection failure): the label is already gone (claimed in step
     3) and is never automatically restored -- re-adding it would itself
     re-trigger this same workflow. A sanitized `ROUTINE_FIRE_FAILED`
     comment is posted instead, stating the item is no longer queued and
     needs an explicit re-queue, with the HTTP status and Anthropic's own
     error body -- never the request we sent, so the bearer token can
     never appear in it.

## Per-tuple dispatch idempotency (Issue #137)

PR #131 exposed a real gap in the at-most-once design above: it makes *one
label application* dispatch at most once, but it does not stop *two
separate, legitimate `labeled` events* -- e.g. the authorized Santiago
controller accidentally re-applying `READY_FOR_CLAUDE_CLOUD` twice for the
same correction round -- from each independently seeing the label present
and each firing its own session. `docs/AGENT_WORKFLOW.md`'s own "Who
re-applies READY_FOR_CLAUDE_CLOUD after CHANGES_REQUESTED" section already
asks that external controller to check for an existing `ROUTINE_DISPATCHED`
comment for the round before re-labeling -- but that controller is not code
in this repository, so this module now also enforces the same guarantee
itself, as the last line of defense that does not depend on the caller
getting it right.

`fire_once` now identifies a PR dispatch by the exact tuple `(repo, PR
number, current head SHA, correction round)` -- never just "the label is
present." Before claiming the label or firing, it re-derives this tuple
read-only, the same way `scripts/claude_task_status.py` already does for
its own status computation (`count_pr_correction_rounds`, which itself
composes `classify_comments`/`classify_reviews`/`count_correction_rounds`,
reused here rather than duplicated), fetches the PR's current
`headRefOid`, and scans the PR's existing comments for a prior
`ROUTINE_DISPATCHED` comment already carrying that exact `(round, head
SHA)` marker
(`find_existing_pr_dispatch`). If one is found, this is a duplicate
requeue for a dispatch that already happened: the label is removed (it no
longer accurately means "still queued") and `fire_once` returns
`"skipped_already_dispatched"` without ever calling `transport`. A
genuinely new correction round (a fresh `CHANGES_REQUESTED`) or a genuinely
new head SHA (a fresh commit) produces a different tuple and therefore a
different marker, so it can still dispatch exactly once -- this is what
keeps `docs/AGENT_WORKFLOW.md`'s own bounded correction loop working while
closing the duplicate-fire gap.

This check is scoped to PR items only: the tuple this Issue's own
acceptance criteria name (a "correction round" and a "head SHA") is a PR
concept -- an Issue has neither, and an Issue is only ever dispatched once
per Block (before any PR exists), so the existing label-claim-before-fire
protection (steps 1-6 above) remains this module's only, unchanged
protection for Issue items.

True concurrent execution (two Actions runs of this workflow for the same
item executing at literally the same instant) is a property of
`.github/workflows/claude-cloud-routine-bridge.yml`'s own per-item
`concurrency` group (`cancel-in-progress: false`), not of this module's own
logic -- see that workflow's comments and
`tests/isolation/test_claude_cloud_routine_bridge_workflow.py` for that
half of the guarantee. This module's own per-tuple check is what makes
*repeated, sequential* invocations (the PR #131 defect: a second `labeled`
event delivered after the first run had already completed) safe too, which
the per-item concurrency group alone does not cover.

## Persisting the claim before firing, not just after (correction round 1)

Santiago's review of this Block's first commit found the per-tuple check
above still had one reliability gap: the only durable record of a PR
dispatch was the *final* `ROUTINE_DISPATCHED` comment, posted only after a
confirmed 2xx. If the `/fire` POST itself succeeds but the process then
crashes, loses the response, or the subsequent `post_comment` call itself
fails, no record of that successful dispatch exists at all -- a later
explicit or accidental re-label of the same `(PR, head SHA, round)` tuple
would see no matching `ROUTINE_DISPATCHED` comment and fire a *second*
session for work already started, exactly the failure mode the per-tuple
check exists to prevent.

`fire_once` now posts one `ROUTINE_DISPATCH_CLAIMED` comment
(`build_claim_comment`), carrying the same `dispatch_marker` line, for a PR
item immediately after claiming the label and **before** the `/fire` POST
is ever attempted. This is the durable pre-fire record: even when the fire
succeeds but the final `ROUTINE_DISPATCHED` comment write then fails,
`ROUTINE_DISPATCH_CLAIMED` already exists on the PR by the time any later
invocation could re-check it.

`find_existing_pr_dispatch` now recognizes three bridge comment kinds
against `marker_line`, scanned oldest to newest via
`claude_task_status.classify_comments` (unchanged fenced-code-block-aware
keyword extraction, now also recognizing `ROUTINE_DISPATCH_CLAIMED` --
`claude_task_status.BRIDGE_KEYWORDS` gained this one new member so
`classify_comments` can find it as a genuine event at all):

* `ROUTINE_DISPATCHED` -- the fire definitely succeeded. Always blocks a
  re-fire for this exact tuple.
* `ROUTINE_DISPATCH_CLAIMED` -- the pre-fire claim. Blocks by default,
  since the fire may already have happened (or be in flight) even with no
  final comment ever landing -- this is exactly the gap this round closes.
* `ROUTINE_FIRE_FAILED` -- a confirmed failure of the attempt the
  preceding claim was for. This is the one event that *un-blocks* an
  outstanding claim: the fire is now confirmed to have never succeeded, so
  a later explicit re-label (the only way this check runs again -- nothing
  here retries automatically) is a legitimate retry, not a duplicate.

This preserves the existing fail-closed/manual-retry contract exactly:
a fire that never got a chance to prove success or failure (an outstanding
claim, no failure comment yet) still blocks an automatic-looking retry; a
fire the bridge itself confirmed failed remains explicitly retryable the
same way it always has (a human/Santiago/authorized controller re-applying
the label). `build_failure_comment`'s own signature is unchanged -- it
still never receives request headers or any new parameter -- `fire_once`
appends `dispatch_marker` to the failure body itself, only for a PR item,
the same way it already appends it to the success body via
`build_dispatched_comment`'s existing `dispatch_marker` parameter.

A fire that succeeds but whose *own* final `ROUTINE_DISPATCHED` comment
write then fails is reported as `FireOutcome.action ==
"fired_comment_failed"` (a new, distinct outcome, non-zero exit from
`main()`) rather than letting that write's exception propagate uncaught --
the Routine session was genuinely started, so this is not a
`fire_failed`, but a human should still notice that the PR's own comment
thread does not show it. The pre-fire `ROUTINE_DISPATCH_CLAIMED` comment is
what keeps a later re-label safe regardless of whether this exact outcome
is ever noticed.

## What this module never does

* It never reads, stores, hardcodes, or logs the routine's bearer token
  anywhere except as the one `Authorization` header value built at this
  module's single real-wiring site (`main()`); the token is read from
  `CLAUDE_ROUTINE_FIRE_TOKEN` only there. This token is neither
  `CLAUDE_CODE_OAUTH_TOKEN` nor `ANTHROPIC_API_KEY` (this module never
  reads either) -- it is a per-routine token scoped only to firing one
  routine, generated and stored as a separate, later, human
  `ZANETA_DECISION`-gated setup step, never by this module.
* It never creates, enables, or configures a Routine, a trigger, or a
  token -- that is exclusively a one-time human action in Claude Code web
  (see the activation checklist in `docs/AGENT_WORKFLOW.md`).
* It never creates the `READY_FOR_CLAUDE_CLOUD` label on an item -- only a
  human, or separately-authorized client-specific incident-detection code
  (explicitly out of this Block's scope), applies it. This module only
  ever *removes* it, as the claim step before firing -- it never re-adds
  it, on success or failure alike, since re-adding it would itself
  re-trigger the workflow.
* It never merges, deploys, publishes, sends, spends, or dispatches any
  other workflow -- the only GitHub writes it ever performs are removing
  one label and posting one comment on the exact item it was invoked for.

`gh_runner` and `transport` (an `HttpTransport`, mirroring
`social_analyst/net/http.py`'s shape) are both injected, keyword-only
parameters on every function that needs them, exactly like
`scripts/claude_local_bridge.py`'s `gh_runner`/`claude_runner` pattern --
`main()` is the only place a real subprocess or a real network call is
constructed, so every other function here is exercisable offline with no
real process spawned and no real network call made.
"""

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, field

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

#: Reused, not duplicated, for the per-tuple dispatch check below: comment/
#: review classification, chronological event ordering, and
#: correction-round counting are exactly the same rules
#: claude_task_status.py's own status computation already relies on. Both
#: scripts' own `WorkItem` dataclasses are structurally interchangeable
#: here -- every claude_task_status function this module calls only ever
#: reads `.repo`/`.number`/`.kind`, all three of which this module's own
#: WorkItem (defined below) also has.
import claude_task_status  # noqa: E402

#: The one explicit marker this bridge ever considers -- both the workflow's
#: own trigger filter and, via check_label_present/remove_label, the
#: idempotency guard described above.
QUEUE_LABEL = "READY_FOR_CLAUDE_CLOUD"

#: Anthropic's documented Routines `/fire` endpoint headers
#: (code.claude.com/docs/en/routines, "Trigger a routine" section). The URL
#: itself is not templated here -- it is supplied whole via
#: CLAUDE_ROUTINE_FIRE_URL, since Claude Code web hands it out as one
#: opaque, per-routine value alongside the token.
ANTHROPIC_BETA_HEADER = "experimental-cc-routine-2026-04-01"
ANTHROPIC_VERSION_HEADER = "2023-06-01"

#: Where the routine's fire URL and bearer token are read from. Neither is
#: ever hardcoded; both are read only inside main()'s real-wiring block,
#: never inside any of this module's pure/testable functions, and neither
#: is ever accepted as a CLI flag (a flag value is visible in the process
#: list; an environment variable, backed by a GitHub Actions secret, is
#: not).
ROUTINE_FIRE_URL_ENV_VAR = "CLAUDE_ROUTINE_FIRE_URL"
ROUTINE_TOKEN_ENV_VAR = "CLAUDE_ROUTINE_FIRE_TOKEN"


class CloudBridgeError(RuntimeError):
    """A cloud bridge operation could not be completed safely."""


@dataclass(frozen=True)
class WorkItem:
    """One exact GitHub issue or PR to fire the Routine for."""

    kind: str  # "issue" or "pr"
    number: int
    repo: str  # "owner/repo"

    def __post_init__(self):
        if self.kind not in ("issue", "pr"):
            raise CloudBridgeError(f"unknown work item kind {self.kind!r}")

    @property
    def label(self):
        return "Issue" if self.kind == "issue" else "Pull Request"

    @property
    def url(self):
        path = "issues" if self.kind == "issue" else "pull"
        return f"https://github.com/{self.repo}/{path}/{self.number}"

    @property
    def gh_subcommand(self):
        return "issue" if self.kind == "issue" else "pr"


def check_label_present(item, *, gh_runner):
    """Whether `QUEUE_LABEL` is currently on `item`, read-only via `gh
    issue/pr view --json labels`. This -- not any comment -- is the
    idempotency guard: see this module's own docstring."""
    raw = gh_runner([
        "gh", item.gh_subcommand, "view", str(item.number), "--repo", item.repo,
        "--json", "labels",
    ])
    payload = json.loads(raw or "{}")
    names = {label.get("name", "") for label in payload.get("labels", ())}
    return QUEUE_LABEL in names


def remove_label(item, *, gh_runner):
    """Remove `QUEUE_LABEL` from `item`. Called only after a confirmed 2xx
    fire -- this is what makes the label the durable dispatch marker."""
    gh_runner([
        "gh", item.gh_subcommand, "edit", str(item.number), "--repo", item.repo,
        "--remove-label", QUEUE_LABEL,
    ])


def post_comment(item, body, *, gh_runner):
    """Post one comment on `item` via `gh issue/pr comment`. `gh_runner`
    receives the body as one argv element -- never shell-interpolated, so
    no escaping concern regardless of body content."""
    gh_runner([
        "gh", item.gh_subcommand, "comment", str(item.number), "--repo", item.repo,
        "--body", body,
    ])


def build_dispatched_comment(item, fire_response_json, *, dispatch_marker=None):
    """The durable `ROUTINE_DISPATCHED` comment body posted after a
    confirmed 2xx -- see docs/AGENT_WORKFLOW.md for the format this
    matches. `dispatch_marker` (Issue #137), when given, is one extra
    `- dispatch round: <round> @ <head SHA>` line naming the exact
    `(round, head SHA)` this dispatch was for -- the durable claim
    `find_existing_pr_dispatch` later scans for to keep a PR's dispatch
    idempotent per that exact tuple. `None` (the default, and always the
    case for an Issue item) leaves the comment format exactly as it was
    before this Issue -- no behavior change for Issue dispatches."""
    session_id = fire_response_json.get("claude_code_session_id", "unknown")
    session_url = fire_response_json.get("claude_code_session_url", "unknown")
    body = (
        "ROUTINE_DISPATCHED\n\n"
        f"- repo: {item.repo}\n"
        f"- item: {item.label} #{item.number}\n"
        f"- session id: {session_id}\n"
        f"- session url: {session_url}\n"
    )
    if dispatch_marker:
        body += f"{dispatch_marker}\n"
    return body


def dispatch_marker_line(round_count, head_sha):
    """The exact `- dispatch round: <round> @ <head SHA>` marker line this
    module writes into a PR's `ROUTINE_DISPATCHED` comment and later scans
    for (Issue #137) -- one string builder shared by both directions so the
    write and the read can never drift apart."""
    return f"- dispatch round: {round_count} @ {head_sha}"


def build_claim_comment(item, dispatch_marker):
    """The durable pre-fire claim comment (correction round 1) posted for a
    PR item immediately before the `/fire` POST -- see this module's own
    "Persisting the claim before firing, not just after" docstring
    section. Carries the exact same `dispatch_marker` line the final
    `ROUTINE_DISPATCHED` comment carries, so `find_existing_pr_dispatch`
    recognizes this exact `(round, head SHA)` tuple as already claimed even
    when the fire itself succeeds but the *final* `ROUTINE_DISPATCHED`
    comment write then fails -- the gap Santiago's review found in this
    Block's first commit."""
    return (
        "ROUTINE_DISPATCH_CLAIMED\n\n"
        f"- repo: {item.repo}\n"
        f"- item: {item.label} #{item.number}\n"
        f"{dispatch_marker}\n"
    )


def find_existing_pr_dispatch(comments, marker_line):
    """Whether the exact `(round, head SHA)` tuple `marker_line` names is
    already dispatched, or has an unresolved pre-fire claim, among the
    genuine bridge events in `comments` (already chronological -- see
    `claude_task_status.fetch_comments`). Uses
    `claude_task_status.classify_comments` (the same hardened,
    fenced-code-block-aware keyword extraction that module's own status
    computation relies on -- `BRIDGE_KEYWORDS` there now also recognizes
    `ROUTINE_DISPATCH_CLAIMED`) rather than a raw substring search, so a
    comment that merely quotes or discusses a past dispatch can never be
    mistaken for a real one.

    Three bridge comment kinds can carry `marker_line`:

    * `ROUTINE_DISPATCHED` -- the fire definitely succeeded. Always
      blocks.
    * `ROUTINE_DISPATCH_CLAIMED` -- the durable pre-fire claim this module
      posts immediately before the `/fire` POST (correction round 1).
      Blocks by default: by the time this claim exists the fire may
      already have happened even if no final comment ever landed.
    * `ROUTINE_FIRE_FAILED` -- a confirmed failure of the attempt the
      preceding claim was for. This is the one event that un-blocks an
      outstanding claim, since the fire is now confirmed to have never
      succeeded -- a later explicit re-label is a legitimate retry, not a
      duplicate.

    Scanning oldest to newest and tracking whether the marker's claim is
    currently outstanding implements exactly that: a confirmed failure
    clears the outstanding claim; a later confirmed dispatch (or a new,
    still-unresolved claim) sets it again."""
    claimed = False
    for event in claude_task_status.classify_comments(comments):
        if marker_line not in event.body:
            continue
        if event.keyword == "ROUTINE_DISPATCHED":
            return True
        if event.keyword == "ROUTINE_DISPATCH_CLAIMED":
            claimed = True
        elif event.keyword == "ROUTINE_FIRE_FAILED":
            claimed = False
    return claimed


def compute_pr_round_and_head(item, *, gh_runner):
    """`(round_count, head_sha, comments)` for a PR work item -- the exact
    `(current head SHA, correction round)` half of Issue #137's own
    dispatch-identity tuple, plus the already-fetched comment list so the
    caller need not re-fetch it. Read-only: two `gh api` calls (comments,
    reviews) plus one `gh pr view` call, reusing
    `claude_task_status.fetch_comments`/`fetch_reviews` and this module's
    own `fetch_pr_head_sha` rather than duplicating any of their logic."""
    comments = claude_task_status.fetch_comments(item, gh_runner=gh_runner)
    reviews = claude_task_status.fetch_reviews(item, gh_runner=gh_runner)
    round_count = claude_task_status.count_pr_correction_rounds(comments, reviews)
    head_sha = fetch_pr_head_sha(item, gh_runner=gh_runner)
    return round_count, head_sha, comments


def fetch_pr_head_sha(item, *, gh_runner):
    """A PR's current `headRefOid` -- exact-commit anchoring, the same
    convention every other comment format in this protocol already uses.
    Issue #137 only; never called for an Issue item (which has no head
    SHA)."""
    raw = gh_runner([
        "gh", "pr", "view", str(item.number), "--repo", item.repo,
        "--json", "headRefOid",
    ])
    payload = json.loads(raw or "{}")
    return payload.get("headRefOid", "")


def build_failure_comment(item, status, error_detail):
    """The sanitized `ROUTINE_FIRE_FAILED` comment body posted on any
    failure (non-2xx response or a transport-level error). `error_detail`
    is Anthropic's own error response body (or a transport error message
    naming only the method/URL) -- the request we sent, and so the bearer
    token, never appears here.

    By the time this is called, `fire_once` has already removed
    `QUEUE_LABEL` (the claim happens before the POST -- see this module's
    own docstring for the at-most-once reasoning), so the item is already
    no longer visibly queued; this comment says so explicitly rather than
    claiming the label is "left in place," and the label is never
    automatically restored -- re-adding it would itself re-trigger this
    workflow."""
    return (
        "ROUTINE_FIRE_FAILED\n\n"
        f"- repo: {item.repo}\n"
        f"- item: {item.label} #{item.number}\n"
        f"- http status: {status if status is not None else 'no response (transport error)'}\n"
        f"- error: {error_detail}\n"
        f"- the {QUEUE_LABEL} label was already removed as the dispatch claim before this "
        "attempt and was not automatically restored; no automatic retry was made. This item "
        "is no longer queued -- a human, Santiago, or an authorized incident controller must "
        "explicitly re-queue it by re-applying the label.\n"
    )


def build_fire_payload(item):
    """The `text` field sent to the Routine's `/fire` endpoint: names the
    exact item and nothing else. Per Anthropic's docs this arrives at the
    fired session wrapped in a `<routine-fire-payload>` block and labeled
    untrusted data unless the Routine's own saved prompt opts in to reading
    it -- so this is deliberately just an unambiguous locator, not an
    instruction."""
    return {
        "text": f"{item.repo} {item.label} #{item.number} ({item.url})",
    }


@dataclass(frozen=True)
class HttpRequest:
    method: str
    url: str
    headers: dict = field(default_factory=dict)
    body: bytes = None


@dataclass(frozen=True)
class HttpResponse:
    status: int
    headers: dict
    body: bytes

    @property
    def ok(self):
        return 200 <= self.status < 300

    def json(self):
        if not self.body:
            return {}
        return json.loads(self.body.decode("utf-8"))


class HttpTransport:
    """The interface `fire_once` depends on -- a plain base class, not
    `abc.ABC`, so a test fake need not inherit from it. Mirrors
    `social_analyst/net/http.py`'s own `HttpTransport` shape."""

    def request(self, http_request):
        raise NotImplementedError


def build_fire_request(routine_fire_url, token, payload):
    """The exact, bounded HTTP request for firing one routine -- pure and
    offline-testable; makes no network call itself."""
    body = json.dumps(payload).encode("utf-8")
    return HttpRequest(
        method="POST",
        url=routine_fire_url,
        headers={
            "Authorization": f"Bearer {token}",
            "anthropic-beta": ANTHROPIC_BETA_HEADER,
            "anthropic-version": ANTHROPIC_VERSION_HEADER,
            "Content-Type": "application/json",
        },
        body=body,
    )


@dataclass(frozen=True)
class FireOutcome:
    """What happened for one work item during one `fire_once` call."""

    item: WorkItem
    # "fired", "fire_failed", "skipped_label_absent",
    # "skipped_already_dispatched" (PR only, Issue #137), "dry_run",
    # "dry_run_skip_already_dispatched" (PR only, Issue #137),
    # "fired_comment_failed" (PR only, correction round 1: the fire itself
    # succeeded but posting the final ROUTINE_DISPATCHED comment failed --
    # see this module's own "Persisting the claim before firing" docstring
    # section)
    action: str
    detail: str = ""


def fire_once(item, routine_fire_url, token, *, gh_runner, transport, dry_run=False):
    """Check `item`'s current label state, claim it (remove the label),
    then make exactly one `/fire` attempt -- no retry at any layer.
    Returns one `FireOutcome`.

    The claim (`remove_label`) happens *before* the network call, not
    after a confirmed success -- this is the at-most-once delivery
    guarantee: see this module's own docstring for why firing first and
    claiming after leaves an ambiguous-outcome window that this ordering
    closes. A failure after the claim never re-adds the label
    automatically; the item is left visibly unqueued, requiring an
    explicit human re-queue.

    For a PR item, before claiming anything, this also checks whether the
    exact `(repo, PR number, current head SHA, correction round)` tuple
    (Issue #137) already has a dispatch claimed or completed on the PR --
    see this module's own "Per-tuple dispatch idempotency" and
    "Persisting the claim before firing, not just after" docstring
    sections. If so, this is a duplicate requeue: the label is removed
    (real run only) and no `/fire` attempt is made at all, regardless of
    the label's presence. This check never runs for an Issue item (no head
    SHA/correction-round concept applies there).

    For a PR item that is not a duplicate, `fire_once` posts one durable
    `ROUTINE_DISPATCH_CLAIMED` comment naming the exact tuple immediately
    after claiming the label and *before* the `/fire` POST -- this is what
    keeps a later re-label safe even if the fire succeeds but the final
    `ROUTINE_DISPATCHED` comment write itself then fails (see this
    module's own "Persisting the claim before firing" docstring section).

    `dry_run=True` performs the same read-only label and (for a PR)
    duplicate-dispatch checks as a real run but never claims (never calls
    `remove_label`), never posts the pre-fire claim, never calls
    `transport`, and never writes to GitHub at all -- nothing it does is
    observable outside this process.
    """
    if not check_label_present(item, gh_runner=gh_runner):
        return FireOutcome(
            item, "skipped_label_absent",
            f"{QUEUE_LABEL} is not currently on this item; nothing to dispatch")

    dispatch_marker = None
    if item.kind == "pr":
        round_count, head_sha, comments = compute_pr_round_and_head(item, gh_runner=gh_runner)
        dispatch_marker = dispatch_marker_line(round_count, head_sha)
        if find_existing_pr_dispatch(comments, dispatch_marker):
            detail = (
                f"a ROUTINE_DISPATCHED comment already exists for correction round "
                f"{round_count} @ head {head_sha}; not firing another Routine session for "
                f"this exact (repo, PR, head SHA, round) tuple"
            )
            if dry_run:
                return FireOutcome(item, "dry_run_skip_already_dispatched", detail)
            remove_label(item, gh_runner=gh_runner)
            return FireOutcome(item, "skipped_already_dispatched", detail)

    payload = build_fire_payload(item)

    if dry_run:
        request = build_fire_request(routine_fire_url, "REDACTED", payload)
        return FireOutcome(
            item, "dry_run", f"would claim (remove {QUEUE_LABEL}) and POST to {request.url} "
                              f"with text={payload['text']!r}")

    # Claim before firing: the label's removal, not the /fire response, is
    # the durable "already dispatched" fact from this point on.
    remove_label(item, gh_runner=gh_runner)

    # Correction round 1: for a PR, also persist a durable per-tuple claim
    # comment before the /fire call itself -- not only after a confirmed
    # success. See "Persisting the claim before firing, not just after"
    # above for why the label alone is not enough to close this gap.
    if item.kind == "pr":
        post_comment(item, build_claim_comment(item, dispatch_marker), gh_runner=gh_runner)

    request = build_fire_request(routine_fire_url, token, payload)
    try:
        response = transport.request(request)
    except CloudBridgeError as exc:
        failure_body = build_failure_comment(item, None, str(exc))
        if dispatch_marker:
            failure_body += f"{dispatch_marker}\n"
        post_comment(item, failure_body, gh_runner=gh_runner)
        return FireOutcome(item, "fire_failed", f"transport error: {exc}")

    if not response.ok:
        failure_body = build_failure_comment(item, response.status, response.json())
        if dispatch_marker:
            failure_body += f"{dispatch_marker}\n"
        post_comment(item, failure_body, gh_runner=gh_runner)
        return FireOutcome(item, "fire_failed", f"HTTP {response.status}: {response.json()}")

    fire_json = response.json()
    try:
        post_comment(
            item, build_dispatched_comment(item, fire_json, dispatch_marker=dispatch_marker),
            gh_runner=gh_runner)
    except CloudBridgeError as exc:
        # The fire itself succeeded -- this is not a fire_failed outcome --
        # but the final durable comment could not be written. The pre-fire
        # ROUTINE_DISPATCH_CLAIMED comment (posted above, before the /fire
        # call) is what keeps a later re-label of this exact tuple safe
        # regardless of whether a human notices this outcome.
        return FireOutcome(
            item, "fired_comment_failed",
            f"fire succeeded ({fire_json}) but posting the ROUTINE_DISPATCHED comment failed: "
            f"{exc}")
    return FireOutcome(item, "fired", str(fire_json))


# ---------------------------------------------------------------------------
# Real (non-test) process/network wiring -- the only place this module
# spawns a real subprocess or makes a real network call. Every function
# above takes its collaborator as a parameter precisely so nothing above
# this line ever needs to.
# ---------------------------------------------------------------------------

#: Same identifying-User-Agent reasoning as social_analyst/net/http.py:
#: urllib's default UA is a well-known generic-scraper signature some
#: shared edges reject outright.
DEFAULT_USER_AGENT = (
    "TrafficDom-ClaudeCloudBridge/1.0 "
    "(+https://github.com/zanetaseiler/trafficdom-growth-engine)"
)


class UrllibHttpTransport(HttpTransport):
    """The only transport that actually reaches the network. Exactly one
    `urlopen` call per `request()` -- no retry loop anywhere in this
    class."""

    def __init__(self, timeout_seconds=30, user_agent=DEFAULT_USER_AGENT):
        self._timeout_seconds = timeout_seconds
        self._user_agent = user_agent

    def request(self, http_request):
        headers = dict(http_request.headers)
        headers.setdefault("User-Agent", self._user_agent)
        req = urllib.request.Request(
            http_request.url, data=http_request.body, headers=headers,
            method=http_request.method,
        )
        try:
            with urllib.request.urlopen(req, timeout=self._timeout_seconds) as resp:
                return HttpResponse(
                    status=resp.status, headers=dict(resp.headers.items()), body=resp.read())
        except urllib.error.HTTPError as exc:
            return HttpResponse(
                status=exc.code,
                headers=dict(exc.headers.items()) if exc.headers else {},
                body=exc.read() or b"",
            )
        except urllib.error.URLError as exc:
            raise CloudBridgeError(f"{http_request.method} {http_request.url}: {exc}") from exc


def _real_gh_runner(argv):
    result = subprocess.run(argv, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise CloudBridgeError(
            f"{' '.join(argv)} exited {result.returncode}: {result.stderr.strip()}")
    return result.stdout


def parse_args(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, help="owner/repo the work item lives in")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--issue", type=int, help="issue number to fire the routine for")
    group.add_argument("--pr", type=int, help="pull request number to fire the routine for")
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Check the label and print what would be sent; never fire, never write to GitHub.")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv if argv is not None else sys.argv[1:])

    item = WorkItem(
        kind="issue" if args.issue is not None else "pr",
        number=args.issue if args.issue is not None else args.pr,
        repo=args.repo,
    )

    routine_fire_url = os.environ.get(ROUTINE_FIRE_URL_ENV_VAR)
    if not routine_fire_url:
        print(f"error: {ROUTINE_FIRE_URL_ENV_VAR} is not set", file=sys.stderr)
        return 1

    token = None
    if not args.dry_run:
        token = os.environ.get(ROUTINE_TOKEN_ENV_VAR)
        if not token:
            print(f"error: {ROUTINE_TOKEN_ENV_VAR} is not set", file=sys.stderr)
            return 1

    outcome = fire_once(
        item, routine_fire_url, token, gh_runner=_real_gh_runner,
        transport=UrllibHttpTransport(), dry_run=args.dry_run,
    )
    print(f"{outcome.item.repo} {outcome.item.label} #{outcome.item.number}: "
          f"{outcome.action} -- {outcome.detail}")
    return 0 if outcome.action in ("fired", "dry_run", "dry_run_skip_already_dispatched") else 1


if __name__ == "__main__":
    sys.exit(main())
