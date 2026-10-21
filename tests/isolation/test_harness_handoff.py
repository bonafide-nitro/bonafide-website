"""
Offline coverage for .github/scripts/harness_handoff.py and
.github/workflows/santiago-ready-label-trigger.yml -- the Claude -> Santiago
handoff. The fixtures replay the real PR #204/#206 comments the previous
first-line-only parser dropped silently.
"""

import importlib.util
import sys
import unittest
from pathlib import Path

def _repo_root():
    """The repository root: the nearest parent directory holding `.github`
    (this file lives in a different tests/ subfolder in different repos)."""
    here = Path(__file__).resolve()
    return next(p for p in here.parents if (p / ".github").is_dir())


REPO_ROOT = _repo_root()
SCRIPT_PATH = REPO_ROOT / ".github" / "scripts" / "harness_handoff.py"
WORKFLOW_PATH = REPO_ROOT / ".github" / "workflows" / "santiago-ready-label-trigger.yml"

_spec = importlib.util.spec_from_file_location("harness_handoff", SCRIPT_PATH)
handoff = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = handoff
_spec.loader.exec_module(handoff)

HEAD = "4511b503a98f5b917eba4caf531872e207ff99a5"
OWNER = "zanetaseiler"

# PR #206, 2026-09-24T20:30:58Z: correction-round format, CONTEXT_RECEIPT first.
CORRECTION_COMMENT = f"""CONTEXT_RECEIPT

- current base-branch commit SHA (PR head at receipt time): `e6ef1eb6d2f96c089abbca6222dccb96da1c4699`
- unresolved questions: none

Corrections made: see below. Affected tests run: see below.

---

READY_FOR_SANTIAGO

- Block number: Issue #205
- exact head commit SHA: `{HEAD}`

STOP -- waiting for Santiago's review.
"""


def evaluate(body, *, author=OWNER, is_pr=True, head=HEAD):
    return handoff.evaluate(body=body, author=author, owner=OWNER, is_pr=is_pr, current_head=head)


class TestKeywordLine(unittest.TestCase):

    def test_keyword_later_in_a_correction_comment_is_a_handoff(self):
        self.assertEqual(evaluate(CORRECTION_COMMENT)[0], handoff.HANDOFF)

    def test_keyword_first_line_still_works(self):
        body = f"READY_FOR_SANTIAGO\n\n- exact head commit SHA: `{HEAD}`\n"
        self.assertEqual(evaluate(body)[0], handoff.HANDOFF)

    def test_markdown_decoration_is_tolerated(self):
        for line in ("## READY_FOR_SANTIAGO", "**READY_FOR_SANTIAGO**",
                     "  READY_FOR_SANTIAGO:  ", "`READY_FOR_SANTIAGO`"):
            with self.subTest(line=line):
                self.assertEqual(evaluate(f"{line}\n\nHead SHA: {HEAD[:7]}")[0], handoff.HANDOFF)

    def test_keyword_followed_by_a_dash_and_date_counts(self):
        self.assertTrue(handoff.has_keyword_line("ZANETA_DECISION \u2014 2026-09-25\n\nGo.",
                                                 "ZANETA_DECISION"))
        self.assertEqual(evaluate(f"READY_FOR_SANTIAGO \u2014 round 3\n{HEAD}")[0], handoff.HANDOFF)

    def test_longer_word_is_not_the_keyword(self):
        self.assertFalse(handoff.has_keyword_line("READY_FOR_SANTIAGO_LATER\n" + HEAD))

    def test_inline_mention_is_not_a_handoff(self):
        body = f"No live publish -- this Block stops at `READY_FOR_SANTIAGO` ({HEAD})."
        self.assertEqual(evaluate(body), (handoff.NOT_A_HANDOFF, ""))

    def test_keyword_inside_a_code_fence_is_not_a_handoff(self):
        body = f"Format:\n```\nREADY_FOR_SANTIAGO\n- exact head commit SHA: {HEAD}\n```\n"
        self.assertEqual(evaluate(body)[0], handoff.NOT_A_HANDOFF)


