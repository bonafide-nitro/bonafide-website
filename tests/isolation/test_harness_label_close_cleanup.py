"""
Offline coverage for .github/scripts/harness_label_close_cleanup.py and
.github/workflows/harness-label-close-cleanup.yml -- the event-driven half
of Issue #171's "Close/merge hygiene" layer. Every test runs against a fake
`gh_runner`; no real subprocess is spawned, no real GitHub write happens.
"""

import importlib.util
import json
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = REPO_ROOT / ".github" / "scripts" / "harness_label_close_cleanup.py"
WORKFLOW_PATH = REPO_ROOT / ".github" / "workflows" / "harness-label-close-cleanup.yml"

_spec = importlib.util.spec_from_file_location("harness_label_close_cleanup", SCRIPT_PATH)
cleanup_mod = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = cleanup_mod
_spec.loader.exec_module(cleanup_mod)


def make_gh_runner(*, view_response, calls=None):
    """A fake gh_runner(argv) that answers the one `... view` call with
    `view_response` (already-JSON-encoded) and records every call verbatim,
    returning "" for anything else (the edit call)."""
    def runner(argv):
        if calls is not None:
            calls.append(argv)
        if "view" in argv:
            return view_response
        return ""
    return runner


class TestWorkItem(unittest.TestCase):

    def test_unknown_kind_is_rejected(self):
        with self.assertRaises(cleanup_mod.CloseCleanupError):
            cleanup_mod.WorkItem(kind="pull", number=1, repo="z/t")

    def test_issue_shape(self):
        item = cleanup_mod.WorkItem(kind="issue", number=113, repo="z/t")
        self.assertEqual(item.gh_subcommand, "issue")

    def test_pr_shape(self):
        item = cleanup_mod.WorkItem(kind="pr", number=123, repo="z/t")
        self.assertEqual(item.gh_subcommand, "pr")


class TestFetchLabelsAndState(unittest.TestCase):

    def test_parses_labels_and_upper_cases_state(self):
        payload = json.dumps({
            "labels": [{"name": "READY_FOR_CLAUDE_CLOUD"}, {"name": "bug"}],
            "state": "closed",
        })
        item = cleanup_mod.WorkItem(kind="pr", number=1, repo="z/t")
        labels, state = cleanup_mod.fetch_labels_and_state(
            item, gh_runner=lambda argv: payload)
        self.assertEqual(labels, ["READY_FOR_CLAUDE_CLOUD", "bug"])
        self.assertEqual(state, "CLOSED")


class TestRemoveLabels(unittest.TestCase):

    def test_empty_labels_makes_no_call(self):
        calls = []
        item = cleanup_mod.WorkItem(kind="issue", number=1, repo="z/t")
        cleanup_mod.remove_labels(item, [], gh_runner=lambda argv: calls.append(argv))
        self.assertEqual(calls, [])

    def test_one_call_removes_every_label(self):
        calls = []
        item = cleanup_mod.WorkItem(kind="pr", number=42, repo="z/t")
        cleanup_mod.remove_labels(
            item, ["CLAUDE_WORKING", "READY_FOR_CLAUDE_CLOUD"],
            gh_runner=lambda argv: calls.append(argv))
        self.assertEqual(calls, [[
            "gh", "pr", "edit", "42", "--repo", "z/t",
            "--remove-label", "CLAUDE_WORKING",
            "--remove-label", "READY_FOR_CLAUDE_CLOUD",
        ]])


