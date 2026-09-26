"""
Offline coverage for scripts/claude_task_status.py -- the shared, read-only
GitHub protocol-event parsing library `scripts/claude_cloud_bridge.py`
depends on for its own per-(PR, head SHA, correction round) dispatch
idempotency (Issue #137).

Issue #171 (harness golden-path sync) retired this module's former
controller behavior (Block 1E's state-label/CURRENT-STATUS-comment/
notification machinery) -- see `scripts/claude_task_status.py`'s own module
docstring and `docs/HARNESS_GOLDEN_PATH.md`. This file was trimmed to match:
every test below exercises only what the module still contains (keyword
extraction, comment/review classification, chronological merge, correction-
round counting, and the two `gh`-wiring fetch functions). No real subprocess
is ever spawned -- every `gh_runner` here is a fake.
"""

import importlib.util
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = REPO_ROOT / "scripts" / "claude_task_status.py"

_spec = importlib.util.spec_from_file_location("claude_task_status", SCRIPT_PATH)
status_mod = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = status_mod
_spec.loader.exec_module(status_mod)


def comment(body, author="someone", comment_id=1, created_at=""):
    result = {"id": comment_id, "body": body, "user": {"login": author}}
    if created_at:
        result["created_at"] = created_at
    return result


def review(body, author="santiago", review_id=1, submitted_at=""):
    result = {"id": review_id, "body": body, "user": {"login": author}}
    if submitted_at:
        result["submitted_at"] = submitted_at
    return result


class TestWorkItem(unittest.TestCase):

    def test_unknown_kind_is_rejected(self):
        with self.assertRaises(status_mod.TaskStatusError):
            status_mod.WorkItem(kind="pull", number=1, repo="z/t")

    def test_issue_shape(self):
        item = status_mod.WorkItem(kind="issue", number=113, repo="z/t")
        self.assertEqual(item.label, "Issue")
        self.assertEqual(item.gh_subcommand, "issue")

    def test_pr_shape(self):
        item = status_mod.WorkItem(kind="pr", number=123, repo="z/t")
        self.assertEqual(item.label, "Pull Request")
        self.assertEqual(item.gh_subcommand, "pr")


class TestExtractKeyword(unittest.TestCase):

    def test_no_keyword_found(self):
        self.assertEqual(status_mod.extract_keyword("just some prose"), "")

    def test_single_keyword_line(self):
        self.assertEqual(
            status_mod.extract_keyword("READY_FOR_SANTIAGO\n\n- Block number: 113\n"),
            "READY_FOR_SANTIAGO")

    def test_keyword_must_be_a_standalone_line(self):
        """"CHANGES_REQUESTED" embedded in prose must not match -- only an
        exact, whitespace-stripped standalone line does, matching the
        protocol's own "as its own line" rule."""
        self.assertEqual(
            status_mod.extract_keyword("This references CHANGES_REQUESTED in passing.\n"), "")

    def test_last_keyword_wins_within_one_comment(self):
        """The correction-comment format posts CONTEXT_RECEIPT near the
        top, then READY_FOR_SANTIAGO later in the same body -- the second
        one is the comment's real, terminal state."""
        body = "CONTEXT_RECEIPT\n\n- some field\n\n...corrections...\n\nREADY_FOR_SANTIAGO\n\n- SHA\n"
        self.assertEqual(status_mod.extract_keyword(body), "READY_FOR_SANTIAGO")

    def test_bridge_keywords_are_recognized(self):
        self.assertEqual(
            status_mod.extract_keyword("ROUTINE_DISPATCHED\n\n- repo: z/t\n"),
            "ROUTINE_DISPATCHED")

    def test_keyword_quoted_inside_a_fenced_code_block_is_ignored(self):
        """Issue #137: a comment that merely quotes/documents the protocol
        format (e.g. pasting the NEEDS_ZANETA template verbatim as an
        example) inside a fenced code block must never be mistaken for a
        genuine terminal-state declaration."""
        body = (
            "For reference, here is the exact template:\n\n"
            "```\n"
            "NEEDS_ZANETA\n\n"
            "- exactly what decision, approval, or credential is needed\n"
            "```\n\n"
            "We are not actually escalating here -- just documenting the format."
        )
        self.assertEqual(status_mod.extract_keyword(body), "")

    def test_real_keyword_after_a_fenced_example_still_wins(self):
        """Fencing must suppress only the fenced text itself -- a genuine
        keyword line outside any fence, even one that follows a fenced
        example earlier in the same comment, must still be found."""
        body = (
            "```\n"
            "CHANGES_REQUESTED\n"
            "```\n\n"
            "READY_FOR_SANTIAGO\n\n"
            "- Block number: 137\n"
        )
        self.assertEqual(status_mod.extract_keyword(body), "READY_FOR_SANTIAGO")

    def test_arrow_annotated_sequence_mention_does_not_match(self):
        """A line documenting a sequence such as "... -> NEEDS_ZANETA"
        carries extra text on the same line, so it was already never an
        exact standalone match -- this is a regression guard for that
        specific example."""
        body = "Escalation path: any state -> NEEDS_ZANETA -> (Zaneta resolves...)\n"
        self.assertEqual(status_mod.extract_keyword(body), "")

    def test_unclosed_fence_suppresses_the_rest_of_the_body(self):
        """A malformed/truncated comment with an unclosed fence must fail
        closed (nothing after the fence start counts as a keyword line),
        never fail open."""
        body = "```\nNEEDS_ZANETA\nVERIFIED\n"
        self.assertEqual(status_mod.extract_keyword(body), "")


