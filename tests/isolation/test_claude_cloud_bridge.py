"""
Block 1C (Issue #105), corrected per Santiago's CHANGES_REQUESTED review on
PR #107: offline coverage for scripts/claude_cloud_bridge.py, the single,
unified caller that fires a pre-configured Claude Code Routine's HTTP API
endpoint so a GitHub work item can start a Claude cloud session with no
dependency on Zaneta's Mac.

Every test here runs with a fake `gh_runner`/`transport` -- no real
subprocess is spawned, no real network call is made, and no real Routine is
ever fired. Coverage matches Santiago's own list: exact-label gating, no
automatic retry, secret non-exposure, no API-key auth, and no
consequential-action verbs. Concurrency itself is a GitHub Actions property
of the new workflow, not something this module's own logic can exercise
offline -- see tests/isolation/test_claude_cloud_routine_bridge_workflow.py
for the structural assertion that the workflow declares a per-item
concurrency group.
"""

import importlib.util
import json
import re
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = REPO_ROOT / "scripts" / "claude_cloud_bridge.py"

_spec = importlib.util.spec_from_file_location("claude_cloud_bridge", SCRIPT_PATH)
bridge = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = bridge
_spec.loader.exec_module(bridge)


def make_gh_runner(*, labels=(), calls=None, timeline=None):
    """A fake gh_runner(argv) that answers `view --json labels` with
    `labels`, and records every call (including writes) into `calls` if
    given, so a test can assert exactly what was invoked. If `timeline` is
    given, every call also appends a `("gh", argv)` entry to it -- shared
    with a `FakeTransport`'s own `timeline` entries -- so a test can assert
    the relative order of GitHub writes and the HTTP fire call."""
    def runner(argv):
        if calls is not None:
            calls.append(argv)
        if timeline is not None:
            timeline.append(("gh", argv))
        if argv[2] == "view":
            return json.dumps({"labels": [{"name": n} for n in labels]})
        return ""
    return runner


class FakeTransport(bridge.HttpTransport):
    def __init__(self, response=None, raises=None, timeline=None):
        self.response = response
        self.raises = raises
        self.requests = []
        self.timeline = timeline

    def request(self, http_request):
        self.requests.append(http_request)
        if self.timeline is not None:
            self.timeline.append(("http", http_request))
        if self.raises is not None:
            raise self.raises
        return self.response


def ok_response(session_id="session_01ABC"):
    body = json.dumps({
        "type": "routine_fire",
        "claude_code_session_id": session_id,
        "claude_code_session_url": f"https://claude.example.invalid/code/{session_id}",
    }).encode("utf-8")
    return bridge.HttpResponse(status=200, headers={}, body=body)


FIRE_URL = "https://api.example.invalid/v1/routines/routine_123/fire"


class TestWorkItem(unittest.TestCase):

    def test_unknown_kind_is_rejected(self):
        with self.assertRaises(bridge.CloudBridgeError):
            bridge.WorkItem(kind="pull", number=1, repo="z/t")

    def test_issue_shape(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        self.assertEqual(item.label, "Issue")
        self.assertEqual(item.gh_subcommand, "issue")
        self.assertIn("issues/105", item.url)

    def test_pr_shape(self):
        item = bridge.WorkItem(kind="pr", number=107, repo="z/t")
        self.assertEqual(item.label, "Pull Request")
        self.assertEqual(item.gh_subcommand, "pr")
        self.assertIn("pull/107", item.url)


class TestExactLabelGating(unittest.TestCase):
    """Santiago's finding 3: is_actionable(None) used to be True, so a
    caller could fire an item with no marker at all. There is no such
    escape hatch any more -- fire_once only proceeds when QUEUE_LABEL is
    actually present, checked immediately before every fire."""

    def test_label_absent_never_fires(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        transport = FakeTransport(ok_response())
        outcome = bridge.fire_once(
            item, FIRE_URL, "tok", gh_runner=make_gh_runner(labels=()), transport=transport)
        self.assertEqual(outcome.action, "skipped_label_absent")
        self.assertEqual(transport.requests, [])

    def test_label_absent_even_with_other_labels_never_fires(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        transport = FakeTransport(ok_response())
        outcome = bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=("bug", "READY_FOR_CLAUDE")), transport=transport)
        self.assertEqual(outcome.action, "skipped_label_absent")

    def test_label_present_fires(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        transport = FakeTransport(ok_response())
        outcome = bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,)), transport=transport)
        self.assertEqual(outcome.action, "fired")
        self.assertEqual(len(transport.requests), 1)

    def test_there_is_no_bypass_flag(self):
        """A prior version had a --force flag that skipped this check
        entirely; Santiago's finding removed the escape hatch, so fire_once
        must accept no such parameter."""
        import inspect
        params = inspect.signature(bridge.fire_once).parameters
        self.assertNotIn("force", params)


class TestFireRequestConstruction(unittest.TestCase):

    def test_request_uses_the_supplied_url_verbatim(self):
        request = bridge.build_fire_request(FIRE_URL, "tok", {"text": "x"})
        self.assertEqual(request.url, FIRE_URL)
        self.assertEqual(request.method, "POST")

    def test_request_carries_the_documented_headers(self):
        request = bridge.build_fire_request(FIRE_URL, "tok-value", {"text": "x"})
        self.assertEqual(request.headers["Authorization"], "Bearer tok-value")
        self.assertEqual(request.headers["anthropic-beta"], bridge.ANTHROPIC_BETA_HEADER)
        self.assertEqual(request.headers["anthropic-version"], bridge.ANTHROPIC_VERSION_HEADER)
        self.assertEqual(request.headers["Content-Type"], "application/json")

    def test_request_body_is_the_json_encoded_payload(self):
        payload = {"text": "z/t Issue #105 (u)"}
        request = bridge.build_fire_request(FIRE_URL, "tok", payload)
        self.assertEqual(json.loads(request.body.decode("utf-8")), payload)