class TestHeadMatching(unittest.TestCase):

    def test_short_sha_is_enough(self):
        self.assertEqual(evaluate(f"READY_FOR_SANTIAGO\nhead: {HEAD[:7]}")[0], handoff.HANDOFF)

    def test_right_short_sha_with_a_mistyped_tail_is_accepted(self):
        # PR #204, 2026-09-23T12:56:13Z: real head e723773da062..., comment claimed e7237736ab2f...
        body = "READY_FOR_SANTIAGO\n- exact head commit SHA: `e7237736ab2f1e07eab6c3ec8fc6d54a4dc0c62d`"
        self.assertEqual(evaluate(body, head="e723773da06227cac7bf5052e50c13a41a3b22f6")[0],
                         handoff.HANDOFF)

    def test_any_sha_line_wording_is_accepted(self):
        # PR #204, 2026-09-24T18:13:57Z: "authoritative PR #204 head verified from git"
        body = ("READY_FOR_SANTIAGO\n\n- authoritative PR #204 head verified from git "
                "(`git rev-parse HEAD` on the pushed branch): `ce93325bfd729f076cd94adad36e6f6cec471bcd`")
        self.assertEqual(evaluate(body, head="ce93325bfd729f076cd94adad36e6f6cec471bcd")[0],
                         handoff.HANDOFF)

    def test_only_an_older_sha_is_ignored_loudly(self):
        body = "READY_FOR_SANTIAGO\n- exact head commit SHA: `e6ef1eb6d2f96c089abbca6222dccb96da1c4699`"
        decision, reason = evaluate(body)
        self.assertEqual(decision, handoff.IGNORED)
        self.assertIn(HEAD, reason)

    def test_missing_sha_is_ignored_loudly(self):
        decision, reason = evaluate("READY_FOR_SANTIAGO\n\nAll done.")
        self.assertEqual(decision, handoff.IGNORED)
        self.assertIn("no commit SHA", reason)


class TestWhereAndWho(unittest.TestCase):

    def test_handoff_on_an_issue_is_ignored_loudly(self):
        decision, reason = evaluate(CORRECTION_COMMENT, is_pr=False, head="")
        self.assertEqual(decision, handoff.IGNORED)
        self.assertIn("PR", reason)

    def test_handoff_from_another_account_is_ignored_loudly(self):
        decision, reason = evaluate(CORRECTION_COMMENT, author="claude[bot]")
        self.assertEqual(decision, handoff.IGNORED)
        self.assertIn("claude[bot]", reason)


class TestNotices(unittest.TestCase):

    def test_notice_never_contains_a_keyword_line_of_its_own(self):
        notice = handoff.ignored_notice("x")
        self.assertTrue(notice.startswith("HANDOFF_IGNORED"))
        self.assertFalse(handoff.has_keyword_line(notice))


class TestCheckOnlyMode(unittest.TestCase):

    def run_check(self, body, head=HEAD):
        import io, json, os, tempfile
        from contextlib import redirect_stdout
        event = {"comment": {"body": body, "user": {"login": OWNER}},
                 "repository": {"owner": {"login": OWNER}}}
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as handle:
            json.dump(event, handle)
        old = os.environ.get("GITHUB_EVENT_PATH")
        os.environ["GITHUB_EVENT_PATH"] = handle.name
        out = io.StringIO()
        try:
            with redirect_stdout(out):
                self.assertEqual(handoff.main(["--human", OWNER, "--repo", "o/r", "--number", "1",
                                               "--check-only", head]), 0)
        finally:
            os.unlink(handle.name)
            if old is None:
                del os.environ["GITHUB_EVENT_PATH"]
            else:
                os.environ["GITHUB_EVENT_PATH"] = old
        return out.getvalue().rstrip("\n").split("\t", 1)

    def test_prints_the_decision_without_needing_a_token_or_network(self):
        self.assertEqual(self.run_check(CORRECTION_COMMENT)[0], handoff.HANDOFF)
        decision, reason = self.run_check("READY_FOR_SANTIAGO\nno sha")
        self.assertEqual(decision, handoff.IGNORED)
        self.assertIn("no commit SHA", reason)