class TestCountCorrectionRounds(unittest.TestCase):

    def test_no_events_is_zero(self):
        self.assertEqual(status_mod.count_correction_rounds([]), 0)

    def test_counts_only_changes_requested_events(self):
        events = [
            status_mod.ProtocolEvent(author="claude", keyword="READY_FOR_SANTIAGO", body=""),
            status_mod.ProtocolEvent(author="santiago", keyword="CHANGES_REQUESTED", body=""),
            status_mod.ProtocolEvent(author="claude", keyword="READY_FOR_SANTIAGO", body=""),
            status_mod.ProtocolEvent(author="santiago", keyword="CHANGES_REQUESTED", body=""),
            status_mod.ProtocolEvent(author="santiago", keyword="VERIFIED", body=""),
        ]
        self.assertEqual(status_mod.count_correction_rounds(events), 2)


class TestCountPrCorrectionRounds(unittest.TestCase):

    def test_combines_comments_and_reviews(self):
        comments = [comment("READY_FOR_SANTIAGO\n\n- x\n", created_at="2026-01-01T00:00:00Z")]
        reviews = [review("CHANGES_REQUESTED\n\n- findings\n", submitted_at="2026-01-02T00:00:00Z")]
        self.assertEqual(status_mod.count_pr_correction_rounds(comments, reviews), 1)

    def test_empty_inputs_yield_zero(self):
        self.assertEqual(status_mod.count_pr_correction_rounds([], []), 0)

    def test_matches_manually_composed_pipeline(self):
        comments = [
            comment("READY_FOR_SANTIAGO\n\n- x\n", created_at="2026-01-01T00:00:00Z"),
            comment("CONTEXT_RECEIPT\n\n- y\n", created_at="2026-01-03T00:00:00Z"),
        ]
        reviews = [
            review("CHANGES_REQUESTED\n\n- a\n", submitted_at="2026-01-02T00:00:00Z"),
            review("CHANGES_REQUESTED\n\n- b\n", submitted_at="2026-01-04T00:00:00Z"),
        ]
        events = status_mod.merge_events_chronologically(
            status_mod.classify_comments(comments), status_mod.classify_reviews(reviews))
        self.assertEqual(
            status_mod.count_pr_correction_rounds(comments, reviews),
            status_mod.count_correction_rounds(events))