class TestFirePayload(unittest.TestCase):

    def test_payload_names_repo_kind_number_and_url(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        payload = bridge.build_fire_payload(item)
        self.assertEqual(set(payload.keys()), {"text"})
        self.assertIn("z/t", payload["text"])
        self.assertIn("Issue #105", payload["text"])
        self.assertIn(item.url, payload["text"])


class TestNoAutomaticRetry(unittest.TestCase):
    """Santiago's finding: exactly one /fire POST per event, no automatic
    HTTP retry at any layer."""

    def test_exactly_one_transport_call_on_success(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        transport = FakeTransport(ok_response())
        bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,)), transport=transport)
        self.assertEqual(len(transport.requests), 1)

    def test_exactly_one_transport_call_on_non_2xx_failure(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        error_body = json.dumps({"error": {"type": "authentication_error"}}).encode("utf-8")
        transport = FakeTransport(bridge.HttpResponse(status=401, headers={}, body=error_body))
        bridge.fire_once(
            item, FIRE_URL, "bad-tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,)), transport=transport)
        self.assertEqual(len(transport.requests), 1)

    def test_exactly_one_transport_call_on_transport_error(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        transport = FakeTransport(raises=bridge.CloudBridgeError("POST x: connection refused"))
        bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,)), transport=transport)
        self.assertEqual(len(transport.requests), 1)

    def test_urllib_transport_makes_exactly_one_urlopen_call_per_request(self):
        """Structural: UrllibHttpTransport.request's own body (not its
        docstring, which is free to describe this property in prose) must
        not loop."""
        source = SCRIPT_PATH.read_text(encoding="utf-8")
        method_start = source.index("def request(self, http_request):",
                                    source.index("class UrllibHttpTransport"))
        method_body = source[method_start:method_start + 1200]
        self.assertEqual(method_body.count("urlopen("), 1)
        for forbidden in ("for attempt", "while True", "retry", "Retry"):
            self.assertNotIn(forbidden, method_body)


class TestClaimHappensBeforeFire(unittest.TestCase):
    """Santiago's reliability finding: at-most-once delivery requires the
    label removal (the claim) to happen BEFORE the /fire POST, not after a
    confirmed success -- otherwise a crash/lost-response/interrupted
    process between a successful POST and a later remove_label leaves the
    label present, and a rerun can fire a second session for the same
    item."""

    def test_label_is_removed_before_the_http_request_on_success(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        timeline = []
        gh_runner = make_gh_runner(labels=(bridge.QUEUE_LABEL,), timeline=timeline)
        transport = FakeTransport(ok_response(), timeline=timeline)
        bridge.fire_once(item, FIRE_URL, "tok", gh_runner=gh_runner, transport=transport)

        remove_index = next(
            i for i, (kind, payload) in enumerate(timeline)
            if kind == "gh" and payload[2] == "edit" and "--remove-label" in payload)
        http_index = next(i for i, (kind, _) in enumerate(timeline) if kind == "http")
        self.assertLess(remove_index, http_index,
                        "the label must be removed before the HTTP fire request is made")

    def test_label_is_removed_before_the_http_request_on_failure(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        timeline = []
        gh_runner = make_gh_runner(labels=(bridge.QUEUE_LABEL,), timeline=timeline)
        transport = FakeTransport(
            bridge.HttpResponse(status=500, headers={}, body=b"{}"), timeline=timeline)
        bridge.fire_once(item, FIRE_URL, "tok", gh_runner=gh_runner, transport=transport)

        remove_index = next(
            i for i, (kind, payload) in enumerate(timeline)
            if kind == "gh" and payload[2] == "edit" and "--remove-label" in payload)
        http_index = next(i for i, (kind, _) in enumerate(timeline) if kind == "http")
        self.assertLess(remove_index, http_index,
                        "the claim must happen even when the fire itself is about to fail")

    def test_dry_run_never_claims(self):
        """dry_run must not remove the label -- it performs no write at
        all, on the read-only-footprint tests' own terms."""
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        calls = []
        bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,), calls=calls),
            transport=FakeTransport(ok_response()), dry_run=True)
        remove_calls = [c for c in calls if c[2] == "edit"]
        self.assertEqual(remove_calls, [])


