# Agent workflow — states and structured handoffs

This document defines the exact Block state machine for Claude ↔ Santiago/Codex ↔ Žaneta.

## States

| State | Meaning | Set by |
| --- | --- | --- |
| `READY_FOR_CLAUDE` | Block is approved for implementation. | Žaneta / approved GitHub record |
| `IMPLEMENTING` | Optional in-progress marker. | Claude |
| `READY_FOR_SANTIAGO` | PR delivery is ready for exact-head review. | Claude |
| `CHANGES_REQUESTED` | Bounded technical corrections are required. | Santiago/Codex |
| `NEEDS_ZANETA` | Human decision/approval/credential/permission is required. | Claude or Santiago |
| `VERIFIED` | Exact PR head independently verified; still unmerged. | Santiago/Codex |
| `COMPLETED` | Human-approved closure. | Žaneta |

Normal path:

`READY_FOR_CLAUDE_CLOUD` label → Claude → `READY_FOR_SANTIAGO` comment + label → Codex/Santiago review → `VERIFIED` → human merge gate.

Correction path:

`READY_FOR_SANTIAGO` → `CHANGES_REQUESTED` → `READY_FOR_CLAUDE_CLOUD` → Claude correction → fresh `READY_FOR_SANTIAGO` on the new exact head.

## Mandatory CONTEXT_RECEIPT

Before the first edit in every new/resumed Claude session:

```
CONTEXT_RECEIPT

- current base-branch commit SHA
- Block Issue and PR read
- files and authoritative docs inspected
- confirmed goal and non-goals
- expected files to change
- unresolved questions, if any
- whether any GitHub App, permission, secret, credential, production/live action, or human approval will be required
```

If the Block conflicts with current repository state or requires an unapproved decision, replace implementation with:

```
NEEDS_ZANETA

- decision/approval needed
- why the agent cannot resolve it safely
- what is blocked
```

and STOP.

## Claude delivery format

```
READY_FOR_SANTIAGO

- Block number
- exact head commit SHA: <40-character SHA>
- implemented
- deliberately not implemented
- files changed
- tests and results
- live/external effects: none | exact effects
- scope deviations: none | NEEDS_ZANETA instead
- required human setup, if any
```

Claude then applies the `READY_FOR_SANTIAGO` label to the PR and STOPS.

## Santiago/Codex review

Review the exact current head, not a branch name in the abstract. Record:
- reviewed exact commit SHA,
- acceptance-criteria result,
- scope result,
- independent checks performed,
- findings with severity and exact file/line where applicable,
- next state: `CHANGES_REQUESTED`, `NEEDS_ZANETA`, or `VERIFIED`.

A stale review never verifies a newer head.

## Human gates

Žaneta is required for:
- merge,
- deploy/publish/live mutation,
- WordPress/DNS/redirect/Search Console changes,
- credentials/secrets/permission grants/GitHub App installs,
- product/design/strategy/scope changes,
- an agent disagreement that cannot be resolved technically,
- any action with external or irreversible consequence.

## Claude cloud Routine transport

The initial and correction dispatch marker is the exact label:

`READY_FOR_CLAUDE_CLOUD`

`.github/workflows/claude-cloud-routine-bridge.yml` runs only for that label and calls `scripts/claude_cloud_bridge.py`.

The bridge uses claim-before-fire, at-most-once behavior:
1. confirm the queue label is present,
2. claim/remove it before firing,
3. for PR correction dispatches persist an exact round/head claim,
4. make one Routine fire request,
5. record `ROUTINE_DISPATCHED` or a sanitized `ROUTINE_FIRE_FAILED`,
6. never automatically retry an ambiguous fire.

The fired Routine's saved prompt must instruct Claude to:
- load `CLAUDE.md`, `AGENTS.md`, `docs/AGENT_WORKFLOW.md`, the exact GitHub Issue/PR, and for website Blocks the migration evidence;
- execute only the named Block;
- post `CONTEXT_RECEIPT`;
- use the existing Block branch/PR, or create the one allowed branch/PR if starting from an Issue;
- finish with `READY_FOR_SANTIAGO` plus exact head SHA;
- apply `READY_FOR_SANTIAGO` to the PR;
- STOP at `READY_FOR_SANTIAGO` or `NEEDS_ZANETA`;
- never merge, deploy, publish, create/change secrets, install apps, or fire/relabel the Routine itself.

## One-time activation items

Repository code is deliberately inert until the human-controlled external pieces exist:
- Claude GitHub App access to `bonafide-nitro/bonafide-website`;
- repository secret `CLAUDE_CODE_OAUTH_TOKEN` if the manual `@claude` workflow is used;
- `CLAUDE_ROUTINE_FIRE_URL`;
- `CLAUDE_ROUTINE_FIRE_TOKEN`;
- `SANTIAGO_CODEX_BRIDGE_TOKEN`;
- repository labels `READY_FOR_CLAUDE_CLOUD`, `READY_FOR_SANTIAGO`, `VERIFIED`, and `COMPLETED`.

Creating/installing any of those is a human-gated setup action. No agent may invent or expose secret values.
