"""
Block 1C (Issue #105), corrected per Santiago's CHANGES_REQUESTED review on
PR #107: contract tests for
.github/workflows/claude-cloud-routine-bridge.yml -- the single,
repository-controlled GitHub Actions entry point that fires the Claude
cloud Routine on an exact `READY_FOR_CLAUDE_CLOUD` label event. Mirrors the
structural-assertion style
tests/isolation/test_agent_workflow_bootstrap.py::TestClaudeWorkflowIsPinnedAndLeastPrivilege
already uses for .github/workflows/claude-code.yml.

Text matching only, run entirely offline -- no workflow is executed.
"""

import re
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_PATH = REPO_ROOT / ".github" / "workflows" / "claude-cloud-routine-bridge.yml"
CLAUDE_CODE_WORKFLOW_PATH = REPO_ROOT / ".github" / "workflows" / "claude-code.yml"


def directives(text):
    """Every non-comment line, joined -- same convention as
    test_agent_workflow_bootstrap.py's own helper."""
    return "\n".join(line for line in text.splitlines()
                      if not line.lstrip().startswith("#"))


class TestWorkflowExists(unittest.TestCase):

    def test_file_exists(self):
        self.assertTrue(WORKFLOW_PATH.is_file())


class TestClaudeCodeWorkflowIsUntouched(unittest.TestCase):
    """This Block's own non-goal, restated as a test: do not modify
    .github/workflows/claude-code.yml."""

    def test_claude_code_workflow_still_only_answers_at_mentions(self):
        text = CLAUDE_CODE_WORKFLOW_PATH.read_text(encoding="utf-8")
        self.assertIn("contains(github.event.comment.body, '@claude')", text)
        self.assertNotIn("READY_FOR_CLAUDE_CLOUD", text)


class TestTriggersAreExactlyLabeledEvents(unittest.TestCase):

    def setUp(self):
        self.text = WORKFLOW_PATH.read_text(encoding="utf-8")
        self.live = directives(self.text)

    def test_triggers_are_issues_and_pull_request_labeled_only(self):
        triggers = self.text[self.text.index("\non:"):self.text.index("\npermissions:")]
        self.assertIn("issues:", triggers)
        self.assertIn("pull_request:", triggers)
        self.assertIn("types: [labeled]", triggers)

    def test_no_push_schedule_or_workflow_dispatch_trigger(self):
        triggers = self.text[self.text.index("\non:"):self.text.index("\npermissions:")]
        for forbidden in ("push:", "schedule:", "workflow_dispatch:", "workflow_run",
                          "issue_comment:"):
            self.assertNotIn(forbidden, triggers, forbidden)

    def test_job_gated_on_the_exact_queue_label(self):
        self.assertIn("github.event.label.name == 'READY_FOR_CLAUDE_CLOUD'", self.live)


class TestCheckoutNeverRunsUntrustedCode(unittest.TestCase):
    """Santiago's security finding on this exact file: `pull_request:
    labeled` fires with CLAUDE_ROUTINE_FIRE_TOKEN/GH_TOKEN already in the
    job environment, and a checkout step with no `ref:` can select the
    labeled PR's own (attacker-influenced) revision of
    scripts/claude_cloud_bridge.py. Every property below must hold or a
    labeled PR could exfiltrate live secrets."""

    def setUp(self):
        self.text = WORKFLOW_PATH.read_text(encoding="utf-8")
        self.live = directives(self.text)
        checkout_start = self.text.index("uses: actions/checkout@")
        checkout_end = self.text.index("\n\n", checkout_start)
        self.checkout_step = self.text[checkout_start:checkout_end]

    def test_checkout_is_pinned_to_a_full_commit_sha_not_a_tag(self):
        match = re.search(r"actions/checkout@([0-9a-f]+)", self.checkout_step)
        self.assertIsNotNone(match, "checkout must be referenced with an @-pin")
        sha = match.group(1)
        self.assertEqual(len(sha), 40, f"expected a full 40-character commit SHA, got {sha!r}")
        self.assertNotIn("actions/checkout@v4", self.live)
        self.assertNotIn("actions/checkout@main", self.live)

    def test_the_pin_provenance_is_documented(self):
        self.assertIn("ls-remote", self.text)

    def test_checkout_forces_the_trusted_default_branch_ref(self):
        """Applies to both `issues` and `pull_request` label events alike
        -- there is only one checkout step in this workflow, and its `ref:`
        must never be left to default (which would pick up the PR's own
        revision on a pull_request event)."""
        self.assertIn("ref: ${{ github.event.repository.default_branch }}",
                      self.checkout_step)

    def test_checkout_does_not_persist_a_credential(self):
        """The fire step already receives its own GH_TOKEN explicitly;
        checkout leaving a second credential in git config is unnecessary
        attack surface, not a capability this workflow uses."""
        self.assertIn("persist-credentials: false", self.checkout_step)


