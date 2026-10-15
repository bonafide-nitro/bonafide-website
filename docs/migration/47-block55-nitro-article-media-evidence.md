# Block 55 — Nitro article media evidence (`/what-is-nitro-cold-brew-coffee/`)

Issue #126. Evidence review only; no page redesign, no live/external effect.

## Correction of a stale statement

`qa/qa.config.json` and `docs/migration/30-block28-article-scaffold-results.md` called
`/wp-content/uploads/2020/07/What-is-nitro-Coffee-Explained-simple-Bona-Fide.jpg` a "missing T7 binary".
That is stale: the original is present at its exact path (1407x786 JPEG, 100272 bytes,
SHA-256 `aa1458e18e54342f2e9de7ef4d49d4f45c43ef65ab4ebaa1876cc69acba2dc2d`), pinned in
`tests/foundation/block33-t7-assets.test.mjs` and listed in `qa/t7-image-manifest.json`. The blocker text now says so.

## Is the image evidenced as appearing on this article?

No. The only archived evidence naming the file is doc 02, image-ranking table, row 59
(0 clicks, 4 impressions, position 18.2). That table lists image URLs, not the pages embedding them.
Circumstantial signals (filename topic; upload month 2020/07 matches the article's 2020-07-21 date) do not
identify the embedding page: the sibling post `/nitro-cold-brew-coffee-made-easy-2/` ("Simple Explain Nitro
Cold Brew Coffee") fits the filename "Explained-simple" equally well. No archived page HTML, og:image or
schema image for either route was preserved.

Decision: the image is **not rendered** on this route and no association is asserted. The route stays
scaffolded and its strict-QA blocker remains.

## Other pinned originals

None of the other 15 pinned originals has page-specific evidence for this article. The `Nitro-Coffee-Explain-Graphic-*`
files are rendered on `/nitro-cold-brew/` (Block 53); the rest belong to other routes or the ranking list only.

## Remaining blockers for this route (unchanged)

Exact original copy, original alt text and image order, page-specific image association, meta description.
To clear: preserved page HTML/screenshot of the original article, or an owner statement of which images it contained.
