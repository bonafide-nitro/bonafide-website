"""
Offline coverage for .github/scripts/harness_label_reconciler.py and
.github/workflows/harness-label-reconciler.yml -- the periodic,
eventual-consistency fallback half of Issue #171's "Close/merge hygiene"
layer. Every test runs against a fake `gh_runner`; no real subprocess is
spawned, no real GitHub write happens.
"""

import importlib.util
import json
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = REPO_ROOT / ".github" / "scripts" / "harness_label_reconciler.py"
WORKFLOW_PATH = REPO_ROOT / ".github" / "workflows" / "harness-label-reconciler.yml"

_spec = importlib.util.spec_from_file_location("harness_label_reconciler", SCRIPT_PATH)
reconciler_mod = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = reconciler_mod
_spec.loader.exec_module(reconciler_mod)


def issue_entry(number, label_names):
    return {"number": number, "labels": [{"name": n} for n in label_names]}


def make_gh_runner(*, issues, prs, calls=None, view_states=None):
    """`view_states` maps `number -> state` (upper- or lower-case) for the
    per-item `view --json state` re-check `sweep` makes immediately before
    a write; a number with no entry answers `"CLOSED"`, matching the list
    snapshot's own implicit assumption unless a test says otherwise."""
    view_states = view_states or {}

    def runner(argv):
        if calls is not None:
            calls.append(argv)
        if any("/issues?" in arg for arg in argv):
            return json.dumps(issues)
        if any("/pulls?" in arg for arg in argv):
            return json.dumps(prs)
        if "view" in argv:
            number = int(argv[argv.index("view") + 1])
            state = view_states.get(number, "CLOSED")
            return json.dumps({"state": state})
        return ""
    return runner


class TestFetchClosedItems(unittest.TestCase):

    def test_fetch_closed_issues_paginates_the_rest_endpoint(self):
        calls = []

        def gh_runner(argv):
            calls.append(argv)
            return "[]"

        reconciler_mod.fetch_closed_issues("z/t", gh_runner=gh_runner)
        self.assertEqual(calls, [[
            "gh", "api", "--paginate", "repos/z/t/issues?state=closed&per_page=100",
        ]])

    def test_fetch_closed_issues_excludes_pull_requests(self):
        """GitHub's REST `/issues` endpoint also returns pull requests --
        those must be filtered out so `fetch_closed_prs` is the only source
        of PR entries, never double-counting one."""
        raw = json.dumps([
            {"number": 1, "labels": [{"name": "VERIFIED"}]},
            {"number": 2, "labels": [{"name": "CLAUDE_WORKING"}], "pull_request": {}},
        ])
        entries = reconciler_mod.fetch_closed_issues("z/t", gh_runner=lambda argv: raw)
        self.assertEqual(entries, [{"number": 1, "labels": [{"name": "VERIFIED"}]}])

    def test_fetch_closed_prs_paginates_the_rest_endpoint(self):
        calls = []

        def gh_runner(argv):
            calls.append(argv)
            return "[]"

        reconciler_mod.fetch_closed_prs("z/t", gh_runner=gh_runner)
        self.assertEqual(calls, [[
            "gh", "api", "--paginate", "repos/z/t/pulls?state=closed&per_page=100",
        ]])

    def test_fetch_closed_prs_includes_merged_prs(self):
        """Codex review finding (PR #172, discussion_r4005216707): `gh pr
        list --state closed` never returned a merged PR at all, since gh's
        own CLI-level `--state` filter treats `closed` and `merged` as
        distinct values. GitHub's REST `/pulls` endpoint has no such
        split -- a merged PR's own `state` field is still `closed` -- so a
        merged PR must come back from this call with no special-casing."""
        raw = json.dumps([
            {
                "number": 3,
                "labels": [{"name": "READY_FOR_SANTIAGO"}],
                "state": "closed",
                "merged_at": "2026-09-14T12:00:00Z",
            },
        ])
        entries = reconciler_mod.fetch_closed_prs("z/t", gh_runner=lambda argv: raw)
        self.assertEqual(entries, [{"number": 3, "labels": [{"name": "READY_FOR_SANTIAGO"}]}])

    def test_fetch_closed_issues_flattens_multiple_paginated_pages(self):
        """Codex review finding (PR #172, discussion_r4005569175): past the
        first page, `gh api --paginate` writes each page as its own
        separate top-level JSON array back-to-back on stdout rather than
        combining them -- a plain `json.loads` on that raw output raises
        `JSONDecodeError: Extra data` as soon as there is more than one
        page. Both pages' entries must still come back combined."""
        page_1 = json.dumps([{"number": 1, "labels": [{"name": "VERIFIED"}]}])
        page_2 = json.dumps([{"number": 2, "labels": [{"name": "CLAUDE_WORKING"}]}])
        raw = page_1 + page_2
        entries = reconciler_mod.fetch_closed_issues("z/t", gh_runner=lambda argv: raw)
        self.assertEqual(entries, [
            {"number": 1, "labels": [{"name": "VERIFIED"}]},
            {"number": 2, "labels": [{"name": "CLAUDE_WORKING"}]},
        ])

    def test_fetch_closed_prs_flattens_multiple_paginated_pages_with_whitespace(self):
        """Same defect as above, exercised on the PR fetch, with the
        realistic case of a newline gh emits between concatenated pages."""
        page_1 = json.dumps([{"number": 10, "labels": []}])
        page_2 = json.dumps([{"number": 20, "labels": [{"name": "READY_FOR_SANTIAGO"}]}])
        raw = f"{page_1}\n{page_2}\n"
        entries = reconciler_mod.fetch_closed_prs("z/t", gh_runner=lambda argv: raw)
        self.assertEqual(entries, [
            {"number": 10, "labels": []},
            {"number": 20, "labels": [{"name": "READY_FOR_SANTIAGO"}]},
        ])

    def test_fetch_closed_issues_handles_empty_paginated_output(self):
        entries = reconciler_mod.fetch_closed_issues("z/t", gh_runner=lambda argv: "")
        self.assertEqual(entries, [])


