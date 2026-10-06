import type { APIRoute } from 'astro';
import { loadSite } from '../lib/data.mjs';

// Static crawl policy (master plan SEO-14, T10): disallow nothing, declare the static sitemap.
// Deliberately not carried over from live WordPress: the WP-Optimize disallow and the /wp-sitemap.xml pointer.
export const GET: APIRoute = () => {
  const site = loadSite();
  const body = ['User-agent: *', 'Disallow:', '', `Sitemap: ${site.url}/sitemap.xml`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