class TestIssuePrNumberRouting(unittest.TestCase):
    """Regression coverage for GitHub Actions run 33740930787: an `issues`
    event payload has no top-level `number` field (only `issue.number`) --
    only `pull_request` events carry one. Using the bare
    `github.event.number` resolves correctly for pull_request events but is
    empty for issues events, which run 33740930787 demonstrated in
    production: `claude_cloud_bridge.py --issue ""` failed with `invalid
    int value: ''`. Every reference to the item's number must instead use
    the event-aware fallback."""

    ROUTING_EXPR = "github.event.issue.number || github.event.pull_request.number"

    def setUp(self):
        self.text = WORKFLOW_PATH.read_text(encoding="utf-8")
        self.live = directives(self.text)

    def test_the_bare_broken_expression_never_appears_in_live_yaml(self):
        self.assertNotIn("github.event.number", self.live)

    def test_the_route_step_uses_the_event_aware_routing_expression(self):
        # The fire step then uses the routed Block target (harness_guard.py).
        route_step = self.text[self.text.index("Route the label to the Block's PR"):
                               self.text.index("\n  fire:")]
        self.assertIn(self.ROUTING_EXPR, route_step)
        fire_step = self.text[self.text.index("Fire Claude cloud Routine"):]
        self.assertIn("needs.route.outputs.target", fire_step)

    def test_the_concurrency_group_uses_the_same_routing_expression(self):
        block = self.text[self.text.index("\nconcurrency:"):self.text.index("\njobs:")]
        self.assertIn(self.ROUTING_EXPR, block)


class TestConcurrencyPreventsOverlap(unittest.TestCase):

    def setUp(self):
        self.text = WORKFLOW_PATH.read_text(encoding="utf-8")

    def test_concurrency_group_is_scoped_per_work_item(self):
        block = self.text[self.text.index("\nconcurrency:"):self.text.index("\njobs:")]
        self.assertIn("group:", block)
        self.assertIn("github.event.issue.number", block)
        self.assertIn("github.event.pull_request.number", block)

    def test_cancel_in_progress_is_false(self):
        block = self.text[self.text.index("\nconcurrency:"):self.text.index("\njobs:")]
        self.assertIn("cancel-in-progress: false", block)


class TestPermissionsAreMinimal(unittest.TestCase):

    def setUp(self):
        self.text = WORKFLOW_PATH.read_text(encoding="utf-8")

    def test_permissions_are_exactly_the_documented_minimal_set(self):
        block = self.text[self.text.index("\npermissions:"):
                          self.text.index("\nconcurrency:")]
        granted = dict(re.findall(r"^\s+([a-z-]+):\s*([a-z-]+)\s*$", block, re.MULTILINE))
        self.assertEqual(granted, {
            "contents": "read", "issues": "write", "pull-requests": "write",
        })

    def test_no_actions_or_write_scope_beyond_the_documented_set(self):
        block = self.text[self.text.index("\npermissions:"):
                          self.text.index("\nconcurrency:")]
        self.assertNotIn("actions:", block)
        self.assertNotIn("id-token:", block)


class TestSecretsAreReferencedNotCommitted(unittest.TestCase):

    def setUp(self):
        self.text = WORKFLOW_PATH.read_text(encoding="utf-8")
        self.live = directives(self.text)

    def test_both_secrets_are_referenced_by_name(self):
        self.assertIn("secrets.CLAUDE_ROUTINE_FIRE_URL", self.text)
        self.assertIn("secrets.CLAUDE_ROUTINE_FIRE_TOKEN", self.text)

    def test_no_literal_secret_value_is_committed(self):
        for forbidden_pattern in (r"CLAUDE_ROUTINE_FIRE_TOKEN:\s*[\"']?[A-Za-z0-9_-]{20,}",
                                  r"anthropic_api_key:\s*[\"']?sk-"):
            self.assertNotRegex(self.text, forbidden_pattern)

    def test_no_api_key_or_oauth_token_secret_is_referenced(self):
        """This bridge authenticates with its own narrow per-routine fire
        token only -- never the Claude CLI's own credentials. The header
        comment is free to name CLAUDE_CODE_OAUTH_TOKEN in prose (comparing
        this file's secret-gating posture to claude-code.yml's); what must
        never happen is an actual `secrets.*` reference to either name in
        the live YAML."""
        self.assertNotIn("secrets.ANTHROPIC_API_KEY", self.live)
        self.assertNotIn("secrets.CLAUDE_CODE_OAUTH_TOKEN", self.live)

    def test_the_fire_step_never_echoes_or_prints_a_secret(self):
        fire_step = self.text[self.text.index("Fire Claude cloud Routine"):]
        self.assertNotIn("echo $CLAUDE_ROUTINE_FIRE_TOKEN", fire_step)
        self.assertNotIn("echo ${{ secrets.CLAUDE_ROUTINE_FIRE_TOKEN", fire_step)


class TestNoAutomaticRetryOrConsequentialAction(unittest.TestCase):

    def setUp(self):
        self.text = WORKFLOW_PATH.read_text(encoding="utf-8")
        self.live = directives(self.text)

    def test_exactly_one_fire_invocation_in_the_job(self):
        self.assertEqual(self.live.count("claude_cloud_bridge.py"), 1)

    def test_no_retry_construct_in_the_live_yaml(self):
        for forbidden in ("retry", "Retry", "--retry"):
            self.assertNotIn(forbidden, self.live)

    def test_no_consequential_action_verb_in_the_live_yaml(self):
        lowered = self.live.lower()
        for forbidden in ("merge", "deploy", "publish"):
            self.assertNotIn(forbidden, lowered)

    def test_it_has_a_bounded_timeout(self):
        self.assertIn("timeout-minutes:", self.text)

    def test_only_the_route_and_fire_jobs(self):
        lines = self.live.splitlines()
        jobs_index = next(i for i, line in enumerate(lines) if line == "jobs:")
        headers = [
            line[2:-1] for i, line in enumerate(lines)
            if i > jobs_index and line.startswith("  ") and not line.startswith("   ")
            and line.endswith(":")
        ]
        # `route` only resolves the Block (Issue -> its open PR); `fire`
        # is still the one job that can fire the Routine.
        self.assertEqual(headers, ["route", "fire"])


if __name__ == "__main__":
    unittest.main()
