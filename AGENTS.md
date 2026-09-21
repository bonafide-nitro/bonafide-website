# AGENTS.md — Canonical multi-agent protocol

This file is the source of truth for AI-agent work in `bonafide-nitro/bonafide-website`.
GitHub Issues, PRs, comments and exact commit SHAs are the persistent project state.
Chat history is not authoritative.

## Operating model

Žaneta defines and approves the goal and material boundaries
→ Claude implements one bounded Block
→ Santiago/Codex reviews the exact PR head
→ Claude corrects recorded findings only
→ Santiago verifies the exact corrected head
→ Žaneta remains the human gate for merge and every consequential action.

## One Block = one Issue = one branch = one PR

Every implementation Block must have a GitHub Issue that states:
- purpose and goal,
- acceptance criteria,
- in-scope files/surfaces,
- explicit non-goals,
- tests,
- consequence class,
- approval gates,
- dependencies,
- STOP condition.

Implementation never starts on `main`. A Block uses one branch and one PR. Corrections stay on that same branch/PR.

## Required context before edits

Before Claude edits anything for a Block it must:
1. read this file,
2. read `CLAUDE.md`,
3. read `docs/AGENT_WORKFLOW.md`,
4. read the Block Issue and existing PR/comments,
5. for website-migration work, read `docs/migration/README.md` and the authoritative migration documents it names,
6. post a fresh `CONTEXT_RECEIPT`.

A resumed session posts a new `CONTEXT_RECEIPT`; it does not trust prior chat context.

## STOP rule

Phase boundaries are real stops:
- Claude finishes implementation → posts `READY_FOR_SANTIAGO` with the exact 40-character head SHA, applies the `READY_FOR_SANTIAGO` label to the PR, then STOPS.
- Santiago finds a bounded technical issue → records `CHANGES_REQUESTED` against the exact head. The harness may dispatch Claude for a correction on the same PR.
- Santiago verifies → `VERIFIED` records the exact verified head. This does **not** authorize merge.
- Any ambiguity, business decision, credential/app installation, permission grant, live action, production mutation, or scope conflict → `NEEDS_ZANETA` and STOP.

## Consequential actions

No agent may merge, deploy, publish, alter the live WordPress site, change DNS, change redirects, submit Search Console actions, send customer communications, spend money, install a GitHub App, create/change a credential or secret, or otherwise make a consequential external change without Žaneta's explicit recorded approval for that exact action.

Approval of one action never implies approval of the next.

## Exact-head anchoring

Every delivery, review, correction and verification names the exact PR-head SHA it applies to. A stale SHA is not valid evidence.

## Migration-specific boundaries

Until a Block explicitly authorizes otherwise:
- no Astro scaffold,
- no production deployment,
- no WordPress modification,
- no redirect change,
- no security remediation before forensic preservation,
- no SEO optimization mixed into migration preservation,
- `/products/` and `/products-2/` remain separate launch URLs.

The migration evidence in `docs/migration/` is authoritative.

## Bootstrap exception

Issue #1 / the initial harness bootstrap PR is the only repository-setup exception to the normal dispatch path because the harness did not yet exist. Once merged and activated, later implementation work must use the harness.
