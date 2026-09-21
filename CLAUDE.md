# CLAUDE.md

Claude Code entry point for this repository.

## Load first

Before starting or resuming any Block, read in full:
1. `AGENTS.md`
2. `docs/AGENT_WORKFLOW.md`
3. the Block Issue
4. the Block PR and all comments, if a PR already exists
5. for website work, `docs/migration/README.md` and the migration evidence it names.

Post a fresh `CONTEXT_RECEIPT` before any edit.

## Delivery

When the approved Block is complete:
1. push only to the Block branch,
2. open/update the Block's single PR,
3. post `READY_FOR_SANTIAGO` on that PR with the exact 40-character current head SHA and the required delivery fields,
4. apply the `READY_FOR_SANTIAGO` label to that PR,
5. STOP.

Never merge. Never continue into another Block. Never deploy or touch production without a separate explicit Žaneta approval recorded on GitHub.

If scope, business intent, credentials/apps/permissions, production effects, or the repository state require a decision not already authorized by the Block, post `NEEDS_ZANETA` and STOP.
