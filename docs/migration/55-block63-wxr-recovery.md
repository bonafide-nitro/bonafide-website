# Block 63 — WordPress export (WXR) recovery and exact-text port (Issue #143)

Repository-only. No WordPress, hosting, DNS, redirect, Search Console, tracking or deployment action. No network request was made by any script or test in this Block.

## Source and what was *not* done
- **Public-site GET capture (Issue §1) was not performed.** The cloud environment's network policy blocks `bonafidenitro.com` (recorded in the earlier `NEEDS_ZANETA`). Route count queried over HTTP: **0**; URLs successfully captured over HTTP: **0**. The owner replaced that source with the WordPress "All content" export dated 2026-10-19 (`bonafidenitrocoffee.WordPress.2026-10-19.xml`, 13,456,746 bytes), read from the temporary branch `source/block63-wxr-intake` (blob `f0da450f4e7d493a0c856d1d678e9b3bc743b6a0`).
- That export is **current WordPress source evidence, not verified historical source, and not an image backup**. The raw XML is **not** in this branch or in `main` and is not part of the Astro build or release package (a test fails if an XML export is committed).

## What was built
| File | Purpose |
| --- | --- |
| `scripts/wxr-extract.mjs` | Offline parser (Node stdlib). Reads one local WXR file and writes a sanitized per-route manifest. Drops scripts, styles, iframes, forms, inputs, shortcodes, event-handler attributes, unsafe link schemes, page-builder/Thrive JSON, author accounts, comments, private post meta and personal mailbox addresses. Keeps title, `_aioseop_title`/`_aioseop_description`, date, categories, ordered text blocks, link targets (classified), image references and FAQ accordion entries. |
| `docs/migration/data/block63-wxr-evidence.json` | The sanitized evidence for the 34 published pages/posts that have an Astro route, plus the 4 FAQ accordion groups. Outside `src/`, `public/` and the build. Regenerate with `node scripts/wxr-extract.mjs --wxr <file> --routed-only --out docs/migration/data/block63-wxr-evidence.json`. |
| `scripts/wxr-port-articles.mjs` | Deterministic port of that evidence into the existing Astro pages and into the Block 28/29 scaffold contract in `qa/qa.config.json`. |
| `tests/foundation/block63-*.mjs` | 29 new tests (extractor sanitisation, evidence hygiene, exact-text port, description equality, image/embed/link evidence) plus a shared helper. |

## Result
**Export coverage:** 36 route directories in `src/pages`; 34 have a published page/post in the export (`/author/` and `/category/` are archive routes with no export page); **19 of 34 pages were ported with exact text**, in original order:

- 15 articles: all article routes in `qa.config.json` (the exact text replaces the earlier paraphrases/summaries, which differed materially — e.g. the FAQ had stated flavored coffee is "part of the range" while the original answer says there are no flavored house SKUs).
- 4 pages: `/howtobuy/`, `/about/`, `/nitro-coffee-kegs/`, `/nitro-coffee-questions/` (FAQ answers from the four accordion groups; the three pre-existing "historical article" editorial notices on health/commercial posts were kept and are not original copy).
- Meta descriptions from `_aioseop_description` were applied where the export carries one (`/howtobuy/` is new; the others already matched).
- `/what-is-nitro-cold-brew-coffee/` now renders its image at the exact path with the export alt text and dimensions: the export places it inline in the article body (this was the missing page-level evidence recorded in Block 55).

**Scaffold flags cleared (2):** `/a-touch-of-vanilla-to-your-nitro-coffee/` and `/nitro-coffee-in-time-of-covid-19-pandemic-how-safe-is-it/` — exact text, no image/embed references in the export, byline/dates already evidenced. All other flags stay, with updated blockers (below). `/hot-nitro-coffee/` stays because the original on-page byline is not evidenced.

## Strict QA reconciliation (40 → 40, different composition)
Before: 2 commerce-inventory-missing, 35 placeholder-page, 2 store-links-min, 1 ranking-list-incomplete.
After: 2 commerce-inventory-missing, **33** placeholder-page, **2 content-missing (new)**, 2 store-links-min, 1 ranking-list-incomplete. No gate, threshold or rule was changed.

- `content-missing` ×2 is a *new honest finding*: the baseline `mustContainText` "organic coffee for cancer" (`/coffee-doesnt-produce-cancer-…/`) and "millennials coffee" (`/coffee-trends-dominate-2018/`) are search-query phrases that the exact export text does not contain. The earlier paraphrases had inserted them. They were not re-invented. **Decision needed from Žaneta** whether the baseline phrases should stay required (then copy must be added by a human) or be re-based on the original text.
- `store-links-min` stays: `/products/` exports 13 Amazon + 1 store-collection destination and `/products-2/` exports no external links; the 16 retail / 22 wholesale targets are **not supported by this export**. No store href was invented. (The `howtobuy` apex e-shop link is registry id `webstore-root-apex`.)
- `commerce-inventory-missing`, `ranking-list-incomplete`: unchanged, the export has no data for them.
- The 13 outbound distributor links of `/howtobuy/` are **not in the export** (only the e-shop image link; `bit.ly` redirect fragments appear in old page-builder revisions and are never rendered).

## Not ported (and why)
`/` (homepage), `/blog/`, `/book-appointment/`, `/contact-…/`, `/products/`, `/products-2/`, `/kegerators/`, `/nitro-cold-brew/`, `/nitro-cold-brew-old/`, `/nitro-cold-brew-coffee-made-easy-2/`, `/interested-in-selling-*` (×3), `/hot-nitro-equipment-rental/`: their text is in the evidence file, but each is tied to pinned commerce destinations, product cards, curated media order or interactive behaviour that earlier Blocks froze, and a trial port broke ~15 of those guards. Overwriting them risked dropping already-evidenced content, so they were left for a follow-up Block.
`/privacy-policies/` and `/terms-of-service/`: **deliberately not ported — decision needed.** The export holds the legal text, but the terms include the operator's personal mailbox and the privacy text describes DoubleClick/AdSense cookie practice that may not match the new static site. Publishing legal copy is a business/legal decision; both stay `noindex` + scaffold.

## Still unavailable (needs a human or another source)
- Image binaries: the export has references and alt text but no files. Missing per page is listed in each blocker in `qa/qa.config.json` (e.g. `/about/` 40, `/howtobuy/` 29, `/hot-nitro-equipment-rental/` 26). Gallery order for the 8 facilities images is now evidenced (`…-Facilities-1…8-300x183.jpg`), but those thumbnail files are absent and the full-size files are different paths, so no gallery was rendered.
- The brochure PDF `/wp-content/uploads/2019/06/4-Pages-Emailable-PDF-Bona-FIde-Nitro-Coffee-and-Tea-for-website-download.pdf` is evidenced as the FAQ download but the binary is absent; no link is rendered.
- Video embeds: YouTube destinations are now evidenced and rendered as plain links (never iframes). Their original in-page position is not evidenced.
- Original health/commercial claims are now present verbatim in the health articles (e.g. benefits statements); the earlier guard against "strengthened claims" is kept as "no claim words beyond the original wording".

## Test-contract changes (for review)
Older foundation tests pinned the paraphrase vocabulary. Each changed assertion was *replaced*, not removed: a phrase must still be on the page **or** be provably absent from the exact export text of the same route (`tests/foundation/block63-helper.mjs`). The Block 55 test now asserts the single evidenced image render; Block 36 permits the `/howtobuy/` description only if it equals the export value; Block 14 adds the apex store root to `/howtobuy/`'s expected set.