class TestSetupProblems(unittest.TestCase):
    """bonafide Issue #13 / PR #14 (2026-09-25): a missing, then refused,
    SANTIAGO_CODEX_BRIDGE_TOKEN failed only as a red Actions run, and the
    log said nothing but "exit status 1"."""

    def run_main(self, token, gh):
        import io, json, os, tempfile
        from contextlib import redirect_stderr, redirect_stdout
        event = {"comment": {"body": CORRECTION_COMMENT, "user": {"login": OWNER}},
                 "issue": {"number": 14, "pull_request": {"url": "x"}}}
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as handle:
            json.dump(event, handle)
        saved = {k: os.environ.get(k) for k in ("GITHUB_EVENT_PATH", "CODEX_WAKE_TOKEN")}
        os.environ["GITHUB_EVENT_PATH"] = handle.name
        os.environ["CODEX_WAKE_TOKEN"] = token
        original = handoff._gh
        handoff._gh = gh
        try:
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                return handoff.main(["--human", OWNER, "--repo", "o/r", "--number", "14"])
        finally:
            handoff._gh = original
            os.unlink(handle.name)
            for key, value in saved.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value

    def fake_gh(self, calls, refuse_token=None):
        def gh(argv, token=None):
            calls.append((argv, token))
            if token and token == refuse_token:
                raise handoff.GhError("`gh api --method POST` failed: HTTP 403: Resource not "
                                      "accessible by personal access token")
            if argv[-1].endswith("pulls/14"):
                return '{"head": {"sha": "%s"}}' % HEAD
            return "{}"
        return gh

    def posted(self, calls):
        return [argv[-1][len("body="):] for argv, _ in calls
                if "--method" in argv and argv[-1].startswith("body=")]

    def test_missing_token_is_reported_on_the_pr(self):
        calls = []
        self.assertEqual(self.run_main("", self.fake_gh(calls)), 1)
        notice, = self.posted(calls)
        self.assertTrue(notice.startswith("HARNESS_SETUP_PROBLEM"))
        self.assertIn("empty or not visible", notice)
        self.assertIn("SANTIAGO_CODEX_BRIDGE_TOKEN", notice)

    def test_refused_token_is_reported_with_githubs_own_words(self):
        calls = []
        self.assertEqual(self.run_main("org-less-token", self.fake_gh(calls, "org-less-token")), 1)
        # The token is refused at the first step (the per-head claim), so no
        # `@codex review` is attempted and the notice names that step.
        notice, = self.posted(calls)
        self.assertIn("per-head Codex wake claim", notice)
        self.assertIn("Resource not accessible by personal access token", notice)
        self.assertIn("organization as its resource owner", notice)
        # The notice itself is posted with GITHUB_TOKEN, not the refused token.
        self.assertIsNone(calls[-1][1])

    def test_notice_carries_no_handoff_keyword_line(self):
        notice = handoff.setup_problem_notice("step", "problem", OWNER)
        for keyword in ("READY_FOR_SANTIAGO", "NEEDS_ZANETA", "ZANETA_DECISION", "VERIFIED"):
            self.assertFalse(handoff.has_keyword_line(notice, keyword), keyword)

    def test_run_gh_error_carries_githubs_message(self):
        import os, stat, tempfile
        folder = tempfile.mkdtemp()
        fake = Path(folder) / "gh"
        fake.write_text("#!/bin/sh\necho 'gh: Resource not accessible by personal access token (HTTP 403)' >&2\nexit 1\n")
        fake.chmod(fake.stat().st_mode | stat.S_IEXEC)
        saved = os.environ["PATH"]
        os.environ["PATH"] = folder
        try:
            with self.assertRaises(handoff.GhError) as caught:
                handoff.run_gh(["api", "--method", "POST", "repos/o/r/issues/14/comments"])
        finally:
            os.environ["PATH"] = saved
        self.assertIn("Resource not accessible by personal access token (HTTP 403)", str(caught.exception))

class FakeGitHub:
    """In-memory GitHub for the wake: one shared ref store, so two runs of
    main() contend for the same claim exactly as two workflows would."""

    def __init__(self, head=HEAD, fail_posts=0, fail_delete=False):
        self.head = head
        self.refs = set()
        self.comments = []
        self.fail_posts = fail_posts
        self.fail_delete = fail_delete

    def __call__(self, argv, token=None):
        path = next((a for a in argv if a.startswith("repos/")), "")
        method = argv[argv.index("--method") + 1] if "--method" in argv else "GET"
        fields = [a for a in argv if "=" in a and not a.startswith("repos/")]
        field = lambda name: next(f.split("=", 1)[1] for f in fields if f.startswith(name + "="))
        if method == "GET":
            return '{"head": {"sha": "%s"}}' % self.head
        if path.endswith("/git/refs"):
            ref = field("ref")
            if ref in self.refs:
                raise handoff.GhError("`gh api --method POST` failed: gh: Reference already exists (HTTP 422)")
            self.refs.add(ref)
            return "{}"
        if method == "DELETE":
            if self.fail_delete:
                raise handoff.GhError("`gh api --method DELETE` failed: HTTP 403")
            self.refs.discard("refs/" + path.split("/git/refs/", 1)[1])
            return "{}"
        body = field("body")
        if body == "@codex review" and self.fail_posts:
            self.fail_posts -= 1
            raise handoff.GhError("`gh api --method POST` failed: HTTP 502")
        self.comments.append(body)
        return "{}"

    def wakes(self):
        return [c for c in self.comments if c == "@codex review"]


