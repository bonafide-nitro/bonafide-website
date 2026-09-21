#!/usr/bin/env python3
"""
Event-driven, idempotent close/merge label cleanup -- one half of Issue
#171's "Close/merge hygiene" port from the proven Zoe harness golden path
(see docs/HARNESS_GOLDEN_PATH.md). Fired by
`.github/workflows/harness-label-close-cleanup.yml` on `issues: closed` /
`pull_request: closed` (the latter covers both a merge and an ordinary
close -- `gh pr view --json state` reports a merged PR's own state as the
distinct value `"MERGED"`, never `"CLOSED"`, so this cleanup treats
`"CLOSED"` and `"MERGED"` as equally "genuinely closed" for a PR; an Issue
only ever reports `"OPEN"`/`"CLOSED"`).

Removal-only: strips every transient (`READY_FOR_CLAUDE_CLOUD`,
`READY_FOR_SANTIAGO`) and retired/forbidden label from the one item this
run was fired for -- see `.github/scripts/harness_labels.py` for the exact
shared vocabulary. Never adds a label, posts a comment, reopens an item,
requeues Claude, or wakes Codex; never touches `VERIFIED`, `COMPLETED`, or
any ordinary product/client/non-harness label.

Idempotent: an item with nothing removable performs zero `gh` writes.
Defense in depth: re-fetches and re-checks the item is still `CLOSED`
immediately before writing -- the one case this refuses to touch is a race
where the item was reopened between the triggering webhook and this run.
"""

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import harness_labels  # noqa: E402


class CloseCleanupError(RuntimeError):
    """A close-cleanup operation could not be completed safely."""


@dataclass(frozen=True)
class WorkItem:
    """One exact GitHub issue or PR to clean transient/retired labels from."""

    kind: str  # "issue" or "pr"
    number: int
    repo: str  # "owner/repo"

    def __post_init__(self):
        if self.kind not in ("issue", "pr"):
            raise CloseCleanupError(f"unknown work item kind {self.kind!r}")

    @property
    def gh_subcommand(self):
        return "issue" if self.kind == "issue" else "pr"


def fetch_labels_and_state(item, *, gh_runner):
    """`(label_names, state)` for `item`, read-only. `state` is GitHub's own
    upper-cased state string -- `"OPEN"`/`"CLOSED"` for an Issue, and
    `"OPEN"`/`"CLOSED"`/`"MERGED"` for a PR (a merge is its own distinct
    state, never reported as `"CLOSED"`). `clean_item` is what treats
    `"CLOSED"` and `"MERGED"` alike."""
    raw = gh_runner([
        "gh", item.gh_subcommand, "view", str(item.number), "--repo", item.repo,
        "--json", "labels,state",
    ])
    payload = json.loads(raw or "{}")
    labels = [entry.get("name", "") for entry in payload.get("labels", ())]
    state = (payload.get("state") or "").upper()
    return labels, state


def remove_labels(item, labels, *, gh_runner):
    """Remove exactly `labels` from `item` in one `gh ... edit` call. A
    no-op (no call at all) when `labels` is empty -- what makes a clean
    item's own run perform zero writes."""
    if not labels:
        return
    argv = ["gh", item.gh_subcommand, "edit", str(item.number), "--repo", item.repo]
    for label in labels:
        argv += ["--remove-label", label]
    gh_runner(argv)


def clean_item(item, *, gh_runner):
    """Remove every transient/retired label currently on `item`, but only
    when `item` is genuinely closed right now -- `"CLOSED"` or, for a PR,
    the distinct `"MERGED"` state (see `fetch_labels_and_state`) -- never on
    an item found open (a race between the triggering webhook and this run
    reopening it). Returns the sorted list of labels actually removed
    (possibly empty)."""
    labels, state = fetch_labels_and_state(item, gh_runner=gh_runner)
    if state not in ("CLOSED", "MERGED"):
        return []
    to_remove = harness_labels.labels_to_remove(labels)
    remove_labels(item, to_remove, gh_runner=gh_runner)
    return to_remove


def _real_gh_runner(argv):
    result = subprocess.run(argv, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise CloseCleanupError(
            f"{' '.join(argv)} exited {result.returncode}: {result.stderr.strip()}")
    return result.stdout


def parse_args(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, help="owner/repo the work item lives in")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--issue", type=int, help="issue number to clean up")
    group.add_argument("--pr", type=int, help="pull request number to clean up")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv if argv is not None else sys.argv[1:])
    item = WorkItem(
        kind="issue" if args.issue is not None else "pr",
        number=args.issue if args.issue is not None else args.pr,
        repo=args.repo,
    )
    removed = clean_item(item, gh_runner=_real_gh_runner)
    if removed:
        print(f"{item.repo} {item.kind} #{item.number}: removed {', '.join(removed)}")
    else:
        print(f"{item.repo} {item.kind} #{item.number}: nothing to remove")
    return 0


if __name__ == "__main__":
    sys.exit(main())
