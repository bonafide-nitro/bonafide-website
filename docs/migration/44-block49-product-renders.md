# Block 49 — Web-optimised product renders (Issue #114)

Repository-only. No WordPress, hosting, DNS, redirect, live-site, deployment or Search Console action. The renders are **not placed** on any page.

## What these files are
New marketing images requested by Žaneta on 2026-10-14. They are **not** original WordPress uploads and are deliberately kept outside `/wp-content/uploads/` so they cannot be confused with preserved migration evidence.

Source: four Meshy AI 3D models (`.glb`, 10–29 MB each) supplied by the owner. Each was rendered once as a flat product shot (three.js in headless Chromium: studio environment lighting, soft ground shadow, transparent background), cropped to the subject, resized to 800 px tall, then saved as a quantised PNG and a WebP (quality 86).

| File (in `public/images/product-renders/`) | Size |
| --- | --- |
| `bona-fide-classic-blend-box-with-cups.png` / `.webp` | 229 KB / 80 KB |
| `bona-fide-classic-blend-box.png` / `.webp` | 215 KB / 59 KB |
| `bona-fide-iced-coffee-with-cream.png` / `.webp` | 140 KB / 46 KB |
| `bona-fide-nitro-coffee-keg.png` / `.webp` | 86 KB / 26 KB |

Pinned by path, size and SHA-256 in `tests/foundation/block49-product-renders.test.mjs`, which also asserts that nothing under `src/` references them yet.

## Known limitation
The label lettering comes from the AI model's texture. Headline text (BONA FIDE, COLD BREW COFFEE, CLASSIC BLEND) is legible; small print on the boxes is garbled. Consider this before showing them large.

## Deliberately not done
Placement, alt text, page layout and any SEO change are left to a later Block with Žaneta's decision.
