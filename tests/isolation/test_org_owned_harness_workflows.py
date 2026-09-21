"""Repository-owner safety checks for the Bona Fide harness workflows.

The proven harness originated in a user-owned repository. Bona Fide is owned by
an organization, so human-authored control comments must never be authenticated
by comparing the commenter to github.repository_owner.
"""

import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
READY = REPO_ROOT / ".github" / "workflows" / "santiago-ready-label-trigger.yml"
REQUEUE = REPO_ROOT / ".github" / "workflows" / "santiago-changes-requested-requeue.yml"


class TestOrganizationOwnedHarness(unittest.TestCase):

    def test_ready_trigger_does_not_treat_org_owner_as_human_login(self):
        text = READY.read_text(encoding="utf-8")
        self.assertNotIn("github.repository_owner", text)
        self.assertIn("vars.HARNESS_HUMAN_LOGIN", text)
        self.assertIn("AUTHORIZED_HUMAN:-zanetaseiler", text)

    def test_changes_requested_requeue_does_not_treat_org_owner_as_human_login(self):
        text = REQUEUE.read_text(encoding="utf-8")
        self.assertNotIn("github.repository_owner", text)
        self.assertIn("vars.HARNESS_HUMAN_LOGIN", text)
        self.assertIn("AUTHORIZED_HUMAN:-zanetaseiler", text)

    def test_ready_trigger_environment_entries_are_real_yaml_lines(self):
        text = READY.read_text(encoding="utf-8")
        expected = "COMMENT_BODY: ${{ github.event.comment.body || '' }}\n          COMMENTER:"
        self.assertIn(expected, text)
        self.assertNotIn("COMMENT_BODY: ${{ github.event.comment.body || '' }}\\n", text)

    def test_requeue_authorization_is_real_shell_lines(self):
        text = REQUEUE.read_text(encoding="utf-8")
        self.assertIn('authorized="${AUTHORIZED_HUMAN:-zanetaseiler}"\n', text)
        self.assertNotIn('authorized="${AUTHORIZED_HUMAN:-zanetaseiler}"\\n', text)


if __name__ == "__main__":
    unittest.main()
