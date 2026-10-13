"""
Offline coverage for .github/scripts/harness_correction_cap.py -- the cap of
two automatic Codex -> Claude correction rounds per PR (Block 44, Issue #105).
"""

import importlib.util
import sys
import unittest
from pathlib import Path


def _repo_root():
    here = Path(__file__).resolve()
    return next(p for p in here.parents if (p / ".github").is_dir())


REPO_ROOT = _repo_root()
SCRIPTS = REPO_ROOT / ".github" / "scripts"
WORKFLOWS = REPO_ROOT / ".github" / "workflows"

sys.path.insert(0, str(SCRIPTS))
_spec = importlib.util.spec_from_file_location("harness_correction_cap", SCRIPTS / "harness_correction_cap.py")
cap = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = cap
_spec.loader.exec_module(cap)

BOT = "github-actions[bot]"


def marker(review_id, head="a" * 40, user=BOT):
    return {"id": int(review_id), "user": {"login": user},
            "body": cap.dispatch_marker(review_id=review_id, head=head, count=1)}


def decide(comments, review_id, state="open"):
    return cap.decide(pr_state=state, comments=comments, review_id=review_id)


class TestDecide(unittest.TestCase):

    def test_zero_markers_dispatches(self):
        self.assertEqual(decide([], 1), cap.DISPATCH)

    def test_one_marker_dispatches_a_new_review(self):
        self.assertEqual(decide([marker(1)], 2), cap.DISPATCH)

    def test_two_markers_cap_a_third_review(self):
        self.assertEqual(decide([marker(1), marker(2)], 3), cap.CAPPED)

    def test_many_markers_stay_capped_across_new_heads(self):
        comments = [marker(i, head=f"{i:040x}") for i in range(1, 6)]
        self.assertEqual(decide(comments, 99), cap.CAPPED)

    def test_same_review_again_is_a_duplicate_not_a_new_round(self):
        self.assertEqual(decide([marker(1)], 1), cap.DUPLICATE)
        self.assertEqual(decide([marker(1), marker(2)], 2), cap.DUPLICATE)

    def test_closed_or_merged_pr_is_ignored_first(self):
        self.assertEqual(decide([], 1, state="closed"), cap.CLOSED)
        self.assertEqual(decide([marker(1), marker(2)], 3, state="closed"), cap.CLOSED)

    def test_marker_from_a_human_or_other_bot_is_not_trusted(self):
        forged = [marker(1, user="zanetaseiler"), marker(2, user="chatgpt-codex-connector[bot]")]
        self.assertEqual(decide(forged, 3), cap.DISPATCH)

    def test_quoted_marker_inside_a_code_fence_does_not_count(self):
        quoted = {"id": 7, "user": {"login": BOT},
                  "body": "note:\n```\nCODEX_CORRECTION_DISPATCHED\n\n- review id: 7\n```\n"}
        self.assertEqual(decide([quoted, marker(1)], 2), cap.DISPATCH)

    def test_manual_notice_is_detected_so_it_posts_once(self):
        notice = {"id": 9, "user": {"login": BOT}, "body": cap.manual_notice(head="b" * 40)}
        self.assertTrue(cap.manual_notice_posted([notice]))
        self.assertFalse(cap.manual_notice_posted([marker(1)]))
        self.assertFalse(cap.manual_notice_posted(
            [{"id": 9, "user": {"login": "zanetaseiler"}, "body": "MANUAL_REVIEW_REQUIRED"}]))


class TestRun(unittest.TestCase):
    """`run` with GitHub stubbed out: what gets posted, and the verdict."""

    def setUp(self):
        self.posted = []
        self.state, self.comments = "open", []
        self.head = "c" * 40
        cap._get = lambda repo, path: {"state": self.state, "head": {"sha": self.head}}
        cap._comments = lambda repo, number: list(self.comments)
        cap._post = lambda repo, number, body: self.posted.append(body)
        cap._output = lambda **values: setattr(self, "out", values)

    def test_dispatch_writes_the_marker_first(self):
        cap.run("o/r", 5, 11, "c" * 40)
        self.assertEqual(self.out["go"], "true")
        self.assertEqual(len(self.posted), 1)
        self.assertIn("- review id: 11", self.posted[0])
        self.assertIn("1 of 2", self.posted[0])

    def test_capped_posts_manual_review_once(self):
        self.comments = [marker(1), marker(2)]
        cap.run("o/r", 5, 3, "c" * 40)
        self.assertEqual((self.out["action"], self.out["go"]), (cap.CAPPED, "false"))
        self.assertTrue(self.posted[0].startswith("MANUAL_REVIEW_REQUIRED"))
        self.comments.append({"id": 50, "user": {"login": BOT}, "body": self.posted[0]})
        cap.run("o/r", 5, 4, "d" * 40)
        self.assertEqual(len(self.posted), 1)

    def test_new_head_after_validation_does_not_consume_slot_or_post(self):
        self.head = "d" * 40
        cap.run("o/r", 5, 11, "c" * 40)
        self.assertEqual((self.out["action"], self.out["go"]), ("stale", "false"))
        self.assertEqual(self.posted, [])

    def test_closed_posts_nothing(self):
        self.state = "closed"
        cap.run("o/r", 5, 3, "c" * 40)
        self.assertEqual((self.out["action"], self.out["go"], self.posted), (cap.CLOSED, "false", []))


class TestWorkflow(unittest.TestCase):

    def setUp(self):
        self.text = (WORKFLOWS / "codex-feedback-to-claude.yml").read_text(encoding="utf-8")

    def test_cap_runs_before_labels_change_and_before_firing(self):
        t = self.text
        cap_at = t.index("harness_correction_cap.py")
        self.assertLess(cap_at, t.index("Clear stale Santiago handoff state"))
        self.assertLess(cap_at, t.index("READY_FOR_CLAUDE_CLOUD"))
        self.assertLess(cap_at, t.rindex("claude_cloud_bridge.py"))

    def test_every_mutating_step_is_gated_on_the_cap(self):
        for name in ("Clear stale Santiago handoff state", "Queue Claude correction",
                     "Refuse a second session", "Fire Claude correction directly"):
            start = self.text.index(name)
            gate = self.text[start:self.text.index("run:", start)]
            self.assertIn("steps.cap.outputs.go == 'true'", gate, name)

    def test_closed_pr_is_ignored_before_the_stale_review_guard(self):
        t = self.text
        self.assertLess(t.index("is ${pr_state}"), t.index("Ignoring stale Codex review"))
        self.assertIn("Ignoring stale Codex review", t)


if __name__ == "__main__":
    unittest.main()
