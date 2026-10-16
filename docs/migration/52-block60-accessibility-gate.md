# Block 60 — build-level accessibility / functional-HTML gate

`npm run check:a11y` (`scripts/check-accessibility.mjs`, rules in `qa/lib/a11y.mjs`) audits every generated `.html` file in
`dist/` (41 files incl. `404.html`) and is part of `npm run test:build`. It has no allowlist; any finding exits 1.

## Rules (structural, evidence-independent)

`html-lang`, `main-landmark` (exactly one), `h1-count` / `h1-empty`, `duplicate-id`, `fragment-target` (same-page `#x` links),
`aria-ref` (aria-labelledby/describedby/controls to a missing id), `link-name`, `button-name`, `img-alt` (no `alt` attribute at all),
`input-image-alt`, `iframe-title`, `label-for` (label pointing at a missing id), `control-label` (input/select/textarea with no
label, aria-label/labelledby or title; hidden/submit/button/reset inputs exempt).

Result on the current build: 0 findings; no source change was needed. Synthetic broken fixtures for every rule are in
`tests/qa/a11y.test.mjs`.

## Deliberately excluded (evidence/editorial, not gated)

- `alt=""` is treated as a valid *decorative* declaration and is not flagged. 11 `<img alt="">` remain in the built pages (e.g. the
  nitro-cold-brew article graphics). Whether each is decorative or a content image needing original alt text requires the
  historical WordPress alt evidence; none was invented.
- Alt text that merely repeats an image filename (e.g. product banners) is a content-quality question, not structural; left as is.
- Contrast, focus order, heading-level skipping, and landmark naming are not machine-checked here.
- Strict migration QA (`npm run qa:strict`) is unchanged: 40 blocking migration-evidence findings remain, none a11y-related.
