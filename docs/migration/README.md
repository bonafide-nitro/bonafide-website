# Migration Evidence — Read First

These files are the authoritative pre-build evidence for the Bona Fide WordPress-to-static migration.

## Read in this order

1. `01-pre-migration-seo-baseline.md`
2. `02-seo-raw-data-appendix.md`
3. `03-products-products-2-forensic-seo-preservation.md`
4. `04-wordpress-to-static-migration-master-plan.md`

## Working rules

- Do **not** re-audit or replace these documents unless explicitly requested.
- Do **not** modify production WordPress, DNS, redirects, Search Console, or hosting configuration merely from reading these files.
- The migration is on the **same domain**: `bonafidenitro.com`.
- **Astro** is the approved static framework.
- `/products/` and `/products-2/` must remain separate static **200** pages at initial migration, with their existing distinct search intent preserved.
- Do not copy the existing WordPress theme PHP, injected header scripts, or compromised filesystem into the static build.
- The current WordPress installation is evidence, not the final rollback asset. A cleaned WordPress copy is required before cutover.
- Where the final migration master plan explicitly refines an earlier preliminary recommendation, follow the master plan.

## Status

Evidence repository setup only. No build or deployment is authorized by this documentation commit.
