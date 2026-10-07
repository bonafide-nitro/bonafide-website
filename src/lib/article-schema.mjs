// Article + Person JSON-LD for the historical posts (Block 23, Issue #64).
// Source of truth is the evidenced live archive in ./archive.mjs (ZANETA_DECISION on Issue #36): post membership, titles,
// published dates and "updated" dates; the author archive (/author/admin/, "Author: John Goerke") lists every post.
// Nothing else is emitted: no image, publisher, description or other unevidenced property (Issue #64 req. 4).
import { PAGE1, PAGE2, AUTHOR } from './archive.mjs';

export const POSTS = [...PAGE1, ...PAGE2];
export const AUTHOR_NAME = 'John Goerke'; // evidenced by AUTHOR.label ("Author: John Goerke") and every post byline

const MONTHS = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
// "Aug 24, 2022" -> "2022-08-24"; throws on anything else so a malformed evidence row fails the build, not the schema.
export const isoFromArchiveText = (txt) => {
  const m = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/.exec(txt);
  if (!m || !MONTHS[m[1]]) throw new Error(`unparseable archive date: ${txt}`);
  return `${m[3]}-${MONTHS[m[1]]}-${m[2].padStart(2, '0')}`;
};

export const postFor = (canonicalPath) => POSTS.find((p) => p.path === canonicalPath);

export const authorId = (siteUrl) => `${siteUrl}${AUTHOR.base}#person`;

// Returns the two graph nodes for a post route, or [] for any other route (archives, pages).
export const articleNodes = (canonicalPath, siteUrl) => {
  const post = postFor(canonicalPath);
  if (!post) return [];
  const url = `${siteUrl}${post.path}`;
  const article = {
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: post.title,
    mainEntityOfPage: { '@id': `${url}#webpage` },
    datePublished: post.date,
    ...(post.upd ? { dateModified: isoFromArchiveText(post.upd) } : {}),
    author: { '@id': authorId(siteUrl) },
  };
  const person = { '@type': 'Person', '@id': authorId(siteUrl), name: AUTHOR_NAME, url: `${siteUrl}${AUTHOR.base}` };
  return [article, person];
};
