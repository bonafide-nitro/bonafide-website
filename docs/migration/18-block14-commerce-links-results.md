# Block 14 — Centralized external commerce links (Issue #46)

Stage 7 — Integrations. Repository-only; no live store, WordPress, DNS, redirect, hosting or provider action.

## What changed
- `src/data/commerce.yaml` (new) is the registry for non-product store links (webstore roots, Bag In Box collection, three equipment links) and an explicit `unresolved` register (metadata only, no `href`).
- Per-product store hrefs stay in `src/data/products.yaml`; both files are validated by the same rule in `src/lib/data.mjs`: `https://`, host `nitrocoffee.store` / `www.nitrocoffee.store` only, no query parameters other than the already-evidenced `variant`, no fragments. Unresolved entries are strict and cannot carry an `href`.
- `src/lib/commerce.mjs` `commerceHref(id)` resolves a registered id and throws at build time for an unknown id. Eight pages now use it instead of inline literals.
- Built `dist/` is byte-identical to the pre-change build (`diff -r` clean): every href is preserved exactly, no copy, SEO, canonical, sitemap or redirect change.

## Unresolved (not invented, not rendered as links)
13 `/products/` Amazon hrefs; retail Vanilla store href; Decaf Mexico store href; 6 Alliance store hrefs on `/products-2/`; `/howtobuy/` distributor/partner hrefs. The nine `pending-decision` `/services/*` redirect fragments in `redirects.yaml` remain `to: null` and are not commerce links.

## Evidenced href counts (deduplicated per page)
`/products/` 13, `/products-2/` 12 (distinct sets, no Amazon on either); other pages as pinned in `tests/foundation/block14-commerce.test.mjs`.

## QA
`tests/foundation/block14-commerce.test.mjs` pins the exact href set of every page, host/https/parameter rules, schema rejection cases, no Amazon hrefs, no pending-decision fragment in dist or the registry, no inline store literals in `src/pages`, and that strict QA still reports `commerce-inventory-missing`, `amazon-links-min` and `store-links-min`. `qa/qa.config.json > commerceInventory` is untouched and still empty, so the exact-inventory gap stays migration-remaining and the scaffold markers stay.
