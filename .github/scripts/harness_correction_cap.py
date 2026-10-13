"""
Cap automatic Codex -> Claude correction rounds per PR (Block 44, Issue #105).

Run by `.github/workflows/codex-feedback-to-claude.yml` after a current-head
Codex review with findings is validated and BEFORE it clears any label, adds
`READY_FOR_CLAUDE_CLOUD` or fires the Routine.

Why: PR #104 got repeated Codex reviews and a fresh correction session per new
head SHA, with no limit. The count lives in durable GitHub state -- one
`CODEX_CORRECTION_DISPATCHED` comment posted by `github-actions[bot]` per
accepted Codex review -- so it survives new commit SHAs and Action reruns.

Decision for one review (`decide`), evaluated in this order:

1. PR not open                              -> `closed`    (touch nothing)
2. this review already has a marker         -> `duplicate` (a rerun / repeat event)
3. `MAX_CORRECTIONS` markers already exist  -> `capped`    (one MANUAL_REVIEW_REQUIRED)
4. otherwise                                -> `dispatch`  (marker written first)

The marker is written before the caller changes anything else, and the
workflow's per-PR concurrency group serializes runs, so a repeated event sees
the marker and cannot create an extra correction session.

Recovery override (deliberately manual): the cap is never reset by a new SHA
or a rerun. Only the owner can approve further correction rounds, by a
`ZANETA_DECISION` comment on the PR (restarts Claude through
`harness-requeue.yml`, which this cap does not touch) or a `CHANGES_REQUESTED`
comment from the authorized human.
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import harness_handoff  # noqa: E402

# What the workflow's GITHUB_TOKEN needs for this script's API calls;
# test_harness_permissions.py checks every workflow running it grants it.
GITHUB_TOKEN_PERMISSIONS = {"pull-requests": "read", "issues": "write"}

MAX_CORRECTIONS = 2
BOT = "github-actions[bot]"
DISPATCH_KEYWORD = "CODEX_CORRECTION_DISPATCHED"
MANUAL_KEYWORD = "MANUAL_REVIEW_REQUIRED"

CLOSED = "closed"
DUPLICATE = "duplicate"
CAPPED = "capped"
DISPATCH = "dispatch"


def _bot_comments(comments, keyword):
    return [c for c in comments
            if (c.get("user") or {}).get("login") == BOT
            and harness_handoff.has_keyword_line(c.get("body") or "", keyword)]


def review_ids(comments):
    """Distinct review ids already given a correction, from trusted markers."""
    found = set()
    for c in _bot_comments(comments, DISPATCH_KEYWORD):
        match = re.search(r"(?m)^- review id:\s*(\d+)\s*$", c.get("body") or "")
        # A marker without a readable id still counts as one correction.
        found.add(match.group(1) if match else f"comment-{c.get('id', len(found))}")
    return found


def manual_notice_posted(comments):
    return bool(_bot_comments(comments, MANUAL_KEYWORD))


def decide(*, pr_state, comments, review_id):
    if pr_state != "open":
        return CLOSED
    done = review_ids(comments)
    if str(review_id) in done:
        return DUPLICATE
    if len(done) >= MAX_CORRECTIONS:
        return CAPPED
    return DISPATCH


def dispatch_marker(*, review_id, head, count):
    return (f"{DISPATCH_KEYWORD}\n\n"
            f"- review id: {review_id}\n"
            f"- head: {head}\n"
            f"- automatic correction: {count} of {MAX_CORRECTIONS}\n")


def manual_notice(*, head):
    return (f"{MANUAL_KEYWORD}\n\n"
            f"- reason: this PR already received {MAX_CORRECTIONS} automatic Codex-finding -> "
            f"Claude correction rounds (the maximum). Latest Codex review was on head `{head}`.\n"
            "- effect: no further Claude correction session is started automatically, and the "
            "PR's labels were left unchanged. Review it manually.\n"
            "- override: only the owner can approve more rounds, by a `ZANETA_DECISION` comment "
            "on this PR. A new commit SHA or an Action rerun never resets the count.\n")


# --- GitHub plumbing -------------------------------------------------------

def _get(repo, path):
    return json.loads(harness_handoff.run_gh(["api", f"repos/{repo}/{path}"]))


def _comments(repo, number):
    pages = json.loads(harness_handoff.run_gh(
        ["api", "--paginate", "--slurp", f"repos/{repo}/issues/{number}/comments?per_page=100"]) or "[]")
    return [c for page in pages for c in (page if isinstance(page, list) else [page])]


def _post(repo, number, body):
    harness_handoff.run_gh(["api", "--method", "POST", f"repos/{repo}/issues/{number}/comments",
                            "-f", f"body={body}"])


def _output(**values):
    lines = "".join(f"{k}={v}\n" for k, v in values.items())
    print(lines, end="")
    path = os.environ.get("GITHUB_OUTPUT")
    if path:
        with open(path, "a", encoding="utf-8") as handle:
            handle.write(lines)


def run(repo, number, review_id, head):
    pr = _get(repo, f"pulls/{number}")
    # The PR may have received a new commit after workflow validation. Never
    # spend a correction slot or dispatch Claude against an outdated head.
    if pr.get("state") == "open" and (pr.get("head") or {}).get("sha") != head:
        print(f"PR #{number}, Codex review {review_id}: stale head; no correction dispatched.")
        _output(action="stale", go="false")
        return 0
    comments = [] if pr.get("state") != "open" else _comments(repo, number)
    verdict = decide(pr_state=pr.get("state"), comments=comments, review_id=review_id)
    if verdict == DISPATCH:
        count = len(review_ids(comments)) + 1
        _post(repo, number, dispatch_marker(review_id=review_id, head=head, count=count))
    elif verdict == CAPPED and not manual_notice_posted(comments):
        _post(repo, number, manual_notice(head=head))
    print(f"PR #{number}, Codex review {review_id}: {verdict}.")
    _output(action=verdict, go="true" if verdict == DISPATCH else "false")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="Cap automatic Codex -> Claude corrections.")
    parser.add_argument("--repo", required=True)
    parser.add_argument("--number", required=True, type=int)
    parser.add_argument("--review-id", required=True)
    parser.add_argument("--head", required=True)
    args = parser.parse_args(argv)
    return run(args.repo, args.number, args.review_id, args.head)


if __name__ == "__main__":
    sys.exit(main())