class TestSuccessfulFireBehavior(unittest.TestCase):

    def test_success_removes_the_label(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        calls = []
        transport = FakeTransport(ok_response("session_xyz"))
        bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,), calls=calls),
            transport=transport)
        remove_calls = [c for c in calls if "edit" in c and "--remove-label" in c]
        self.assertEqual(len(remove_calls), 1)
        self.assertIn(bridge.QUEUE_LABEL, remove_calls[0])

    def test_success_posts_a_routine_dispatched_comment_with_session_info(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        calls = []
        transport = FakeTransport(ok_response("session_xyz"))
        bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,), calls=calls),
            transport=transport)
        comment_calls = [c for c in calls if "comment" in c]
        self.assertEqual(len(comment_calls), 1)
        body = comment_calls[0][comment_calls[0].index("--body") + 1]
        self.assertTrue(body.startswith("ROUTINE_DISPATCHED"))
        self.assertIn("session_xyz", body)

    def test_label_removed_before_comment_posted(self):
        """If the process died between these two writes, the label being
        gone (not the comment) is what must already be true -- removal is
        the safety-critical write and must happen first."""
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        calls = []
        transport = FakeTransport(ok_response())
        bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,), calls=calls),
            transport=transport)
        write_calls = [c for c in calls if c[2] in ("edit", "comment")]
        self.assertEqual(write_calls[0][2], "edit")
        self.assertEqual(write_calls[1][2], "comment")

    def test_outcome_is_fired(self):
        item = bridge.WorkItem(kind="pr", number=107, repo="z/t")
        outcome = bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,)),
            transport=FakeTransport(ok_response()))
        self.assertEqual(outcome.action, "fired")


class TestFailureBehavior(unittest.TestCase):

    def test_non_2xx_has_already_claimed_the_label(self):
        """The label was removed as the claim before firing -- a failure
        does not change that; it is a already-consumed fact by this
        point, never something the failure path itself performs."""
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        calls = []
        error_body = json.dumps({"error": {"type": "authentication_error"}}).encode("utf-8")
        transport = FakeTransport(bridge.HttpResponse(status=401, headers={}, body=error_body))
        bridge.fire_once(
            item, FIRE_URL, "bad-tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,), calls=calls),
            transport=transport)
        remove_calls = [c for c in calls if "edit" in c and "--remove-label" in c]
        self.assertEqual(len(remove_calls), 1)

    def test_failure_never_re_adds_the_label(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        calls = []
        error_body = json.dumps({"error": {"type": "authentication_error"}}).encode("utf-8")
        transport = FakeTransport(bridge.HttpResponse(status=401, headers={}, body=error_body))
        bridge.fire_once(
            item, FIRE_URL, "bad-tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,), calls=calls),
            transport=transport)
        for call in calls:
            self.assertNotIn("--add-label", call)

    def test_transport_error_never_re_adds_the_label(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        calls = []
        transport = FakeTransport(
            raises=bridge.CloudBridgeError(f"POST {FIRE_URL}: connection refused"))
        bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,), calls=calls),
            transport=transport)
        for call in calls:
            self.assertNotIn("--add-label", call)
        remove_calls = [c for c in calls if "edit" in c and "--remove-label" in c]
        self.assertEqual(len(remove_calls), 1)

    def test_a_failed_fire_is_never_automatically_retried_or_requeued(self):
        """One transport call, one gh edit (the claim), one gh comment --
        nothing loops, nothing re-fires, nothing re-labels, after an
        ambiguous or outright failed attempt."""
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        calls = []
        transport = FakeTransport(
            raises=bridge.CloudBridgeError(f"POST {FIRE_URL}: connection refused"))
        bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,), calls=calls),
            transport=transport)
        self.assertEqual(len(transport.requests), 1)
        edit_calls = [c for c in calls if c[2] == "edit"]
        comment_calls = [c for c in calls if c[2] == "comment"]
        self.assertEqual(len(edit_calls), 1)
        self.assertEqual(len(comment_calls), 1)

    def test_non_2xx_posts_a_sanitized_failure_comment_describing_no_longer_queued(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        calls = []
        error_body = json.dumps({"error": {"type": "authentication_error"}}).encode("utf-8")
        transport = FakeTransport(bridge.HttpResponse(status=401, headers={}, body=error_body))
        bridge.fire_once(
            item, FIRE_URL, "super-secret-token-value",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,), calls=calls),
            transport=transport)
        comment_calls = [c for c in calls if "comment" in c]
        self.assertEqual(len(comment_calls), 1)
        body = comment_calls[0][comment_calls[0].index("--body") + 1]
        self.assertTrue(body.startswith("ROUTINE_FIRE_FAILED"))
        self.assertIn("401", body)
        self.assertIn("no longer queued", body)
        self.assertNotIn("super-secret-token-value", body)

    def test_transport_error_leaves_label_and_posts_sanitized_comment(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        calls = []
        transport = FakeTransport(
            raises=bridge.CloudBridgeError(f"POST {FIRE_URL}: connection refused"))
        bridge.fire_once(
            item, FIRE_URL, "super-secret-token-value",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,), calls=calls),
            transport=transport)
        remove_calls = [c for c in calls if "edit" in c and "--remove-label" in c]
        self.assertEqual(len(remove_calls), 1)
        comment_calls = [c for c in calls if "comment" in c]
        body = comment_calls[0][comment_calls[0].index("--body") + 1]
        self.assertTrue(body.startswith("ROUTINE_FIRE_FAILED"))
        self.assertNotIn("super-secret-token-value", body)

    def test_outcome_is_fire_failed(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        transport = FakeTransport(bridge.HttpResponse(status=500, headers={}, body=b"{}"))
        outcome = bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,)), transport=transport)
        self.assertEqual(outcome.action, "fire_failed")


