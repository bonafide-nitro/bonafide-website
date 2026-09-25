"""Regression tests for the Block 0B Santiago handoff workflow repair.

The ported Bona Fide copies of these workflows previously contained a literal
line break inside `printf '%s\\n'` format strings (a real newline character
where the TrafficDom source has the two-character `\\n` escape sequence).
That literal break drops the continuation line's indentation below the
`run: |` block scalar's established indentation, which GitHub treats as an
invalid workflow (it fails immediately with zero jobs). These tests pin the
fixed, single-line form and guard the block-scalar indentation directly, with
no dependency on a YAML parser being available in the test environment.
"""

import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
READY = REPO_ROOT / ".github" / "workflows" / "santiago-ready-label-trigger.yml"
REQUEUE = REPO_ROOT / ".github" / "workflows" / "santiago-changes-requested-requeue.yml"


def _run_block_indents(text):
    """Yield the leading-space count of every non-blank line following each
    `run: |` block header, stopping at the first line that de-indents back to
    (or past) the block header's own indentation -- i.e. where the block
    scalar ends."""
    lines = text.splitlines()
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped != "run: |":
            continue
        header_indent = len(line) - len(line.lstrip(" "))
        block_indents = []
        for cont in lines[i + 1:]:
            if cont.strip() == "":
                continue
            indent = len(cont) - len(cont.lstrip(" "))
            if indent <= header_indent:
                break
            block_indents.append(indent)
        yield block_indents


class TestSantiagoWorkflowYamlValidity(unittest.TestCase):
    def test_ready_trigger_run_block_indentation_never_dips(self):
        text = READY.read_text(encoding="utf-8")
        blocks = list(_run_block_indents(text))
        self.assertTrue(blocks, "expected at least one 'run: |' block")
        for indents in blocks:
            base = indents[0]
            for indent in indents:
                self.assertGreaterEqual(
                    indent, base,
                    f"a run-block line dips below the block's own indentation ({indent} < {base}), "
                    "which breaks the YAML block scalar",
                )

    def test_requeue_run_block_indentation_never_dips(self):
        text = REQUEUE.read_text(encoding="utf-8")
        blocks = list(_run_block_indents(text))
        self.assertTrue(blocks, "expected at least one 'run: |' block")
        for indents in blocks:
            base = indents[0]
            for indent in indents:
                self.assertGreaterEqual(
                    indent, base,
                    f"a run-block line dips below the block's own indentation ({indent} < {base}), "
                    "which breaks the YAML block scalar",
                )

    def test_ready_trigger_printf_newline_is_escaped_on_one_line(self):
        # Handoff parsing moved into .github/scripts/harness_handoff.py (the
        # shared kit, docs/HARNESS_TEMPLATE.md); the workflow must still never
        # carry a literal line break inside a printf format string.
        text = READY.read_text(encoding="utf-8")
        self.assertIn(".github/scripts/harness_handoff.py", text)
        self.assertNotIn("printf '%s\n", text)

    def test_requeue_printf_newline_is_escaped_on_one_line(self):
        text = REQUEUE.read_text(encoding="utf-8")
        self.assertIn(
            'printf \'%s\\n\' "$COMMENT_BODY" | sed \'/^[[:space:]]*$/d\' | head -n1 | xargs',
            text,
        )
        self.assertNotIn("printf '%s\n", text)

    def test_ready_trigger_parses_as_yaml_when_pyyaml_available(self):
        try:
            import yaml
        except ImportError:
            self.skipTest("PyYAML not installed in this environment")
        with READY.open(encoding="utf-8") as fh:
            yaml.safe_load(fh)

    def test_requeue_parses_as_yaml_when_pyyaml_available(self):
        try:
            import yaml
        except ImportError:
            self.skipTest("PyYAML not installed in this environment")
        with REQUEUE.open(encoding="utf-8") as fh:
            yaml.safe_load(fh)


if __name__ == "__main__":
    unittest.main()
