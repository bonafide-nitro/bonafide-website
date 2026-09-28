# Bona Fide Nitro Coffee and Tea — Website

This private repository is the GitHub source of truth for the rebuild of **bonafidenitro.com** from WordPress to a static website.

## Current project state

- Existing WordPress production remains live.
- The domain is not changing.
- The approved static framework is **Astro**.
- No production deployment is connected yet.
- An Astro static-site foundation (placeholders + data contracts) exists; see `docs/STATIC_SITE_STRUCTURE.md`.
- No WordPress files, DNS, redirects, Search Console settings, or production content should be changed merely because this repository exists.
- Migration evidence and preservation requirements live in `docs/migration/`.

## Migration rule

**Preserve first, optimize later.**

Before implementation, read `docs/migration/README.md` and all four authoritative evidence documents in that directory.