class TestDryRunBehavior(unittest.TestCase):

    def test_dry_run_never_calls_transport(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        transport = FakeTransport(ok_response())
        outcome = bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,)), transport=transport,
            dry_run=True)
        self.assertEqual(outcome.action, "dry_run")
        self.assertEqual(transport.requests, [])

    def test_dry_run_never_writes_to_github(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        calls = []
        bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,), calls=calls),
            transport=FakeTransport(ok_response()), dry_run=True)
        for call in calls:
            self.assertEqual(call[2], "view")

    def test_dry_run_still_respects_the_label_check(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        outcome = bridge.fire_once(
            item, FIRE_URL, "tok", gh_runner=make_gh_runner(labels=()),
            transport=FakeTransport(ok_response()), dry_run=True)
        self.assertEqual(outcome.action, "skipped_label_absent")

    def test_dry_run_never_needs_a_real_token(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        outcome = bridge.fire_once(
            item, FIRE_URL, None, gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,)),
            transport=FakeTransport(ok_response()), dry_run=True)
        self.assertEqual(outcome.action, "dry_run")


class StatefulPrGhState:
    """A fake, in-memory GitHub PR used by TestPerTupleDispatchIdempotency
    to simulate the *same* item's state across more than one `fire_once`
    call, including the effect of `fire_once`'s own writes (label removal,
    posted comments) on a later call -- unlike `make_gh_runner`, which
    always answers every `view` call with the same fixed labels and never
    reflects a prior write, this fake actually behaves like GitHub state
    genuinely changing across sequential invocations (Issue #137's own
    "repeated controller invocation" and "a genuinely new correction round
    or new head SHA can dispatch exactly once" acceptance criteria)."""

    def __init__(self, *, label_present, head_sha, fail_comment_prefix=None):
        self.label_present = label_present
        self.head_sha = head_sha
        self.comments = []
        self.reviews = []
        self.calls = []
        #: When set, any `gh pr comment` whose body starts with this exact
        #: prefix raises `CloudBridgeError` instead of succeeding --
        #: correction round 1's `TestPreFireClaimReliability` uses this to
        #: simulate "the fire succeeded but the final comment write
        #: failed" without a real network call.
        self.fail_comment_prefix = fail_comment_prefix

    def add_changes_requested_review(self, created_at="2026-01-01T00:00:00Z"):
        self.reviews.append({
            "body": "CHANGES_REQUESTED\n\n- findings: ...\n- next state: CHANGES_REQUESTED\n",
            "user": {"login": "santiago"}, "submitted_at": created_at,
        })

    def add_comment(self, body, created_at="2026-01-01T00:00:00Z"):
        """Seed a pre-existing comment directly -- used to simulate a prior
        run's own write (e.g. an outstanding ROUTINE_DISPATCH_CLAIMED with
        no resolving comment yet) without replaying a full `fire_once`
        call."""
        self.comments.append({
            "body": body, "user": {"login": "github-actions[bot]"}, "created_at": created_at,
        })

    def runner(self, argv):
        self.calls.append(argv)
        if argv[1] == "pr" and argv[2] == "view":
            fields = argv[argv.index("--json") + 1]
            payload = {}
            if "labels" in fields:
                payload["labels"] = (
                    [{"name": bridge.QUEUE_LABEL}] if self.label_present else [])
            if "headRefOid" in fields:
                payload["headRefOid"] = self.head_sha
            return json.dumps(payload)
        if argv[1] == "api" and "/comments" in argv[2]:
            return json.dumps(self.comments)
        if argv[1] == "api" and "/reviews" in argv[2]:
            return json.dumps(self.reviews)
        if argv[1] == "pr" and argv[2] == "edit" and "--remove-label" in argv:
            self.label_present = False
            return ""
        if argv[1] == "pr" and argv[2] == "comment":
            body = argv[argv.index("--body") + 1]
            if self.fail_comment_prefix and body.startswith(self.fail_comment_prefix):
                raise bridge.CloudBridgeError("simulated comment write failure")
            self.comments.append({
                "body": body, "user": {"login": "github-actions[bot]"},
                "created_at": "2026-01-01T00:00:00Z",
            })
            return ""
        return ""