class TestLoadPaginatedJson(unittest.TestCase):

    def test_single_page_array(self):
        raw = json.dumps([{"a": 1}, {"a": 2}])
        self.assertEqual(reconciler_mod._load_paginated_json(raw), [{"a": 1}, {"a": 2}])

    def test_multiple_concatenated_page_arrays(self):
        raw = json.dumps([{"a": 1}]) + json.dumps([{"a": 2}, {"a": 3}])
        self.assertEqual(
            reconciler_mod._load_paginated_json(raw), [{"a": 1}, {"a": 2}, {"a": 3}])

    def test_blank_input_yields_empty_list(self):
        self.assertEqual(reconciler_mod._load_paginated_json(""), [])
        self.assertEqual(reconciler_mod._load_paginated_json(None), [])
        self.assertEqual(reconciler_mod._load_paginated_json("   \n  "), [])


class TestFetchCurrentState(unittest.TestCase):

    def test_reads_and_upper_cases_state_for_issue(self):
        calls = []
        gh_runner = make_gh_runner(issues=[], prs=[], calls=calls, view_states={1: "closed"})
        state = reconciler_mod.fetch_current_state("issue", 1, "z/t", gh_runner=gh_runner)
        self.assertEqual(state, "CLOSED")
        self.assertEqual(calls, [["gh", "issue", "view", "1", "--repo", "z/t", "--json", "state"]])

    def test_reads_pr_state_via_pr_subcommand(self):
        calls = []
        gh_runner = make_gh_runner(issues=[], prs=[], calls=calls, view_states={2: "MERGED"})
        state = reconciler_mod.fetch_current_state("pr", 2, "z/t", gh_runner=gh_runner)
        self.assertEqual(state, "MERGED")
        self.assertEqual(calls, [["gh", "pr", "view", "2", "--repo", "z/t", "--json", "state"]])


class TestRemoveLabels(unittest.TestCase):

    def test_empty_labels_makes_no_call(self):
        calls = []
        reconciler_mod.remove_labels(
            "issue", 1, "z/t", [], gh_runner=lambda argv: calls.append(argv))
        self.assertEqual(calls, [])

    def test_one_call_per_item_removes_every_label(self):
        calls = []
        reconciler_mod.remove_labels(
            "pr", 42, "z/t", ["CLAUDE_WORKING", "READY_FOR_SANTIAGO"],
            gh_runner=lambda argv: calls.append(argv))
        self.assertEqual(calls, [[
            "gh", "pr", "edit", "42", "--repo", "z/t",
            "--remove-label", "CLAUDE_WORKING",
            "--remove-label", "READY_FOR_SANTIAGO",
        ]])


