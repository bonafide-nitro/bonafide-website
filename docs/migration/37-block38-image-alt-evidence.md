# Block 38 — Recover exact product image alt attributes from original HTML

Source: owner-supplied saved original WordPress HTML of `/products/` (WP page 147) and `/products-2/` (WP page 7801), read as inert text in ChatGPT. No source HTML or WP scripts committed.

Both pages explicitly show these `img alt` values next to these exact product-image paths:

| Original path | Exact original `alt` |
| --- | --- |
| `/wp-content/uploads/2019/05/Esspreso-Nitro-Coffee-for-website.png` | `Esspreso-Nitro-Coffee-by Bona Fide` |
| `/wp-content/uploads/2017/10/Ethiopia-Nitro-Coffeemfor-website.png` | `Nitro Coffee Ethiopia image for website` |
| `/wp-content/uploads/2022/05/Hazelnut-Nitro-by-Bona-Fide.png` | `Bona-Fide-Nitro-Coffee-And-Tea-hazelnut-creme` |
| `/wp-content/uploads/2022/05/Vanilla-Nitro-by-Bona-Fide.png` | `Vanilla-Nitro-by-Bona-Fide` |

These strings are intentionally preserved byte-for-byte, including misspellings/hyphens; they are not rewritten as marketing copy. Vanilla image occurs for two product records and retains the same alt.

Other product images in the original HTML often have `alt=""`; no descriptive alt has been fabricated to fill those blanks. Product images are still conditionally rendered only if exact-case binary exists in `public/wp-content/uploads/`. **This evidence-only PR does not import new image binaries**, remove scaffolds, or lower the Stage-8 strict QA findings (last known baseline: 40).

The conversation's media recovery artifact contains 30 exact original images in the owner-provided 404MB archive and an independent CSV of the saved HTML source `alt` values. Those materials remain outside GitHub until a reviewed source-to-repository binary import is authorized.

No deployment, WordPress, GoDaddy, DNS, SEO redirect, or live site change.
