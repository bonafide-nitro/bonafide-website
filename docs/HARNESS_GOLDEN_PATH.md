# Harness golden path — Bona Fide website

This is the repository transport contract for the Claude ↔ Santiago/Codex harness.

## Required flow

```
READY_FOR_CLAUDE_CLOUD (label on approved Issue or correction PR)
  → claude-cloud-routine-bridge.yml
  → Claude cloud session
  → CONTEXT_RECEIPT
  → implementation on one Block branch/PR
  → READY_FOR_SANTIAGO exact-head comment + READY_FOR_SANTIAGO label
  → santiago-ready-label-trigger.yml posts @codex review
  → Codex reviews exact current head
       findings → codex-feedback-to-claude.yml → bounded Claude correction
       clean    → codex-clean-verified.yml → VERIFIED exact head
  → human merge gate
```

A literal human `CHANGES_REQUESTED` comment naming the exact current head can also requeue the same PR through `santiago-changes-requested-requeue.yml`.

## Labels

Transient:
- `READY_FOR_CLAUDE_CLOUD`
- `READY_FOR_SANTIAGO`

Durable:
- `VERIFIED`
- `COMPLETED`

Comments preserve history. Labels represent current actionable state.

Retired labels from older harness variants are cleanup-only and must not be used as active state:
`CHANGES_REQUESTED` (label form), `SANTIAGO_REVIEWING`, `WORK_IN_PROGRESS`,
`SANTIAGO_STALLED`, `CLAUDE_DISPATCHED`, `CLAUDE_WORKING`,
`CLAUDE_STALLED`, `NEEDS_ZANETA` (label form), `CORRECTION_IN_PROGRESS`,
and any `controller:*` label.

## Organization-owner adaptation

This repository is owned by the GitHub organization `bonafide-nitro`, not by an individual user. Workflows must therefore **not** compare a human commenter's login to `github.repository_owner`.

The authorized human login for bootstrap is `zanetaseiler`. The relevant workflows use repository variable `HARNESS_HUMAN_LOGIN` when configured, with `zanetaseiler` as the safe bootstrap fallback.

## Close/merge hygiene

`harness-label-close-cleanup.yml` removes transient/retired harness labels when an Issue/PR closes.

`harness-label-reconciler.yml` is the periodic fallback for closed items missed by the event-driven cleanup.

Neither may requeue Claude, wake Codex, reopen work, remove `VERIFIED`/`COMPLETED`, or touch an open item.

## Human activation checklist

After the bootstrap PR is VERIFIED and Žaneta approves its merge:
1. install/authorize Claude for `bonafide-nitro/bonafide-website` if not already available there;
2. create the four harness labels;
3. set `HARNESS_HUMAN_LOGIN=zanetaseiler` as a repository variable;
4. add the approved repository secrets needed by the chosen Claude/Codex bridges;
5. configure the Claude Routine saved prompt using `docs/AGENT_WORKFLOW.md`;
6. run one harmless documentation-only Block through the full loop;
7. only after that test is VERIFIED may Migration Stage 1 be dispatched.

No website build or production action is part of harness activation.