class TestPerTupleDispatchIdempotency(unittest.TestCase):
    """Issue #137: PR #131 showed that one intended requeue could produce
    more than one ROUTINE_DISPATCHED session for the same correction round,
    because the label's mere presence -- not a persistent per-tuple claim
    -- was the only guard. fire_once now also checks, for a PR item, the
    exact (repo, PR number, current head SHA, correction round) tuple
    against the PR's own existing ROUTINE_DISPATCHED comments before ever
    calling transport."""

    def test_repeated_invocation_for_the_same_tuple_fires_exactly_once(self):
        state = StatefulPrGhState(label_present=True, head_sha="sha1")
        transport = FakeTransport(ok_response("session_1"))
        item = bridge.WorkItem(kind="pr", number=131, repo="z/t")

        outcome1 = bridge.fire_once(item, FIRE_URL, "tok", gh_runner=state.runner,
                                     transport=transport)
        self.assertEqual(outcome1.action, "fired")

        # The controller (or a retry) re-applies the label a second time
        # for the exact same, already-dispatched round/head -- this is the
        # PR #131 defect scenario.
        state.label_present = True
        outcome2 = bridge.fire_once(item, FIRE_URL, "tok", gh_runner=state.runner,
                                     transport=transport)

        self.assertEqual(outcome2.action, "skipped_already_dispatched")
        self.assertEqual(len(transport.requests), 1)

    def test_duplicate_skip_still_clears_the_now_stale_label(self):
        state = StatefulPrGhState(label_present=True, head_sha="sha1")
        transport = FakeTransport(ok_response("session_1"))
        item = bridge.WorkItem(kind="pr", number=131, repo="z/t")
        bridge.fire_once(item, FIRE_URL, "tok", gh_runner=state.runner, transport=transport)

        state.label_present = True
        bridge.fire_once(item, FIRE_URL, "tok", gh_runner=state.runner, transport=transport)

        self.assertFalse(state.label_present)

    def test_a_new_correction_round_after_an_existing_dispatch_fires_again(self):
        state = StatefulPrGhState(label_present=True, head_sha="sha1")
        transport = FakeTransport(ok_response("session_1"))
        item = bridge.WorkItem(kind="pr", number=131, repo="z/t")
        outcome1 = bridge.fire_once(item, FIRE_URL, "tok", gh_runner=state.runner,
                                     transport=transport)
        self.assertEqual(outcome1.action, "fired")

        # A genuine new correction round: Santiago posts CHANGES_REQUESTED,
        # the controller re-applies the label.
        state.add_changes_requested_review()
        state.label_present = True
        outcome2 = bridge.fire_once(item, FIRE_URL, "tok", gh_runner=state.runner,
                                     transport=transport)

        self.assertEqual(outcome2.action, "fired")
        self.assertEqual(len(transport.requests), 2)

    def test_a_new_head_sha_after_an_existing_dispatch_fires_again(self):
        state = StatefulPrGhState(label_present=True, head_sha="sha1")
        transport = FakeTransport(ok_response("session_1"))
        item = bridge.WorkItem(kind="pr", number=131, repo="z/t")
        outcome1 = bridge.fire_once(item, FIRE_URL, "tok", gh_runner=state.runner,
                                     transport=transport)
        self.assertEqual(outcome1.action, "fired")

        # A fresh commit lands (e.g. a correction pushed for a round that
        # was never itself re-labeled) and the label is now (re-)applied
        # for this new head.
        state.head_sha = "sha2"
        state.label_present = True
        outcome2 = bridge.fire_once(item, FIRE_URL, "tok", gh_runner=state.runner,
                                     transport=transport)

        self.assertEqual(outcome2.action, "fired")
        self.assertEqual(len(transport.requests), 2)

    def test_a_stale_label_present_with_no_prior_dispatch_still_fires_normally(self):
        """The new check must never block a genuinely first-time dispatch
        -- only a tuple that already has a matching ROUTINE_DISPATCHED
        comment."""
        state = StatefulPrGhState(label_present=True, head_sha="sha1")
        transport = FakeTransport(ok_response("session_1"))
        item = bridge.WorkItem(kind="pr", number=131, repo="z/t")
        outcome = bridge.fire_once(item, FIRE_URL, "tok", gh_runner=state.runner,
                                    transport=transport)
        self.assertEqual(outcome.action, "fired")

    def test_dispatched_comment_carries_the_round_and_head_marker(self):
        state = StatefulPrGhState(label_present=True, head_sha="sha1")
        transport = FakeTransport(ok_response("session_1"))
        item = bridge.WorkItem(kind="pr", number=131, repo="z/t")
        bridge.fire_once(item, FIRE_URL, "tok", gh_runner=state.runner, transport=transport)
        # Correction round 1: a PR dispatch now posts two comments -- the
        # pre-fire ROUTINE_DISPATCH_CLAIMED claim, then the final
        # ROUTINE_DISPATCHED comment -- both carrying the same marker.
        self.assertEqual(len(state.comments), 2)
        self.assertTrue(state.comments[0]["body"].startswith("ROUTINE_DISPATCH_CLAIMED"))
        self.assertTrue(state.comments[1]["body"].startswith("ROUTINE_DISPATCHED"))
        for comment in state.comments:
            self.assertIn("dispatch round: 0 @ sha1", comment["body"])

    def test_issue_items_are_unaffected_and_never_perform_the_pr_only_lookup(self):
        """The persistent-claim lookup is scoped to PR items (Issue #137's
        own tuple names a PR number/head SHA/correction round, none of
        which an Issue has) -- an Issue's dispatch behavior, and its exact
        gh call footprint, must be unchanged."""
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        calls = []
        transport = FakeTransport(ok_response())
        outcome = bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,), calls=calls),
            transport=transport)
        self.assertEqual(outcome.action, "fired")
        for call in calls:
            self.assertIn(call[2], ("view", "edit", "comment"))

    def test_dry_run_reports_the_skip_without_writing(self):
        state = StatefulPrGhState(label_present=True, head_sha="sha1")
        transport = FakeTransport(ok_response("session_1"))
        item = bridge.WorkItem(kind="pr", number=131, repo="z/t")
        bridge.fire_once(item, FIRE_URL, "tok", gh_runner=state.runner, transport=transport)

        state.label_present = True
        calls_before = len(state.calls)
        outcome = bridge.fire_once(
            item, FIRE_URL, "tok", gh_runner=state.runner, transport=transport, dry_run=True)

        self.assertEqual(outcome.action, "dry_run_skip_already_dispatched")
        self.assertTrue(state.label_present, "dry_run must never remove the label")
        edit_calls = [c for c in state.calls[calls_before:] if c[2] == "edit"]
        self.assertEqual(edit_calls, [])


