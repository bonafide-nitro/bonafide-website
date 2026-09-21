#!/usr/bin/env python3
"""
Periodic, idempotent, repo-wide label reconciler -- the eventual-consistency
fallback half of Issue #171's "Close/merge hygiene" port from the proven
Zoe harness golden path (see docs/HARNESS_GOLDEN_PATH.md). Fired by
`.github/workflows/harness-label-reconciler.yml` on a `schedule` (and
available on `workflow_dispatch` for an on-demand run) -- a `closed` webhook
`.github/scripts/harness_label_close_cleanup.py` ever missed (a delivery
outage, a manual close via the API, a label applied after close) would
otherwise leave a transient/retired label behind indefinitely; this sweep
is the fallback that eventually clears it anyway.

Removal-only, exactly like the event-driven cleanup script, and sharing the
same vocabulary (`.github/scripts/harness_labels.py`): every closed Issue
and PR in the repository is scanned, and only a transient
(`READY_FOR_CLAUDE_CLOUD`, `READY_FOR_SANTIAGO`) or retired/forbidden label
already present on an already-closed item is ever removed. Never adds a
label, comments, reopens an item, requeues Claude, or wakes Codex; never
touches `VERIFIED`, `COMPLETED`, or any ordinary product/client/non-harness
label; never reads or writes anything on an open item at all (both list
calls below are already scoped to `--state closed`).

Idempotent: a repository with nothing left to clean performs zero `gh`
write calls -- the common case on every run after the first.

Defense in depth, matching the event-driven cleanup's own re-check: `sweep`
re-fetches an item's live state immediately before removing labels from it,
skipping the write (and not reporting a change) for anything found reopened
between the closed-item snapshot and this write.

Both list fetches below use `gh api --paginate` against GitHub's REST list
endpoints directly, rather than `gh issue list`/`gh pr list`'s own CLI-level
`--limit` -- a fixed `--limit` permanently caps the sweep at that many
items, so a repository that ever accumulates more closed items than the cap
would silently stop covering the rest of them (codex review,
discussion_r4005216715); `--paginate` instead walks every REST page GitHub
actually has. Past the first page, `gh api --paginate` writes each page as
its own separate top-level JSON document back-to-back on stdout rather than
merging them into a single array itself, so a naive `json.loads` on the raw
output raises `JSONDecodeError: Extra data` the moment a repository has more
than one page of closed items (codex review, discussion_r4005569175);
`_load_paginated_json` below decodes every concatenated top-level JSON value
in the raw output and flattens any list-valued ones into a single combined
list, so both fetches below cover an arbitrary number of pages correctly.
"""

import argparse
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import harness_labels  # noqa: E402

#: GitHub's own REST maximum items per page -- bounds one HTTP request's own
#: page size, never the total number of closed items `--paginate` will walk
#: across to cover the whole repository.
API_PAGE_SIZE = 100


class ReconcilerError(RuntimeError):
    """A reconciler sweep could not be completed safely."""


def _load_paginated_json(raw):
    """Decode `gh api --paginate`'s raw stdout into one flat list.

    Past the first page, `gh` writes each page as its own separate
    top-level JSON document back-to-back (no combining, no separator) --
    so a plain `json.loads` fails with `JSONDecodeError: Extra data` as
    soon as there is more than one page (codex review,
    discussion_r4005569175). This decodes every concatenated top-level
    JSON value in turn and flattens any list-valued ones together, so a
    single combined array (one page) and several concatenated arrays
    (multiple pages) both come back the same way."""
    raw = (raw or "").strip()
    if not raw:
        return []
    decoder = json.JSONDecoder()
    values = []
    index = 0
    length = len(raw)
    while index < length:
        while index < length and raw[index].isspace():
            index += 1
        if index >= length:
            break
        value, end = decoder.raw_decode(raw, index)
        values.append(value)
        index = end
    combined = []
    for value in values:
        if isinstance(value, list):
            combined.extend(value)
        else:
            combined.append(value)
    return combined


