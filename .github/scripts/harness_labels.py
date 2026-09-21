#!/usr/bin/env python3
"""
Shared GitHub label vocabulary for the harness golden path (Issue #171,
harness golden-path sync -- see docs/HARNESS_GOLDEN_PATH.md).

Pure, dependency-free constants and one pure decision function
(`labels_to_remove`) shared by `.github/scripts/harness_label_close_cleanup.py`
(event-driven, per-item) and `.github/scripts/harness_label_reconciler.py`
(periodic, repo-wide eventual-consistency fallback).

## The invariant (Issue #171)

Comments preserve history. Labels represent current actionable state only.

* Transient (removed from a closed item): `READY_FOR_CLAUDE_CLOUD`,
  `READY_FOR_SANTIAGO`.
* Durable (never removed by this module): `VERIFIED`, `COMPLETED`.
* Retired/forbidden (removed from a closed item, and never written by any
  active transport): every `controller:*` label, `CHANGES_REQUESTED`,
  `SANTIAGO_REVIEWING`, `WORK_IN_PROGRESS`, `SANTIAGO_STALLED`,
  `CLAUDE_DISPATCHED`, `CLAUDE_WORKING`, `CLAUDE_STALLED`, the historical
  literal `NEEDS_ZANETA` label, and `CORRECTION_IN_PROGRESS` (the retired
  Block 1E status controller's own fourth state label -- not spelled out
  verbatim in Issue #171's own list, but the same kind of obsolete
  transport label this invariant exists to clear).

Everything else -- an ordinary product/client/non-harness label -- is never
touched by either caller: only membership in `TRANSIENT_LABELS`, or a match
against `is_retired`, makes a label removable, and only ever from a CLOSED
item (each caller's own responsibility to check before writing).
"""

TRANSIENT_LABELS = frozenset({"READY_FOR_CLAUDE_CLOUD", "READY_FOR_SANTIAGO"})

DURABLE_LABELS = frozenset({"VERIFIED", "COMPLETED"})

RETIRED_LITERAL_LABELS = frozenset({
    "CHANGES_REQUESTED",
    "SANTIAGO_REVIEWING",
    "WORK_IN_PROGRESS",
    "SANTIAGO_STALLED",
    "CLAUDE_DISPATCHED",
    "CLAUDE_WORKING",
    "CLAUDE_STALLED",
    "NEEDS_ZANETA",
    "CORRECTION_IN_PROGRESS",
})

RETIRED_PREFIXES = ("controller:",)


def is_retired(name):
    """Whether `name` is a forbidden/retired GitHub label -- an exact
    literal match, or a `controller:`-prefixed name (Issue #171: "every
    `controller:*`")."""
    return name in RETIRED_LITERAL_LABELS or any(
        name.startswith(prefix) for prefix in RETIRED_PREFIXES)


def labels_to_remove(current_labels):
    """Which of `current_labels` (a closed item's own current label names)
    this cleanup/reconciler machinery may remove: every transient label
    that is present, plus every retired/forbidden label that is present.
    Durable labels and ordinary non-harness labels are never included, so
    they can never appear in the result. Pure and idempotent: an
    already-clean list yields `[]`, which is what makes a repeated run over
    an unchanged item perform zero `gh` writes."""
    return sorted(
        name for name in current_labels
        if name in TRANSIENT_LABELS or is_retired(name)
    )