class TestFindExistingPrDispatchClaimStates(unittest.TestCase):
    """Unit coverage for find_existing_pr_dispatch's three-way bridge-event
    read (correction round 1): a confirmed dispatch always blocks, an
    outstanding claim blocks, and a claim resolved by a confirmed failure
    does not."""

    MARKER = bridge.dispatch_marker_line(0, "sha1")

    @staticmethod
    def _comment(body, created_at):
        return {"body": body, "user": {"login": "github-actions[bot]"}, "created_at": created_at}

    def test_no_matching_comment_is_not_blocked(self):
        self.assertFalse(bridge.find_existing_pr_dispatch([], self.MARKER))

    def test_confirmed_dispatched_comment_blocks(self):
        item = bridge.WorkItem(kind="pr", number=131, repo="z/t")
        body = bridge.build_dispatched_comment(
            item, {"claude_code_session_id": "s"}, dispatch_marker=self.MARKER)
        self.assertTrue(bridge.find_existing_pr_dispatch(
            [self._comment(body, "2026-01-01T00:00:00Z")], self.MARKER))

    def test_outstanding_pre_fire_claim_alone_blocks(self):
        """The gap Santiago's review found: a claim with no resolving
        comment yet (the fire may have already succeeded, or still be in
        flight) must be treated as already dispatched, never as free to
        retry."""
        item = bridge.WorkItem(kind="pr", number=131, repo="z/t")
        body = bridge.build_claim_comment(item, self.MARKER)
        self.assertTrue(bridge.find_existing_pr_dispatch(
            [self._comment(body, "2026-01-01T00:00:00Z")], self.MARKER))

    def test_claim_followed_by_confirmed_failure_is_not_blocked(self):
        """The one explicitly retryable outcome: the bridge itself
        confirmed the fire never succeeded, so a later re-label is a
        legitimate retry, not a duplicate."""
        item = bridge.WorkItem(kind="pr", number=131, repo="z/t")
        claim_body = bridge.build_claim_comment(item, self.MARKER)
        failure_body = bridge.build_failure_comment(item, 500, "server error") + self.MARKER + "\n"
        comments = [
            self._comment(claim_body, "2026-01-01T00:00:00Z"),
            self._comment(failure_body, "2026-01-01T00:00:01Z"),
        ]
        self.assertFalse(bridge.find_existing_pr_dispatch(comments, self.MARKER))

    def test_claim_failure_then_a_fresh_claim_blocks_again(self):
        """A second, later dispatch attempt for the exact same tuple (the
        retry itself) posts its own new ROUTINE_DISPATCH_CLAIMED -- that
        fresh, still-unresolved claim must block yet another concurrent
        retry, not be forgotten because an earlier attempt failed."""
        item = bridge.WorkItem(kind="pr", number=131, repo="z/t")
        claim_body = bridge.build_claim_comment(item, self.MARKER)
        failure_body = bridge.build_failure_comment(item, 500, "server error") + self.MARKER + "\n"
        comments = [
            self._comment(claim_body, "2026-01-01T00:00:00Z"),
            self._comment(failure_body, "2026-01-01T00:00:01Z"),
            self._comment(claim_body, "2026-01-01T00:00:02Z"),
        ]
        self.assertTrue(bridge.find_existing_pr_dispatch(comments, self.MARKER))

    def test_a_comment_that_only_quotes_the_keyword_in_a_fenced_block_is_ignored(self):
        """classify_comments' existing fenced-code-block hardening (Issue
        #137) applies here too -- a comment merely documenting the format
        must never be mistaken for a real claim."""
        quoting_body = f"Here is the format:\n\n```\nROUTINE_DISPATCH_CLAIMED\n\n{self.MARKER}\n```\n"
        self.assertFalse(bridge.find_existing_pr_dispatch(
            [self._comment(quoting_body, "2026-01-01T00:00:00Z")], self.MARKER))


def argv_body_index(argv):
    return argv.index("--body") + 1


