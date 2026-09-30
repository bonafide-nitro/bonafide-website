# Block 6 (Issue #30) — Batch 3 non-blog Tier-1 migration results and remaining gaps

Source: only the public rendered-page evidence in Issue #30 plus repo evidence. No live site, WordPress, cPanel, credential or network access was used. `/blog/` and its posts are deliberately deferred to the next Block.

## Migrated (static Astro, exact launch title, self-canonical, indexable, Organization + WebSite + WebPage + BreadcrumbList JSON-LD, no scripts, no forms)
| URL | Title | H1 |
| --- | --- | --- |
| `/contact-bona-fide-nitro-coffee-and-tea/` | Contact - Bona Fide Nitro Coffee And Tea | Contact |
| `/coffee-on-tap-is-the-future/` | COFFEE “ON TAP” IS THE FUTURE - Bona Fide Nitro Coffee | COFFEE “ON TAP” IS THE FUTURE |
| `/nitro-coffee-kegs/` | Nitro Coffee Kegs - Bona Fide Nitro Coffee & Tea Experts | Nitro Coffee Kegs |
| `/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/` | 3 Cups of Coffee a Day: Why It Can Be Good for the Health | same as title |
| `/nitro-coffee-questions/` | Nitro Coffee Bona Fide\| FAQ\| Find the right answer | Nitro Coffee Questions (**added**; live page has no H1 — allowed improvement, not a QA contract) |
| `/hot-nitro-equipment-rental/` | Hot Nitro Equipment For Rent in EU - Bona Fide Nitro Coffee | Hot Nitro Equipment For Rent in EU (**derived from the title, not a historical H1**; no `h1MustContain`) |

`src/data/seo-baseline.json` gained `titleMustContain` (all six) and `h1MustContain` (contact, on-tap, kegs, 3-cups) contracts. `tests/foundation/block6-pages.test.mjs` covers exact titles/H1s, canonical, schema, no scripts/forms/PDF/img, evidenced contact details and the vocabulary.

## Scaffold marker — kept on all six (nothing falsely certified)
- **Images:** no binaries or exact upload paths supplied; no `<img>` emitted (QA T7).
- **Meta descriptions:** not in evidence; not emitted (`Base` has no description prop). Must survive unchanged at launch.
- **Body copy:** rewritten from the meaning listed in the Issue; the live rendered text was not supplied, so all copy should be reviewed against the live pages. Nothing invented as a health claim.

## Per-page gaps
- **Contact:** the inquiry form is **Stage 7**; no `<form>`, endpoint or CF7 is present. Categories/fields are listed as text. Address/phone/email and the `https://www.nitrocoffee.store/` webstore CTA come from the Issue/nav.
- **Coffee on tap:** author shown; article dates not evidenced (omitted). The later update (long-term market presence / interview) is not rendered — no destination evidenced. Article schema not emitted (dates/images unevidenced).
- **Nitro coffee kegs:** copy is a paraphrase of the listed vocabulary; keg images and volumes not evidenced. 5 external links point here — URL/title/H1 unchanged.
- **3 cups:** external references omitted (no evidenced destinations); Article schema not emitted; dates not evidenced; general-information disclaimer added, no claims strengthened.
- **FAQ:** answers are minimal and restricted to evidenced facts (180-day shelf-stable ambient keg); the live answers for custom coffee, tea, flavors, pallet quantities, co-branding/Alliance were not supplied and are routed to the contact page. **FAQ schema not emitted** because rendered answers are not evidenced. The brochure PDF and Draft System SOP are listed as migration-remaining — exact PDF URLs not evidenced, so **no links emitted**.
- **Hot nitro rental:** current rental/EUR prices not evidenced (stated as migration-remaining); no booking/payment flow; historical heading structure unknown.
- Links from the new pages go only to built URLs (plus the store); the existing nav still links to unbuilt `/blog/`.

## Results
Foundation QA: PASS, 0 invariants; 49 migration-remaining (was 51). Strict: FAIL (expected). `npm test` 173/173, Python isolation 303/303, `npm run build` + `npm run check:dist` OK. Live/external effects: none.