class TestSweep(unittest.TestCase):

    def test_clean_repo_yields_no_changes_and_no_edit_calls(self):
        calls = []
        gh_runner = make_gh_runner(
            issues=[issue_entry(1, ["VERIFIED"])],
            prs=[issue_entry(2, ["bug"])],
            calls=calls,
        )
        changes = reconciler_mod.sweep("z/t", gh_runner=gh_runner)
        self.assertEqual(changes, [])
        self.assertEqual([c for c in calls if "edit" in c], [])

    def test_dirty_issue_and_pr_both_get_cleaned(self):
        calls = []
        gh_runner = make_gh_runner(
            issues=[issue_entry(1, ["READY_FOR_CLAUDE_CLOUD", "VERIFIED"])],
            prs=[issue_entry(2, ["CLAUDE_STALLED"])],
            calls=calls,
        )
        changes = reconciler_mod.sweep("z/t", gh_runner=gh_runner)
        self.assertEqual(
            sorted(changes),
            [("issue", 1, ["READY_FOR_CLAUDE_CLOUD"]), ("pr", 2, ["CLAUDE_STALLED"])])
        edit_calls = [c for c in calls if "edit" in c]
        self.assertEqual(len(edit_calls), 2)

    def test_dry_run_reports_but_never_writes(self):
        calls = []
        gh_runner = make_gh_runner(
            issues=[issue_entry(1, ["SANTIAGO_STALLED"])],
            prs=[],
            calls=calls,
        )
        changes = reconciler_mod.sweep("z/t", gh_runner=gh_runner, dry_run=True)
        self.assertEqual(changes, [("issue", 1, ["SANTIAGO_STALLED"])])
        self.assertEqual([c for c in calls if "edit" in c], [])

    def test_never_removes_durable_or_ordinary_labels(self):
        calls = []
        gh_runner = make_gh_runner(
            issues=[issue_entry(1, ["VERIFIED", "COMPLETED", "molosoc"])],
            prs=[],
            calls=calls,
        )
        changes = reconciler_mod.sweep("z/t", gh_runner=gh_runner)
        self.assertEqual(changes, [])

    def test_merged_pr_still_gets_cleaned(self):
        """A merged PR reports `MERGED`, not `CLOSED`, from the per-item
        re-check -- `sweep` must treat it the same as an ordinary close."""
        calls = []
        gh_runner = make_gh_runner(
            issues=[],
            prs=[issue_entry(2, ["READY_FOR_SANTIAGO"])],
            calls=calls,
            view_states={2: "MERGED"},
        )
        changes = reconciler_mod.sweep("z/t", gh_runner=gh_runner)
        self.assertEqual(changes, [("pr", 2, ["READY_FOR_SANTIAGO"])])
        edit_calls = [c for c in calls if "edit" in c]
        self.assertEqual(len(edit_calls), 1)

    def test_item_reopened_since_the_list_snapshot_is_never_written(self):
        """Codex review finding (PR #172, discussion_r4005097088): a
        scheduled sweep's own `--state closed` list snapshot can go stale
        before the write -- an item reopened in between must be skipped
        entirely, not have its transient labels stripped."""
        calls = []
        gh_runner = make_gh_runner(
            issues=[issue_entry(1, ["READY_FOR_CLAUDE_CLOUD"])],
            prs=[issue_entry(2, ["READY_FOR_SANTIAGO"])],
            calls=calls,
            view_states={1: "open", 2: "OPEN"},
        )
        changes = reconciler_mod.sweep("z/t", gh_runner=gh_runner)
        self.assertEqual(changes, [])
        self.assertEqual([c for c in calls if "edit" in c], [])
        # The live re-check itself must still happen for each candidate item.
        view_calls = [c for c in calls if "view" in c]
        self.assertEqual(len(view_calls), 2)

    def test_dry_run_never_issues_the_live_recheck(self):
        """`dry_run` reports off the list snapshot alone -- it makes no
        write, so there is nothing for the re-check to protect."""
        calls = []
        gh_runner = make_gh_runner(
            issues=[issue_entry(1, ["SANTIAGO_STALLED"])],
            prs=[],
            calls=calls,
        )
        reconciler_mod.sweep("z/t", gh_runner=gh_runner, dry_run=True)
        self.assertEqual([c for c in calls if "view" in c], [])


class TestWorkflowExists(unittest.TestCase):

    def test_workflow_file_exists(self):
        self.assertTrue(WORKFLOW_PATH.exists())

    def test_workflow_triggers_on_schedule_and_workflow_dispatch_only(self):
        text = WORKFLOW_PATH.read_text(encoding="utf-8")
        triggers = text[text.index("\non:"):text.index("\npermissions:")]
        self.assertIn("schedule:", triggers)
        self.assertIn("workflow_dispatch:", triggers)
        self.assertNotIn("push:", triggers)
        self.assertNotIn("labeled", triggers)
        self.assertNotIn("issue_comment", triggers)

    def test_workflow_pins_checkout_to_default_branch_and_no_persisted_credentials(self):
        text = WORKFLOW_PATH.read_text(encoding="utf-8")
        self.assertIn("ref: ${{ github.event.repository.default_branch }}", text)
        self.assertIn("persist-credentials: false", text)

    def test_workflow_never_references_the_queue_label_or_the_bridge_script(self):
        text = WORKFLOW_PATH.read_text(encoding="utf-8")
        directives = "\n".join(
            line for line in text.splitlines() if not line.lstrip().startswith("#"))
        self.assertNotIn("claude_cloud_bridge", directives)
        self.assertNotIn("add-label", directives)


if __name__ == "__main__":
    unittest.main()
