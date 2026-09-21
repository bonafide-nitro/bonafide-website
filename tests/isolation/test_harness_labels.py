"""
Offline coverage for .github/scripts/harness_labels.py -- the shared,
pure label vocabulary Issue #171's close/merge cleanup and reconciler
scripts both remove from. See docs/HARNESS_GOLDEN_PATH.md for the full
contract this enforces.
"""

import importlib.util
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = REPO_ROOT / ".github" / "scripts" / "harness_labels.py"

_spec = importlib.util.spec_from_file_location("harness_labels", SCRIPT_PATH)
labels_mod = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = labels_mod
_spec.loader.exec_module(labels_mod)


class TestIsRetired(unittest.TestCase):

    def test_every_named_retired_label_is_recognized(self):
        for name in (
            "CHANGES_REQUESTED", "SANTIAGO_REVIEWING", "WORK_IN_PROGRESS",
            "SANTIAGO_STALLED", "CLAUDE_DISPATCHED", "CLAUDE_WORKING",
            "CLAUDE_STALLED", "NEEDS_ZANETA", "CORRECTION_IN_PROGRESS",
        ):
            with self.subTest(label=name):
                self.assertTrue(labels_mod.is_retired(name))

    def test_controller_prefixed_labels_are_retired(self):
        for name in ("controller:READY_FOR_CLAUDE",
                     "controller:READY_FOR_CLAUDE_CLOUD",
                     "controller:READY_FOR_SANTIAGO",
                     "controller:anything-at-all"):
            with self.subTest(label=name):
                self.assertTrue(labels_mod.is_retired(name))

    def test_durable_labels_are_never_retired(self):
        self.assertFalse(labels_mod.is_retired("VERIFIED"))
        self.assertFalse(labels_mod.is_retired("COMPLETED"))

    def test_transient_labels_are_not_themselves_retired(self):
        """Transient labels are removable for a different reason
        (membership in TRANSIENT_LABELS) -- `is_retired` itself must not
        also claim them, so the two categories stay independently
        auditable."""
        self.assertFalse(labels_mod.is_retired("READY_FOR_CLAUDE_CLOUD"))
        self.assertFalse(labels_mod.is_retired("READY_FOR_SANTIAGO"))

    def test_ordinary_product_label_is_not_retired(self):
        for name in ("bug", "molosoc", "zoe", "enhancement"):
            with self.subTest(label=name):
                self.assertFalse(labels_mod.is_retired(name))


class TestLabelsToRemove(unittest.TestCase):

    def test_empty_input_yields_empty_output(self):
        self.assertEqual(labels_mod.labels_to_remove([]), [])

    def test_removes_transient_labels(self):
        self.assertEqual(
            labels_mod.labels_to_remove(["READY_FOR_CLAUDE_CLOUD", "READY_FOR_SANTIAGO"]),
            ["READY_FOR_CLAUDE_CLOUD", "READY_FOR_SANTIAGO"])

    def test_removes_retired_labels(self):
        self.assertEqual(
            labels_mod.labels_to_remove(["CLAUDE_WORKING", "SANTIAGO_STALLED"]),
            ["CLAUDE_WORKING", "SANTIAGO_STALLED"])

    def test_removes_controller_prefixed_labels(self):
        self.assertEqual(
            labels_mod.labels_to_remove(["controller:READY_FOR_CLAUDE_CLOUD"]),
            ["controller:READY_FOR_CLAUDE_CLOUD"])

    def test_never_removes_durable_labels(self):
        self.assertEqual(labels_mod.labels_to_remove(["VERIFIED", "COMPLETED"]), [])

    def test_never_removes_ordinary_labels(self):
        self.assertEqual(labels_mod.labels_to_remove(["bug", "molosoc"]), [])

    def test_mixed_label_set_removes_only_the_removable_members(self):
        current = ["VERIFIED", "bug", "READY_FOR_CLAUDE_CLOUD", "CLAUDE_WORKING",
                   "controller:READY_FOR_SANTIAGO"]
        self.assertEqual(
            labels_mod.labels_to_remove(current),
            ["CLAUDE_WORKING", "READY_FOR_CLAUDE_CLOUD", "controller:READY_FOR_SANTIAGO"])

    def test_already_clean_list_yields_nothing(self):
        """The idempotency guarantee both callers rely on to perform zero
        `gh` writes on a repeated run."""
        self.assertEqual(labels_mod.labels_to_remove(["VERIFIED", "bug"]), [])

    def test_result_is_sorted(self):
        current = ["SANTIAGO_STALLED", "CLAUDE_WORKING", "CHANGES_REQUESTED"]
        self.assertEqual(labels_mod.labels_to_remove(current), sorted(current))


if __name__ == "__main__":
    unittest.main()