class TestPreFireClaimReliability(unittest.TestCase):
    """Correction round 1 (Santiago's CHANGES_REQUESTED review against
    f9c92e4...): the persistent per-tuple protection must be recorded
    *before* the /fire call, not only after a confirmed success -- closing
    the window where a fire succeeds but the final ROUTINE_DISPATCHED
    comment write itself then fails, leaving no record at all."""

    def test_claim_comment_is_posted_before_the_http_request(self):
        state = StatefulPrGhState(label_present=True, head_sha="sha1")
        timeline = []
        transport = FakeTransport(ok_response("session_1"), timeline=timeline)
        real_runner = state.runner

        def timelined_runner(argv):
            result = real_runner(argv)
            if argv[1] == "pr" and argv[2] == "comment":
                timeline.append(("gh", argv))
            return result

        item = bridge.WorkItem(kind="pr", number=131, repo="z/t")
        bridge.fire_once(item, FIRE_URL, "tok", gh_runner=timelined_runner, transport=transport)

        claim_index = next(
            i for i, (kind, payload) in enumerate(timeline)
            if kind == "gh" and payload[argv_body_index(payload)].startswith(
                "ROUTINE_DISPATCH_CLAIMED"))
        http_index = next(i for i, (kind, _) in enumerate(timeline) if kind == "http")
        self.assertLess(claim_index, http_index,
                         "the pre-fire claim comment must be posted before the HTTP fire request")

    def test_fire_succeeds_but_final_comment_write_fails_then_reinvocation_does_not_refire(self):
        """Scenario (a): the fire itself succeeds, but posting the final
        ROUTINE_DISPATCHED comment fails. A later re-invocation for the
        exact same tuple must see the pre-fire claim and not fire again."""
        state = StatefulPrGhState(
            label_present=True, head_sha="sha1", fail_comment_prefix="ROUTINE_DISPATCHED\n\n")
        transport = FakeTransport(ok_response("session_1"))
        item = bridge.WorkItem(kind="pr", number=131, repo="z/t")

        outcome1 = bridge.fire_once(item, FIRE_URL, "tok", gh_runner=state.runner,
                                     transport=transport)
        self.assertEqual(outcome1.action, "fired_comment_failed")
        self.assertEqual(len(transport.requests), 1)
        # Only the pre-fire claim comment survives -- the final
        # ROUTINE_DISPATCHED comment write failed and was never recorded.
        self.assertEqual(len(state.comments), 1)
        self.assertTrue(state.comments[0]["body"].startswith("ROUTINE_DISPATCH_CLAIMED"))

        state.label_present = True
        outcome2 = bridge.fire_once(item, FIRE_URL, "tok", gh_runner=state.runner,
                                     transport=transport)

        self.assertEqual(outcome2.action, "skipped_already_dispatched")
        self.assertEqual(len(transport.requests), 1, "must not fire a second session")

    def test_duplicate_or_concurrent_invocation_sees_the_pre_fire_claim_and_does_not_fire(self):
        """Scenario (b): an outstanding pre-fire claim already exists (e.g.
        a concurrent invocation raced ahead, or a prior run crashed right
        after posting it) -- a second invocation must see it and never call
        transport at all."""
        state = StatefulPrGhState(label_present=True, head_sha="sha1")
        item = bridge.WorkItem(kind="pr", number=131, repo="z/t")
        state.add_comment(bridge.build_claim_comment(item, bridge.dispatch_marker_line(0, "sha1")))

        transport = FakeTransport(ok_response("session_1"))
        outcome = bridge.fire_once(item, FIRE_URL, "tok", gh_runner=state.runner,
                                    transport=transport)

        self.assertEqual(outcome.action, "skipped_already_dispatched")
        self.assertEqual(transport.requests, [])

    def test_confirmed_fire_failure_remains_explicitly_retryable(self):
        """Scenario (c): a prior attempt for this exact tuple was claimed
        and then confirmed failed (ROUTINE_FIRE_FAILED). An explicit
        re-label must still be able to fire -- the confirmed failure is
        what distinguishes this from an auto-retry of an ambiguous
        outcome."""
        state = StatefulPrGhState(label_present=True, head_sha="sha1")
        item = bridge.WorkItem(kind="pr", number=131, repo="z/t")
        marker = bridge.dispatch_marker_line(0, "sha1")
        state.add_comment(bridge.build_claim_comment(item, marker), created_at="2026-01-01T00:00:00Z")
        state.add_comment(
            bridge.build_failure_comment(item, 500, "server error") + marker + "\n",
            created_at="2026-01-01T00:00:01Z")

        transport = FakeTransport(ok_response("session_2"))
        outcome = bridge.fire_once(item, FIRE_URL, "tok", gh_runner=state.runner,
                                    transport=transport)

        self.assertEqual(outcome.action, "fired")
        self.assertEqual(len(transport.requests), 1)

    def test_confirmed_failure_retry_does_not_let_a_third_concurrent_call_also_fire(self):
        """The retryable case must still not become an open door: once the
        retry itself posts a fresh claim, a third, still-concurrent
        invocation for the same tuple must again be blocked."""
        state = StatefulPrGhState(label_present=True, head_sha="sha1")
        item = bridge.WorkItem(kind="pr", number=131, repo="z/t")
        marker = bridge.dispatch_marker_line(0, "sha1")
        state.add_comment(bridge.build_claim_comment(item, marker), created_at="2026-01-01T00:00:00Z")
        state.add_comment(
            bridge.build_failure_comment(item, 500, "server error") + marker + "\n",
            created_at="2026-01-01T00:00:01Z")

        transport = FakeTransport(ok_response("session_2"))
        outcome1 = bridge.fire_once(item, FIRE_URL, "tok", gh_runner=state.runner,
                                     transport=transport)
        self.assertEqual(outcome1.action, "fired")

        state.label_present = True
        outcome2 = bridge.fire_once(item, FIRE_URL, "tok", gh_runner=state.runner,
                                     transport=transport)
        self.assertEqual(outcome2.action, "skipped_already_dispatched")
        self.assertEqual(len(transport.requests), 1)

    def test_dry_run_never_posts_the_pre_fire_claim(self):
        item = bridge.WorkItem(kind="pr", number=131, repo="z/t")
        calls = []
        outcome = bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,), calls=calls),
            transport=FakeTransport(ok_response()), dry_run=True)
        self.assertEqual(outcome.action, "dry_run")
        comment_calls = [c for c in calls if c[2] == "comment"]
        self.assertEqual(comment_calls, [])

    def test_issue_items_never_post_a_claim_comment(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        calls = []
        bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,), calls=calls),
            transport=FakeTransport(ok_response()))
        comment_calls = [c for c in calls if c[2] == "comment"]
        self.assertEqual(len(comment_calls), 1)
        body = comment_calls[0][comment_calls[0].index("--body") + 1]
        self.assertTrue(body.startswith("ROUTINE_DISPATCHED"))

    def test_failure_comment_still_never_exposes_the_token(self):
        state = StatefulPrGhState(label_present=True, head_sha="sha1")
        transport = FakeTransport(
            raises=bridge.CloudBridgeError(f"POST {FIRE_URL}: connection refused"))
        item = bridge.WorkItem(kind="pr", number=131, repo="z/t")
        bridge.fire_once(
            item, FIRE_URL, "super-secret-token-value", gh_runner=state.runner,
            transport=transport)
        for comment in state.comments:
            self.assertNotIn("super-secret-token-value", comment["body"])