class TestClassifyComments(unittest.TestCase):

    def test_status_comment_itself_is_skipped(self):
        """A historical "CURRENT STATUS" comment from before the retirement
        of Block 1E's controller must still never be mistaken for a
        protocol event, even though nothing posts this comment anymore."""
        comments = [comment(status_mod.STATUS_MARKER + "\n\nCURRENT STATUS\n\nState: VERIFIED\n")]
        self.assertEqual(status_mod.classify_comments(comments), [])

    def test_non_protocol_comments_are_skipped(self):
        comments = [comment("just a regular remark")]
        self.assertEqual(status_mod.classify_comments(comments), [])

    def test_events_carry_author_and_keyword_in_order(self):
        comments = [
            comment("CONTEXT_RECEIPT\n\n- x\n", author="claude-bot"),
            comment("READY_FOR_SANTIAGO\n\n- x\n", author="claude-bot"),
        ]
        events = status_mod.classify_comments(comments)
        self.assertEqual([e.keyword for e in events],
                         ["CONTEXT_RECEIPT", "READY_FOR_SANTIAGO"])
        self.assertEqual(events[0].author, "claude-bot")

    def test_created_at_is_captured(self):
        comments = [comment("CONTEXT_RECEIPT\n\n- x\n", created_at="2026-01-01T00:00:00Z")]
        events = status_mod.classify_comments(comments)
        self.assertEqual(events[0].created_at, "2026-01-01T00:00:00Z")

    def test_missing_created_at_defaults_to_empty_string(self):
        events = status_mod.classify_comments([comment("CONTEXT_RECEIPT\n\n- x\n")])
        self.assertEqual(events[0].created_at, "")


class TestClassifyReviews(unittest.TestCase):
    """A genuine protocol review posted via GitHub's separate PR review API
    carries the same standalone-keyword-line convention a comment does --
    `classify_reviews` must recognize it the same way `classify_comments`
    recognizes a comment."""

    def test_review_with_no_keyword_is_skipped(self):
        self.assertEqual(status_mod.classify_reviews([review("just an approving nod")]), [])

    def test_review_with_recognized_keyword_becomes_an_event(self):
        reviews = [review(
            "SANTIAGO_REVIEW\n\nCHANGES_REQUESTED\n\n- x\n", author="santiago",
            submitted_at="2026-09-04T14:20:06Z")]
        events = status_mod.classify_reviews(reviews)
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].keyword, "CHANGES_REQUESTED")
        self.assertEqual(events[0].author, "santiago")
        self.assertEqual(events[0].created_at, "2026-09-04T14:20:06Z")

    def test_missing_submitted_at_defaults_to_empty_string(self):
        events = status_mod.classify_reviews([review("NEEDS_ZANETA\n\n- x\n")])
        self.assertEqual(events[0].created_at, "")

    def test_last_keyword_wins_within_one_review_body(self):
        body = "SANTIAGO_REVIEW\n\nNEEDS_ZANETA\n\n...\n\nVERIFIED\n"
        events = status_mod.classify_reviews([review(body)])
        self.assertEqual(events[0].keyword, "VERIFIED")

    def test_empty_list_yields_no_events(self):
        self.assertEqual(status_mod.classify_reviews([]), [])


class TestMergeEventsChronologically(unittest.TestCase):

    def _event(self, keyword, created_at=""):
        return status_mod.ProtocolEvent(author="a", keyword=keyword, body="", created_at=created_at)

    def test_interleaves_by_timestamp_regardless_of_list_order(self):
        early = self._event("CONTEXT_RECEIPT", "2026-01-01T00:00:00Z")
        middle = self._event("READY_FOR_SANTIAGO", "2026-01-01T00:05:00Z")
        late = self._event("CHANGES_REQUESTED", "2026-01-01T00:10:00Z")
        merged = status_mod.merge_events_chronologically([middle], [early, late])
        self.assertEqual([e.keyword for e in merged],
                          ["CONTEXT_RECEIPT", "READY_FOR_SANTIAGO", "CHANGES_REQUESTED"])

    def test_missing_timestamps_keep_relative_input_order(self):
        first = self._event("CONTEXT_RECEIPT")
        second = self._event("READY_FOR_SANTIAGO")
        merged = status_mod.merge_events_chronologically([first], [second])
        self.assertEqual([e.keyword for e in merged], ["CONTEXT_RECEIPT", "READY_FOR_SANTIAGO"])

    def test_merges_more_than_two_lists(self):
        a = self._event("CONTEXT_RECEIPT", "2026-01-01T00:00:00Z")
        b = self._event("NEEDS_ZANETA", "2026-01-01T00:20:00Z")
        c = self._event("READY_FOR_SANTIAGO", "2026-01-01T00:10:00Z")
        merged = status_mod.merge_events_chronologically([a], [b], [c])
        self.assertEqual([e.keyword for e in merged],
                          ["CONTEXT_RECEIPT", "READY_FOR_SANTIAGO", "NEEDS_ZANETA"])


