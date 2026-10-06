import type { APIRoute } from 'astro';
import { loadBaseline, loadSite } from '../lib/data.mjs';

// Sitemap is generated from the protected-route manifest only: exactly the entries with inSitemap === true.
// noindex/legal routes and /book-appointment/ are inSitemap:false and therefore excluded.
// /products/ and /products-2/ are separate manifest entries and are both listed (the latter is orphan by design).
const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = () => {
  const site = loadSite();
  const paths = loadBaseline().urls.filter((u: { inSitemap?: boolean }) => u.inSitemap === true).map((u: { path: string }) => u.path);
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map((p: string) => `  <url><loc>${escapeXml(site.url + p)}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
