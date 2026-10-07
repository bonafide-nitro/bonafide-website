# Block 22 (Issue #62) — Remaining 8 `/services/*` redirects

Repository-only. No production, WordPress/cPanel, DNS, Search Console, hosting, credential, staging, deployment or live redirect action.
Authority: `OPERATOR_EVIDENCE` (public read-only verification of the exact product pages) and `ZANETA_DECISION` on Issue #62 (2026-10-07), applied exactly.
This sandbox cannot reach `www.nitrocoffee.store` (egress proxy 403), so the evidence below is the operator's recorded verification, not re-fetched here.
No destination was invented or constructed from a naming pattern; none redirects to the store homepage.

## 8-row evidence table
| # | id | source | final state | destination | evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `svc-peru` | `/services/peru-organic/` | `defined` | `https://www.nitrocoffee.store/products/organic-peru-nitro-coffee-5-gal-pet-keg` | OPERATOR_EVIDENCE: direct public product page; ZANETA_DECISION approved |
| 2 | `svc-ethiopia` | `/services/ethiopia-yirgacheffe-organic/` | `defined` | `https://www.nitrocoffee.store/products/organic-ethiopia-yirgacheffe-nitro-coffee-5-gal-pet-keg` | OPERATOR_EVIDENCE; ZANETA_DECISION approved |
| 3 | `svc-guatemala` | `/services/guatemala-organic/` | `defined` | `https://www.nitrocoffee.store/products/guatemala-organic-nitro-coffee` | OPERATOR_EVIDENCE; ZANETA_DECISION approved |
| 4 | `svc-hibiscus` | `/services/organic-hibiscus-tea/` | `defined` | `https://www.nitrocoffee.store/products/organic-hibiscus-nitro-tea` | OPERATOR_EVIDENCE; ZANETA_DECISION approved |
| 5 | `svc-espresso` | `/services/espresso-organic-nitro-coffee/` | `defined` | `https://www.nitrocoffee.store/products/organic-espresso-nitro-pet-5-gal-1` | OPERATOR_EVIDENCE; ZANETA_DECISION approved |
| 6 | `svc-passion-fruit` | `/services/passion-fruit-tea/` | `defined` | `https://www.nitrocoffee.store/products/organic-passion-fruit-nitro-tea-pet-5-gal` | OPERATOR_EVIDENCE; ZANETA_DECISION approved |
| 7 | `svc-green-citrus` | `/services/green-citrus-nitro-tea/` | `deliberate-404` | — | not in public catalog; ZANETA_DECISION: deliberate-404, no invented URL, no homepage redirect |
| 8 | `svc-cascara` | `/services/cascara-coffee-cherry-tea/` | `deliberate-404` | — | same as row 7 |

## Register accounting (58 rules)
| state | count | emitted to `.htaccess` |
| --- | --- | --- |
| `defined` | 41 (+6) | yes (`# Rules: 41`) |
| `pending-decision` | 0 (-8) | no |
| `deliberate-404` | 14 (+2) | no — real 404 on the static host |
| `dropped` | 3 | no |

All Block-21 dispositions are unchanged. 301-only, one-hop and protected-URL invariants are preserved (foundation QA: 0 invariants).

## Verification
`npm run build`, `npm run check:dist`, `npm run check:htaccess`, `npm test` (269/269), Python isolation, foundation QA (PASS, 0 invariants), strict QA (fails as expected on migration-remaining findings only, 0 invariant). Tests pin the 41/0/14/3 counts, the six exact destinations, and that the two `deliberate-404` service entries have no destination and no emitted rule.

## Still open — Stage 8 remains INCOMPLETE
No pending-decision redirects remain. Production-host staging verification of the artifact and all other independent Stage-8 blockers in docs 19/20 are unchanged. The `deliberate-404` paths are 404s only once the static build is live. This Block does not authorize deployment, cutover or Stage 9.