class TestFetchComments(unittest.TestCase):

    def test_calls_paginated_issues_comments_endpoint(self):
        calls = []

        def gh_runner(argv):
            calls.append(argv)
            return "[]"

        item = status_mod.WorkItem(kind="pr", number=42, repo="z/t")
        result = status_mod.fetch_comments(item, gh_runner=gh_runner)
        self.assertEqual(result, [])
        self.assertEqual(
            calls, [["gh", "api", "repos/z/t/issues/42/comments", "--paginate"]])

    def test_returns_parsed_json(self):
        def gh_runner(argv):
            return '[{"id": 1, "body": "CONTEXT_RECEIPT\\n"}]'

        item = status_mod.WorkItem(kind="issue", number=1, repo="z/t")
        result = status_mod.fetch_comments(item, gh_runner=gh_runner)
        self.assertEqual(result[0]["id"], 1)


class TestFetchReviews(unittest.TestCase):

    def test_issue_never_spawns_a_call(self):
        calls = []

        def gh_runner(argv):
            calls.append(argv)
            return "[]"

        item = status_mod.WorkItem(kind="issue", number=113, repo="z/t")
        self.assertEqual(status_mod.fetch_reviews(item, gh_runner=gh_runner), [])
        self.assertEqual(calls, [])

    def test_pr_calls_paginated_reviews_endpoint(self):
        calls = []

        def gh_runner(argv):
            calls.append(argv)
            return "[]"

        item = status_mod.WorkItem(kind="pr", number=42, repo="z/t")
        status_mod.fetch_reviews(item, gh_runner=gh_runner)
        self.assertEqual(
            calls, [["gh", "api", "repos/z/t/pulls/42/reviews", "--paginate"]])


class TestRoundKeywordsWithTrailingText(unittest.TestCase):
    """trafficdom #221/#228 (2026-09-26): Santiago's and Žaneta's real
    comments carry text after the keyword on the same line."""

    def test_trailing_text_still_counts_as_a_round(self):
        for body, keyword in (
                ("CHANGES_REQUESTED — Santiago exact-SHA review of `1b63b35`\n\nBlocking.",
                 "CHANGES_REQUESTED"),
                ("ZANETA_DECISION — 2026-09-25\n\nApproved.", "ZANETA_DECISION"),
                ("**CHANGES_REQUESTED**: see below", "CHANGES_REQUESTED")):
            with self.subTest(body=body):
                self.assertEqual(status_mod.extract_keyword(body), keyword)

    def test_quoted_or_longer_words_do_not_count(self):
        handoff = "READY_FOR_SANTIAGO\n\n> CHANGES_REQUESTED — Santiago review\n"
        self.assertEqual(status_mod.extract_keyword(handoff), "READY_FOR_SANTIAGO")
        self.assertEqual(status_mod.extract_keyword("CHANGES_REQUESTED_LATER\n"), "")

    def test_rounds_counted_from_real_comments(self):
        events = status_mod.classify_comments([
            {"body": "CHANGES_REQUESTED — Santiago exact-SHA review of `0d59b28`", "created_at": "1"},
            {"body": "ZANETA_DECISION — 2026-09-25\n\nGo.", "created_at": "2"}])
        self.assertEqual(status_mod.count_correction_rounds(events), 2)


if __name__ == "__main__":
    unittest.main()
