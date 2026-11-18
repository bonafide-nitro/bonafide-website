// Issue #224 / PR #225: legacy WordPress pages whose body headings are preserved at their original
// WXR tag levels (docs/migration/data/block63-wxr-evidence.json), including multiple legacy H1s.
// This is a pinned expectation, not a suppression: each listed route must have EXACTLY this many
// <h1> elements; any other count still fails. Every other route keeps the exactly-one-H1 rule.
// Counts: /nitro-cold-brew/ = 16 WXR H1s (the first is the page H1);
// /nitro-cold-brew-coffee-made-easy-2/ = 1 page-title H1 (pre-existing on main) + 14 WXR body H1s.
export const LEGACY_H1_COUNT = Object.freeze({
  '/nitro-cold-brew/': 16,
  '/nitro-cold-brew-coffee-made-easy-2/': 15,
});

export const expectedH1Count = (routePath) => LEGACY_H1_COUNT[routePath] ?? 1;