class TestGitHubFootprintIsExactlyThreeVerbs(unittest.TestCase):
    """No merge, close, create, or any other GitHub write verb is ever
    reachable through this module -- only view (read), edit --remove-label,
    and comment."""

    def test_only_view_edit_and_comment_subcommands_are_ever_issued(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        calls = []
        bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,), calls=calls),
            transport=FakeTransport(ok_response()))
        for call in calls:
            self.assertIn(call[2], ("view", "edit", "comment"))
            for forbidden in ("merge", "close", "create", "delete"):
                self.assertNotIn(forbidden, call)

    def test_edit_calls_only_ever_remove_the_queue_label_never_add_one(self):
        item = bridge.WorkItem(kind="issue", number=105, repo="z/t")
        calls = []
        bridge.fire_once(
            item, FIRE_URL, "tok",
            gh_runner=make_gh_runner(labels=(bridge.QUEUE_LABEL,), calls=calls),
            transport=FakeTransport(ok_response()))
        edit_calls = [c for c in calls if c[2] == "edit"]
        for call in edit_calls:
            self.assertIn("--remove-label", call)
            self.assertNotIn("--add-label", call)


class TestNoConsequentialActionVerbsInSource(unittest.TestCase):
    """Santiago's finding: no consequential actions/merge/deploy/publish/
    send/spend anywhere in this module."""

    def setUp(self):
        self.source = SCRIPT_PATH.read_text(encoding="utf-8")

    def test_no_consequential_verb_appears_as_a_gh_subcommand_or_flag(self):
        """The module docstring is free to describe, in prose, what this
        module never does (including using these very words) -- what must
        never happen is one of these verbs appearing in actual code: a
        string literal, a gh argv element, or a CLI flag. Strip every
        triple-quoted docstring before scanning."""
        code_only = re.sub(r'"""[\s\S]*?"""', "", self.source)
        for forbidden in ("merge", "deploy", "publish", "workflow_dispatch"):
            self.assertNotIn(forbidden, code_only.lower())


class TestNoCredentialIsEverHardcodedOrLogged(unittest.TestCase):
    """Structural scan of the script's own source: the routine's bearer
    token must never be hardcoded, and must be read from the environment
    only inside main()'s real-wiring block -- never inside any of the
    pure/testable functions above it, and never passed to print/log. Also
    covers Santiago's "no API-key auth" requirement."""

    def setUp(self):
        self.source = SCRIPT_PATH.read_text(encoding="utf-8")

    def test_forbidden_claude_credentials_are_never_read_from_the_environment(self):
        lookup_pattern = re.compile(
            r"os\.environ(?:\.get)?\s*\[?\s*['\"](CLAUDE_CODE_OAUTH_TOKEN|ANTHROPIC_API_KEY)['\"]"
        )
        match = lookup_pattern.search(self.source)
        self.assertIsNone(
            match, f"found a real os.environ lookup of a forbidden credential name: {match}")

    def test_token_env_var_is_read_in_exactly_one_place_inside_main(self):
        matches = [
            m.start() for m in re.finditer(
                r"os\.environ\.get\(\s*ROUTINE_TOKEN_ENV_VAR", self.source)
        ]
        self.assertEqual(len(matches), 1, "token must be read from the environment exactly once")
        main_start = self.source.index("\ndef main(")
        self.assertGreater(matches[0], main_start)

    def test_no_flag_accepts_the_token_or_url_directly(self):
        """Neither secret may be passed as a CLI argument -- only read from
        the environment -- so a flag value never appears in a process
        listing."""
        self.assertNotIn('"--token"', self.source)
        self.assertNotIn('"--routine-fire-url"', self.source)
        self.assertNotIn('"--routine-id"', self.source)

    def test_no_print_or_fstring_embeds_the_token_variable(self):
        allowed_snippet = 'f"Bearer {token}"'
        for lineno, line in enumerate(self.source.splitlines(), start=1):
            if "token" not in line.lower():
                continue
            stripped = line.strip()
            if (stripped.startswith("#") or stripped.startswith('"""')
                    or allowed_snippet in line):
                continue
            suspicious = re.search(r'f["\'].*\{token\b', line) or ".format(token" in line
            self.assertFalse(
                suspicious, f"line {lineno} appears to interpolate the token into a "
                            f"formatted string: {line!r}")

    def test_authorization_header_is_the_only_place_token_reaches_a_string(self):
        self.assertIn('f"Bearer {token}"', self.source)

    def test_failure_comment_builder_never_receives_the_request_headers(self):
        """build_failure_comment's only inputs are (item, status,
        error_detail) -- it structurally cannot embed the Authorization
        header because it is never passed one."""
        import inspect
        params = list(inspect.signature(bridge.build_failure_comment).parameters)
        self.assertEqual(params, ["item", "status", "error_detail"])


if __name__ == "__main__":
    unittest.main()
