# Block 5 (Issue #27) — Batch 2 migration results and remaining gaps

Source: the public rendered-page evidence summarised in Issue #27 (supplied by Santiago/ChatGPT). No live site, WordPress, cPanel, credential or network access was used by the implementing session.

## Migrated (static Astro, exact launch title/H1, self-canonical, indexable, Organization + WebSite + WebPage + BreadcrumbList JSON-LD, no scripts)
| URL | Title | H1 |
| --- | --- | --- |
| `/kegerators/` | Kegerators - Bona Fide Nitro Coffee | Equipment to Serve Nitro Cold Brew Coffee |
| `/nitro-cold-brew/` | Nitro Cold Brew - Bona Fide Brewing Company - Nitro Coffee Experts | ALL ABOUT NITRO COLD BREW COFFEE |
| `/hot-nitro-coffee/` | Hot Nitro Coffee - Bona Fide Nitro Coffee | Hot Nitro Coffee |
| `/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/` | Cold Brew Bag In Box Coffee - Bona Fide Nitro Coffee | Cold Brew Bag In Box Coffee |
| `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/` | Nitro Coffee\| Health and benefits of drinking Nitro Coffee\| Bona Fide | HEALTHY BENEFITS OF DRINKING NITRO COFFEE, IS NITRO COFFEE HEALTHY? |
| `/about/` | Nitro Coffee Best Quality - Bona Fide Nitro Coffee Experts | Bona Fide Nitro Coffee and Tea |

`src/data/seo-baseline.json` gained `titleMustContain` / `h1MustContain` contracts for the six URLs (now enforced by QA T4). `tests/foundation/block5-pages.test.mjs` checks the exact title/H1, canonical, schema, no scripts, the three exact `/kegerators/` store destinations, vocabulary and the scaffold/`<img>` rules.

## /kegerators/ external destinations
The three observed store URLs are rendered exactly as supplied. The first (single-unit countertop starter kit, `...?variant=41629884055715`) currently returns 404 on the store; it is preserved as observed evidence and **not** replaced. Decision needed later (not in this Block): whether to keep or repoint it.

## Images — migration-remaining (not invented)
No image binaries were available to this session, and QA T7 requires every referenced `/wp-content/uploads/` file to exist, so **no page references an image and no `<img>` is emitted**. Exact evidenced paths still to be supplied as binaries (plus alt text) and then rendered:
- `/nitro-cold-brew/`: `/wp-content/uploads/2018/06/All-about-nitro-cold-brew-coffee.jpg`, `/wp-content/uploads/2018/06/Cold-brew-Nitro-Coffee.jpg`; the master-plan ranking images `Kegerator-counter-top-Bona-Fide.jpg`, `Nitro-Coffee-Explain-Graphic-Bona-Fide-Keg-Tap.jpg`, `Bona-Fide-Cold-Dispenser-countertop-small-min-1.png` and the 2023 `Nitro-Coffee-Explain-Graphic-*` set (upload directories/exact filenames not evidenced in the repo — not invented).
- `/kegerators/`: `Kegerator-counter-top-Bona-Fide.jpg`, `Bona-Fide-Cold-Dispenser-countertop-small-min-1.png` (upload directories not evidenced) and the three equipment images already recorded in doc 08.
- `/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/`: `/wp-content/uploads/2024/11/Bag-In-Box-And-Pouch-Shopify-Glass-Cold-Coffee.jpg`.
- `/about/`: `/wp-content/uploads/2022/04/Bona-Fide-Facilities-1.jpg`; facilities images 2–8 (paths not evidenced).
- `/hot-nitro-coffee/`, `/healthy-benefits-…/`: no image path evidenced; full inventory unknown.

## Other gaps
- Meta descriptions of the six pages are not in the repo/evidence and are not emitted (`Base` has no description prop); they must survive unchanged at launch.
- Body copy is a faithful paraphrase of the meaning listed in the Issue (allowed by the preservation map); sections marked "Core Values" and "Where Do We Fit" are thin because the rendered text was not supplied — flag for review against the live page. Nothing was invented as a health claim.
- `/healthy-benefits-…/`: any externally sourced/video material is omitted (no evidenced destinations). `/hot-nitro-coffee/`: author/article semantics not rendered (not evidenced).
- `/about/`: 10,000+ kegs/month is carried as the currently rendered claim.
- Internal links to `/contact-bona-fide-nitro-coffee-and-tea/`, `/nitro-coffee-questions/`, `/blog/` (nav) point at still-unbuilt launch URLs (migration-remaining, same as Block 4).

## Scaffold marker
Kept on all six pages: title/H1/canonical/schema/copy are in place, but image preservation is unproven, so removing the marker would falsely certify preservation. Existing Block-4 pages, product-page separation and the commerce gates are untouched.

## Results
Foundation QA: PASS, 0 invariants; 51 migration-remaining (was 55). Strict: FAIL (expected). `npm test` 163/163, Python isolation 303/303, `npm run build` + `npm run check:dist` OK. The reduction is modest because the six pages remain scaffold-marked.
