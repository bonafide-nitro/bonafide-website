# Block 23 (Issue #64) — Article + Person schema gate

Repository-only. No production, WordPress/cPanel, DNS, Search Console, hosting, credential, staging, deployment, analytics or live-site change.

## What is emitted
`src/layouts/Base.astro` calls `articleNodes()` (`src/lib/article-schema.mjs`). On the 15 historical post routes (the evidenced `/blog/` archive: `PAGE1` 10 + `PAGE2` 5 in `src/lib/archive.mjs`) the existing `@graph` gains:

- `Article`: `@id` `<page>#article`, `headline` (archive title), `mainEntityOfPage` → the page's existing `#webpage`, `datePublished` (archive date), `dateModified` (archive "updated" date, converted from the evidenced text, e.g. `Aug 24, 2022` → `2022-08-24`, omitted when the archive shows none), `author` → `{"@id": ".../author/admin/#person"}`.
- `Person`: `@id` `https://bonafidenitro.com/author/admin/#person`, `name` "John Goerke", `url` `https://bonafidenitro.com/author/admin/` (name/URL evidenced by the author archive "Author: John Goerke" listing all 15 posts).

Omitted as unevidenced (not invented): `image`, `publisher`, `description`, `inLanguage`, `wordCount`, etc. `Organization`/`WebSite`/`WebPage`/`BreadcrumbList`, canonicals, indexability, URLs and scaffold markers are unchanged. Archives (`/blog/`, category, author, pagination) and all other pages emit no `Article`/`Person`.

Interpretation recorded: "historical post routes" = the 15 posts in the evidenced archive. Three of them (`/hot-nitro-coffee/`, `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/`, `/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/`) render no byline on the page but are listed under the author archive, so they receive the same Person. Pages without an on-page date (`/3-cups-…/`, `/coffee-on-tap-is-the-future/`) take dates from the archive evidence; where a page shows ISO dates they equal the archive's.

## QA gate (T6)
`qa/qa.config.json` `articleRoutes` lists the 15 routes. For each built route: exactly one `Article` and one `Person` (`article-schema-count`, `person-schema-count`), `Article.author['@id']` equals the Person `@id` (`article-author-link`), non-empty `headline`/`datePublished` (`article-field-missing`), ISO dates (`article-field-invalid`), Person `name` (`person-name-missing`). `Article`/`Person` anywhere else is an invariant (`article-schema-unexpected`); an empty `articleRoutes` is an invariant (`article-routes-undeclared`). Findings are migration-remaining while the post still carries the scaffold marker and blocking invariants otherwise, consistent with the other T6 rules.

## Verification
`npm run build`, `npm run check:dist`, `npm run check:htaccess`, `npm test` (296/296, incl. `tests/foundation/block23-article-schema.test.mjs` and 8 new QA negative tests), Python isolation (303 OK), foundation QA PASS (0 invariants), strict QA fails only on pre-existing migration-remaining findings (0 invariant, 0 Article/Person findings). Blocks 6/7/8 "no Article" assertions were narrowed to "Article only on the post routes".

## Still open — Stage 8 remains INCOMPLETE
Image gate, placeholder/scaffold pages, meta descriptions, commerce inventories, staging verification, forensic/security steps and all other blockers in docs 19/20 are unchanged. Rich Results validation is external.