class TestCleanItem(unittest.TestCase):

    def test_closed_item_with_removable_labels_gets_cleaned(self):
        calls = []
        payload = json.dumps({
            "labels": [{"name": "READY_FOR_SANTIAGO"}, {"name": "VERIFIED"}],
            "state": "closed",
        })
        item = cleanup_mod.WorkItem(kind="pr", number=7, repo="z/t")
        removed = cleanup_mod.clean_item(item, gh_runner=make_gh_runner(
            view_response=payload, calls=calls))
        self.assertEqual(removed, ["READY_FOR_SANTIAGO"])
        edit_calls = [c for c in calls if "edit" in c]
        self.assertEqual(len(edit_calls), 1)
        self.assertIn("READY_FOR_SANTIAGO", edit_calls[0])
        self.assertNotIn("VERIFIED", edit_calls[0])

    def test_open_item_is_never_touched(self):
        """Defense in depth: a race between the triggering `closed` webhook
        and this run (the item was reopened in between) must never write
        anything."""
        calls = []
        payload = json.dumps({"labels": [{"name": "READY_FOR_CLAUDE_CLOUD"}], "state": "open"})
        item = cleanup_mod.WorkItem(kind="issue", number=9, repo="z/t")
        removed = cleanup_mod.clean_item(item, gh_runner=make_gh_runner(
            view_response=payload, calls=calls))
        self.assertEqual(removed, [])
        self.assertEqual([c for c in calls if "edit" in c], [])

    def test_already_clean_closed_item_makes_no_edit_call(self):
        calls = []
        payload = json.dumps({"labels": [{"name": "VERIFIED"}, {"name": "bug"}], "state": "closed"})
        item = cleanup_mod.WorkItem(kind="pr", number=3, repo="z/t")
        removed = cleanup_mod.clean_item(item, gh_runner=make_gh_runner(
            view_response=payload, calls=calls))
        self.assertEqual(removed, [])
        self.assertEqual([c for c in calls if "edit" in c], [])

    def test_never_removes_durable_or_ordinary_labels(self):
        calls = []
        payload = json.dumps({
            "labels": [{"name": "VERIFIED"}, {"name": "molosoc"},
                       {"name": "CLAUDE_STALLED"}],
            "state": "closed",
        })
        item = cleanup_mod.WorkItem(kind="issue", number=11, repo="z/t")
        removed = cleanup_mod.clean_item(item, gh_runner=make_gh_runner(
            view_response=payload, calls=calls))
        self.assertEqual(removed, ["CLAUDE_STALLED"])

    def test_merged_pr_gets_cleaned_too(self):
        """Codex review finding (PR #172, discussion_r4005097081): a merged
        PR's own `state` reports as `MERGED`, not `CLOSED` -- the guard must
        treat both alike for a PR rather than silently skipping every
        merge."""
        calls = []
        payload = json.dumps({
            "labels": [{"name": "READY_FOR_CLAUDE_CLOUD"}, {"name": "VERIFIED"}],
            "state": "MERGED",
        })
        item = cleanup_mod.WorkItem(kind="pr", number=13, repo="z/t")
        removed = cleanup_mod.clean_item(item, gh_runner=make_gh_runner(
            view_response=payload, calls=calls))
        self.assertEqual(removed, ["READY_FOR_CLAUDE_CLOUD"])
        edit_calls = [c for c in calls if "edit" in c]
        self.assertEqual(len(edit_calls), 1)


class TestNoLoopTriggerSideEffects(unittest.TestCase):
    """This module must never add a label, post a comment, reopen an item,
    or touch READY_FOR_CLAUDE_CLOUD/READY_FOR_SANTIAGO in a way that could
    re-trigger claude-cloud-routine-bridge.yml or santiago-ready-label-
    trigger.yml -- both only react to a label being *added*, never removed,
    so a removal-only `--remove-label` call can never do that; this test
    guards that no other gh subcommand ever appears at all."""

    def test_only_view_and_edit_subcommands_are_ever_issued(self):
        calls = []
        payload = json.dumps({"labels": [{"name": "READY_FOR_CLAUDE_CLOUD"}], "state": "closed"})
        item = cleanup_mod.WorkItem(kind="pr", number=5, repo="z/t")
        cleanup_mod.clean_item(item, gh_runner=make_gh_runner(view_response=payload, calls=calls))
        for call in calls:
            self.assertIn(call[1], ("issue", "pr"))
            self.assertIn(call[2], ("view", "edit"))
        self.assertNotIn("comment", " ".join(" ".join(c) for c in calls))
        self.assertNotIn("--add-label", " ".join(" ".join(c) for c in calls))
        self.assertNotIn("reopen", " ".join(" ".join(c) for c in calls))


class TestWorkflowExists(unittest.TestCase):

    def test_workflow_file_exists(self):
        self.assertTrue(WORKFLOW_PATH.exists())

    def test_workflow_triggers_on_issue_and_pr_closed_only(self):
        text = WORKFLOW_PATH.read_text(encoding="utf-8")
        triggers = text[text.index("\non:"):text.index("\npermissions:")]
        self.assertIn("issues:", triggers)
        self.assertIn("pull_request:", triggers)
        self.assertIn("closed", triggers)
        self.assertNotIn("push:", triggers)
        self.assertNotIn("schedule:", triggers)
        self.assertNotIn("labeled", triggers)

    def test_workflow_pins_checkout_to_default_branch_and_no_persisted_credentials(self):
        text = WORKFLOW_PATH.read_text(encoding="utf-8")
        self.assertIn("ref: ${{ github.event.repository.default_branch }}", text)
        self.assertIn("persist-credentials: false", text)

    def test_workflow_never_references_the_queue_label_or_the_bridge_script(self):
        """This workflow must never be able to interact with
        claude-cloud-routine-bridge.yml's own READY_FOR_CLAUDE_CLOUD
        trigger."""
        text = WORKFLOW_PATH.read_text(encoding="utf-8")
        directives = "\n".join(
            line for line in text.splitlines() if not line.lstrip().startswith("#"))
        self.assertNotIn("claude_cloud_bridge", directives)
        self.assertNotIn("add-label", directives)


if __name__ == "__main__":
    unittest.main()
