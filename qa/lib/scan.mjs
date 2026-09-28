// Reads a built static dist/ into a structured model the checks run against.
import fs from 'node:fs';
import path from 'node:path';
import { parseHtml } from './html.mjs';

const TEXT_EXT = new Set(['.html', '.css', '.js', '.mjs', '.json', '.xml', '.txt', '.svg', '.webmanifest', '.map']);

export const scanDist = (distDir) => {
  const files = new Map(); // posix relative path -> absolute path
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else files.set(path.relative(distDir, abs).split(path.sep).join('/'), abs);
    }
  };
  walk(distDir);

  const pages = new Map(); // url path -> page model
  const strayHtml = [];
  let notFound = null;
  const textFiles = new Map(); // rel -> string (text-like files, for reference/forbidden scans)

  for (const [rel, abs] of files) {
    const ext = path.extname(rel).toLowerCase();
    if (TEXT_EXT.has(ext) || rel === '.htaccess' || rel === '_redirects') textFiles.set(rel, fs.readFileSync(abs, 'utf8'));
    if (ext !== '.html') continue;
    const raw = textFiles.get(rel);
    if (rel === '404.html') { notFound = { file: rel, ...parseHtml(raw) }; continue; }
    if (rel === 'index.html' || rel.endsWith('/index.html')) {
      const urlPath = '/' + rel.slice(0, -'index.html'.length);
      pages.set(urlPath, { path: urlPath, file: rel, raw, ...parseHtml(raw) });
    } else strayHtml.push(rel);
  }
  return { files, pages, strayHtml, notFound, textFiles };
};