def fetch_closed_issues(repo, *, gh_runner):
    """Every closed Issue's own `{number, labels}`, across the whole
    repository. GitHub's REST `/issues` endpoint also returns pull
    requests, so an entry carrying its own `pull_request` key is filtered
    out here -- `fetch_closed_prs` below is what returns those instead,
    which keeps this from ever double-counting a PR."""
    raw = gh_runner([
        "gh", "api", "--paginate",
        f"repos/{repo}/issues?state=closed&per_page={API_PAGE_SIZE}",
    ])
    entries = _load_paginated_json(raw)
    return [
        {"number": entry["number"], "labels": entry.get("labels", [])}
        for entry in entries
        if "pull_request" not in entry
    ]


def fetch_closed_prs(repo, *, gh_runner):
    """Every closed PR's own `{number, labels}`, across the whole
    repository. GitHub's REST `/pulls` endpoint's own `state` field is only
    ever `open`/`closed` -- unlike `gh pr list`'s CLI-level `--state`
    filter, which treats `closed` and `merged` as distinct values and so
    never returned a merged PR here at all (codex review,
    discussion_r4005216707) -- so `state=closed` at this REST level already
    includes a merged PR without a second query."""
    raw = gh_runner([
        "gh", "api", "--paginate",
        f"repos/{repo}/pulls?state=closed&per_page={API_PAGE_SIZE}",
    ])
    entries = _load_paginated_json(raw)
    return [
        {"number": entry["number"], "labels": entry.get("labels", [])}
        for entry in entries
    ]


def fetch_current_state(kind, number, repo, *, gh_runner):
    """Fresh, upper-cased `state` for one item, read immediately before a
    write -- the defense against a reopen race between `sweep`'s own list
    snapshot and this edit (see module docstring)."""
    subcommand = "issue" if kind == "issue" else "pr"
    raw = gh_runner([
        "gh", subcommand, "view", str(number), "--repo", repo, "--json", "state",
    ])
    payload = json.loads(raw or "{}")
    return (payload.get("state") or "").upper()


def remove_labels(kind, number, repo, labels, *, gh_runner):
    """Remove exactly `labels` from the named item in one `gh ... edit`
    call. A no-op (no call at all) when `labels` is empty."""
    if not labels:
        return
    subcommand = "issue" if kind == "issue" else "pr"
    argv = ["gh", subcommand, "edit", str(number), "--repo", repo]
    for label in labels:
        argv += ["--remove-label", label]
    gh_runner(argv)


def sweep(repo, *, gh_runner, dry_run=False):
    """Reconcile every closed Issue and PR in `repo`. Returns a list of
    `(kind, number, removed_labels)` for every item that actually had
    something removed (or, in `dry_run`, would have) -- an empty return
    means the repository was already clean, the expected steady state.

    A real (non-`dry_run`) write re-checks the item's live state
    immediately beforehand and skips it entirely -- no write, no reported
    change -- if it is no longer `CLOSED`/`MERGED`, i.e. it was reopened
    between the list snapshot above and this point."""
    changes = []
    for kind, items in (
        ("issue", fetch_closed_issues(repo, gh_runner=gh_runner)),
        ("pr", fetch_closed_prs(repo, gh_runner=gh_runner)),
    ):
        for entry in items:
            names = [label.get("name", "") for label in entry.get("labels", ())]
            to_remove = harness_labels.labels_to_remove(names)
            if not to_remove:
                continue
            number = entry["number"]
            if dry_run:
                changes.append((kind, number, to_remove))
                continue
            current_state = fetch_current_state(kind, number, repo, gh_runner=gh_runner)
            if current_state not in ("CLOSED", "MERGED"):
                continue
            remove_labels(kind, number, repo, to_remove, gh_runner=gh_runner)
            changes.append((kind, number, to_remove))
    return changes


def _real_gh_runner(argv):
    result = subprocess.run(argv, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise ReconcilerError(
            f"{' '.join(argv)} exited {result.returncode}: {result.stderr.strip()}")
    return result.stdout


def parse_args(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, help="owner/repo to reconcile")
    parser.add_argument(
        "--dry-run", action="store_true",
        help="report what would be removed without writing anything")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv if argv is not None else sys.argv[1:])
    changes = sweep(args.repo, gh_runner=_real_gh_runner, dry_run=args.dry_run)
    if not changes:
        print(f"{args.repo}: clean, nothing to reconcile")
        return 0
    verb = "would remove" if args.dry_run else "removed"
    for kind, number, labels in changes:
        print(f"{args.repo} {kind} #{number}: {verb} {', '.join(labels)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
