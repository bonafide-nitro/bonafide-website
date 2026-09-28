import { defineConfig } from 'astro/config';
import { loadSite } from './src/lib/data.mjs';

const site = loadSite();

// Static output only. Every page emits /<path>/index.html so URLs match the
// current WordPress URLs exactly (trailing slash always).
export default defineConfig({
  site: site.url,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
