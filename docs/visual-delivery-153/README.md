# Block 153 — Phase 1 visual restoration (blog, articles, equipment, FAQ, wholesale)

Full-page Chromium screenshots (desktop 1440 / mobile 375) of the built `dist/`, served locally. No horizontal overflow and no broken images on any of them.

- `blog-*` — /blog/ (archive cards + pagination); `blog-page-2-*`
- `article-*`, `article-with-image-*` — /is-coffee-healthy/, /what-is-nitro-cold-brew-coffee/
- `equipment-kegerators-*`, `equipment-rental-*`, `nitro-coffee-kegs-*`
- `faq-*` — /nitro-coffee-questions/
- `wholesale-usa-*` — /interested-in-selling-usa/

Presentation only: shared hero/band layout and CSS in `src/layouts/Base.astro`, archive cards in `src/components/ArchiveList.astro`. Copy, canonicals, metadata, schema, commerce links and noindex states are unchanged. `/privacy-policies/` and `/terms-of-service/` are untouched.
