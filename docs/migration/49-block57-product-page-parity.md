# Block 57 — Retail/wholesale product-page content parity (Issue #130)

Repository-only. No styling, SEO metadata, canonical, commerce href, WordPress, hosting, DNS, redirect, Search Console or deploy action.

## Compared
`src/pages/products/index.astro` and `src/pages/products-2/index.astro` against doc 03 (§4b/§4c), doc 08 and doc 39.

## Implemented (verified by doc 03 §4c)
- Heading level of "Nitro Coffee For Home": retail **H3** (was H2), wholesale **H2** (was H3). Text unchanged.

## Unresolved — evidence gaps (not written, no placeholder prose)
Retail sections recorded by doc 39 only as truncated stubs; the full heading text, body copy, links and exact position are not retained anywhere in the repository:
1. "Brewing Craft…" (doc 03 §4b gives only the body opening "It takes clever minds… specialty varieties from top tea merchants and coffee roasters"; wholesale equivalent "It takes gallant brewers…").
2. "Buy Nitro Cold Brew Kegs…"
3. "Buy Better Than Cold Brew… Bag In Box"

Other recorded-but-truncated or unplaced items, left as-is: opening lines ("…until Bona Fide® Nitro Cold Brew Coffee in a Keg comes along!"), "…Keg Suppliers In The USA" (retail H3) / "…in the US" (wholesale H2), "Preferred/Calibrated by Master Roasters", per-SKU "Buy Securely In Our NitroCoffee.Store And Save" / "Buy Securely On Amazon.com" CTA pairs, Nitro/Still toggles, closing CTA "LEARN ALL ABOUT COLD BREW NITRO COFFEE" (target URL not evidenced). The saved historical HTML is not committed; supplying it would let these be completed.

## Unchanged blockers
Scaffold markers on both pages, store-link minimums (retail 16, wholesale 22 not met), `ranking-list-incomplete` and the strict QA blockers remain.