class TestWakeIsIdempotentPerHead(unittest.TestCase):
    """Issue #157: PRs #154/#156 got two `@codex review` on one head."""

    def run_main(self, gh, *, label=False, head=HEAD, number=14):
        import io, json, os, tempfile
        from contextlib import redirect_stderr, redirect_stdout
        event = {"comment": {"body": f"READY_FOR_SANTIAGO\n- exact head commit SHA: {head}",
                             "user": {"login": OWNER}},
                 "issue": {"number": number, "pull_request": {"url": "x"}}}
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as handle:
            json.dump(event, handle)
        saved = {k: os.environ.get(k) for k in ("GITHUB_EVENT_PATH", "CODEX_WAKE_TOKEN")}
        os.environ["GITHUB_EVENT_PATH"] = handle.name
        os.environ["CODEX_WAKE_TOKEN"] = "owner-token"
        original = handoff._gh
        handoff._gh = gh
        try:
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                args = ["--human", OWNER, "--repo", "o/r", "--number", str(number)]
                return handoff.main(args + (["--label-event"] if label else []))
        finally:
            handoff._gh = original
            os.unlink(handle.name)
            for key, value in saved.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value

    def test_double_comment_wakes_codex_once(self):
        gh = FakeGitHub()
        self.assertEqual(self.run_main(gh), 0)
        self.assertEqual(self.run_main(gh), 0)
        self.assertEqual(len(gh.wakes()), 1)

    def test_comment_then_label_wakes_codex_once(self):
        gh = FakeGitHub()
        self.assertEqual(self.run_main(gh), 0)
        self.assertEqual(self.run_main(gh, label=True), 0)
        self.assertEqual(len(gh.wakes()), 1)

    def test_label_then_comment_wakes_codex_once(self):
        gh = FakeGitHub()
        self.assertEqual(self.run_main(gh, label=True), 0)
        self.assertEqual(self.run_main(gh), 0)
        self.assertEqual(len(gh.wakes()), 1)

    def test_concurrent_comment_and_label_race_wakes_codex_once(self):
        import threading
        gh = FakeGitHub()
        lock, original_call = threading.Lock(), FakeGitHub.__call__
        gate = threading.Barrier(2)

        def racing(argv, token=None):
            # Both runs reach the claim before either posts; the ref store
            # itself is the only arbiter (the lock only keeps the fake's set
            # consistent, as GitHub's server does).
            if any(a.endswith("/git/refs") for a in argv):
                gate.wait(timeout=5)
            with lock:
                return original_call(gh, argv, token)

        results = []
        # main() swaps the module-level _gh, so both threads run under one patch.
        import io, json, os, tempfile
        from contextlib import redirect_stderr, redirect_stdout
        event = {"comment": {"body": f"READY_FOR_SANTIAGO\n{HEAD}", "user": {"login": OWNER}},
                 "issue": {"number": 14, "pull_request": {"url": "x"}}}
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as handle:
            json.dump(event, handle)
        os.environ["GITHUB_EVENT_PATH"], os.environ["CODEX_WAKE_TOKEN"] = handle.name, "owner-token"
        original = handoff._gh
        handoff._gh = racing
        base = ["--human", OWNER, "--repo", "o/r", "--number", "14"]
        try:
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                threads = [threading.Thread(target=lambda a=a: results.append(handoff.main(base + a)))
                           for a in (["--label-event"], [])]
                for t in threads:
                    t.start()
                for t in threads:
                    t.join(10)
        finally:
            handoff._gh = original
            os.unlink(handle.name)
            os.environ.pop("GITHUB_EVENT_PATH", None)
            os.environ.pop("CODEX_WAKE_TOKEN", None)
        self.assertEqual(results, [0, 0])
        self.assertEqual(len(gh.wakes()), 1)

    def test_a_new_head_sha_is_woken_again_but_only_once(self):
        gh = FakeGitHub(head=HEAD)
        self.run_main(gh)
        new_head = "b" * 40
        gh.head = new_head
        self.run_main(gh, head=new_head)
        self.run_main(gh, head=new_head, label=True)
        self.assertEqual(len(gh.wakes()), 2)
        self.assertEqual(gh.refs, {f"refs/harness/codex-wake/{HEAD}",
                                   f"refs/harness/codex-wake/{new_head}"})

    def test_failed_post_releases_the_claim_so_a_rerun_retries(self):
        gh = FakeGitHub(fail_posts=1)
        self.assertEqual(self.run_main(gh), 1)
        self.assertEqual(gh.wakes(), [])
        self.assertEqual(gh.refs, set())
        notice, = [c for c in gh.comments if c.startswith("HARNESS_SETUP_PROBLEM")]
        self.assertIn("re-run the failed run to retry", notice)
        self.assertEqual(self.run_main(gh), 0)
        self.assertEqual(len(gh.wakes()), 1)

    def test_unreleasable_claim_prints_the_one_command_that_frees_it(self):
        gh = FakeGitHub(fail_posts=1, fail_delete=True)
        self.assertEqual(self.run_main(gh), 1)
        notice, = [c for c in gh.comments if c.startswith("HARNESS_SETUP_PROBLEM")]
        self.assertIn(f"gh api -X DELETE repos/o/r/git/refs/harness/codex-wake/{HEAD}", notice)

    def test_stale_handoff_claims_nothing(self):
        gh = FakeGitHub(head="c" * 40)
        self.assertEqual(self.run_main(gh), 0)
        self.assertEqual(gh.refs, set())
        self.assertEqual(gh.wakes(), [])

    def test_claim_ref_is_lowercase_and_head_specific(self):
        self.assertEqual(handoff.claim_ref("ABCDEF1"), "harness/codex-wake/abcdef1")


