# Block 29 (Issue #76) — Non-article scaffold markers

Repository-only. No production, WordPress/cPanel, DNS, Search Console, hosting, credential, staging, deployment, commerce, redirect, external-retrieval or Stage 9 change.

## Method
The 20 non-article routes still triggering `T5 placeholder-page` were identified from source (`<Base ... scaffold>`), inspected against their in-source scaffold declarations and the preserved evidence (docs 07–20, `qa/t7-image-manifest.json`). A marker is removed only if the page is migration-complete from repo evidence; criteria match Block 28 (missing meta/images alone are not invented; an unresolved destination, provider value, legal copy, binary-dependent requirement or business decision is a blocker).

## Routes cleared
**None (0 of 20).** Every route has at least one independent unresolved requirement (below). Per the Issue's STOP clause the markers were left unchanged; nothing was invented.

## Routes still scaffolded and why
| Route | Exact blocker |
| --- | --- |
| `/` | homepage testimonial section and Review/rating schema are not preserved: decision I7 (self-serving review markup) is an unresolved business decision; hero imagery not recovered |
| `/about/` | facilities gallery not rendered: the eight original Bona-Fide-Facilities-{1..8}.jpg binaries are present (Block 47, #111) but gallery order, which variants (2022 JPG vs older PNG) were displayed, and original alt text are not evidenced |
| `/blog/` | post excerpts, categories and card images are not preserved |
| `/book-appointment/` | exact live Calendly URL is not in repository evidence; supplied only via PUBLIC_CALENDLY_URL, which a human must configure |
| `/contact-bona-fide-nitro-coffee-and-tea/` | page meta description not preserved and no form provider endpoint is configured (form renders disabled) |
| `/hot-nitro-equipment-rental/` | images and meta description not preserved; no single historical H1 is evidenced (H1 is derived from the launch title) |
| `/howtobuy/` | image binaries and alt text not preserved; the baseline's 13 outbound distributor/partner links are not captured (only store anchors linked) |
| `/interested-in-selling-eu-and-usa/` | images and meta description not preserved; CTA destinations (some Google Docs) not evidenced; nitro information/quiz not preserved |
| `/interested-in-selling-eu-qr-2/` | images and meta description not preserved; CTA destinations (some Google Docs) not evidenced; nitro information/quiz not preserved |
| `/interested-in-selling-usa/` | images and meta description not preserved; lead form and SCHEDULE A DEMO destination not evidenced (Stage 7); CTA is a label only |
| `/kegerators/` | equipment image binaries (e.g. Kegerator-counter-top-Bona-Fide.jpg) and alt text not supplied; first CTA destination returns 404 on the store (preserved as observed) |
| `/nitro-coffee-kegs/` | keg images have no evidenced upload paths and the meta description is not preserved |
| `/nitro-coffee-questions/` | the Nitro Coffee brochure PDF and Draft System SOP have no evidenced upload paths; live answers were not supplied (answers are rewritten); meta description not preserved |
| `/nitro-cold-brew-coffee-made-easy-2/` | meta description and images not preserved; the interactive branching/serving-volume form is not recreated (Stage 7) |
| `/nitro-cold-brew-old/` | page images and meta description not evidenced; body is a conservative paraphrase of the topics listed in Issue #34 (exact copy not preserved) |
| `/nitro-cold-brew/` | ranking image binaries (All-about-nitro-cold-brew-coffee.jpg, Cold-brew-Nitro-Coffee.jpg and others) and alt text not supplied |
| `/privacy-policies/` | exact legal body copy, live title and meta description are not in any repository evidence; legal copy must not be invented |
| `/products-2/` | exact commerce inventory (22 nitrocoffee.store hrefs incl. Alliance CTAs) unresolved; image binaries, alt text, meta description not preserved |
| `/products/` | exact commerce inventory (13 Amazon + 16 store hrefs) unresolved; image binaries, alt text, meta description not preserved |
| `/terms-of-service/` | exact legal body copy, live title and meta description are not in any repository evidence; legal copy must not be invented |

## Placeholder count (`T5 placeholder-page`, strict QA)
- Before: 35 (15 article + 20 non-article)
- After: 35 (15 article + 20 non-article)

## Determinism
`qa/qa.config.json -> nonArticleScaffold` declares `cleared` (empty) and `remaining` (20, with blockers). `tests/foundation/block29-nonarticle-scaffold.test.mjs` requires the declaration to be disjoint from `articleRoutes`, the set of source pages carrying a marker to equal article-remaining + non-article-remaining exactly (so a new or removed marker cannot drift silently), each source and built `scaffold-placeholder` to match, and cleared routes to carry no marker or scaffold comment. The Block-28 `articleScaffold` declaration is unchanged.

## Remaining independent Stage-8 blockers
All 35 scaffolded pages (15 article + 20 non-article), T7 image binaries, commerce inventories, meta descriptions, legal pages, decision I7, Calendly/form-provider values, Stage-7 interaction work, staging verification, forensic/security steps. **Stage 8 remains INCOMPLETE.**
