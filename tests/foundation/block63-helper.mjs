// Block 63 (Issue #143): shared helpers that tie older vocabulary/claim guards to the exact 2026-10-19 export evidence.
import fs from 'node:fs';

export const EVIDENCE = JSON.parse(fs.readFileSync('docs/migration/data/block63-wxr-evidence.json', 'utf8'));
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#38;/g, '&').replace(/&#34;|&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/\s+/g, ' ');
export const plain = (h) => strip(h);
export const entry = (slug) => {
  const e = EVIDENCE.entries.find((x) => x.slug === slug);
  if (!e) throw new Error(`no export evidence for ${slug}`);
  return e;
};
export const exportText = (slug) => plain(entry(slug).blocks.map((b) => b.html ?? (b.items ?? []).join(' ')).join(' ')).toLowerCase();

// A guarded phrase must be on the built page. It may be absent ONLY when the exact export text for the
// same route does not contain it either (so nothing the original page said can be silently dropped).
export const vocabOrAbsentInExport = (html, slug, phrases) => {
  const page = plain(html).toLowerCase();
  const src = exportText(slug);
  return phrases.filter((p) => !page.includes(p.toLowerCase()) && src.includes(p.toLowerCase()));
};

export const CLAIM_WORDS = /\b(cures?|prevents?|treats?|proven|guarantee[sd]?)\b/gi;
// Claim words on a built page that are NOT original wording (i.e. count exceeds what the export text contains).
export const newClaimWords = (html, slug) => {
  const count = (t) => (t.match(CLAIM_WORDS) ?? []).length;
  return count(plain(html)) - count(plain(entry(slug).blocks.map((b) => b.html ?? (b.items ?? []).join(' ')).join(' ')));
};