class TestWorkflow(unittest.TestCase):

    def setUp(self):
        self.text = WORKFLOW_PATH.read_text(encoding="utf-8")
        if "harness_handoff.py" not in self.text:
            self.fail("santiago-ready-label-trigger.yml must run .github/scripts/harness_handoff.py")
        if "--check-only" in self.text:
            self.skipTest("this repo's own workflow wakes Codex; only the shared parser is used")

    def test_runs_the_trusted_default_branch_script(self):
        self.assertIn("ref: ${{ github.event.repository.default_branch }}", self.text)
        self.assertIn("python3 .github/scripts/harness_handoff.py", self.text)

    def test_any_comment_mentioning_the_keyword_reaches_the_script(self):
        self.assertIn("contains(github.event.comment.body, 'READY_FOR_SANTIAGO')", self.text)
        self.assertNotIn("startsWith(github.event.comment.body", self.text)

    def test_codex_is_woken_with_the_owner_token_and_notices_use_github_token(self):
        self.assertIn("CODEX_WAKE_TOKEN: ${{ secrets.SANTIAGO_CODEX_BRIDGE_TOKEN }}", self.text)
        self.assertIn("GH_TOKEN: ${{ github.token }}", self.text)

    def test_authorized_human_is_a_person_not_the_repository_owner(self):
        self.assertNotIn("github.repository_owner", self.text)
        self.assertIn("AUTHORIZED_HUMAN: ${{ vars.HARNESS_HUMAN_LOGIN }}", self.text)
        self.assertIn('--human "${AUTHORIZED_HUMAN:-zanetaseiler}"', self.text)

    def test_unrelated_comments_cannot_displace_a_pending_handoff(self):
        # Only handoff events share the per-PR group; any other comment gets
        # a run-unique group so it cannot replace the single pending run.
        self.assertIn("&& 'handoff' || github.run_id", self.text)
        self.assertIn("cancel-in-progress: false", self.text)

    def test_no_schedule_or_actions_scope(self):
        self.assertNotIn("schedule:", self.text)
        self.assertNotIn("actions:", self.text)


if __name__ == "__main__":
    unittest.main()
