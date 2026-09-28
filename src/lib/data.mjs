// Loads and validates the source-of-truth data files. A malformed file fails the build.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';

// Resolved from the repo root (astro build / node --test both run there); import.meta.url
// is unreliable once Astro bundles this module into dist/chunks.
const dataDir = path.resolve(process.cwd(), 'src/data');
const read = (name) => fs.readFileSync(path.join(dataDir, name), 'utf8');
const urlPath = z.string().regex(/^\//);

const siteSchema = z.object({
  name: z.string(),
  url: z.literal('https://bonafidenitro.com'),
  canonicalHost: z.literal('bonafidenitro.com'),
  protocol: z.literal('https'),
  trailingSlash: z.literal('always'),
  buildFormat: z.literal('directory'),
  sameDomainMigration: z.literal(true),
  deployment: z.null(),
  analytics: z.null(),
});

const navigationSchema = z.object({
  launch: z.array(z.object({ path: urlPath, label: z.string() })),
  external: z.array(z.object({ href: z.string().url(), label: z.string() })),
});

const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['coffee', 'tea']),
  line: z.enum(['core', 'specialty', 'alliance']),
  brand: z.string(),
  format: z.string().optional(),
  nutrition: z.string().optional(),
  description: z.string().optional(),
  styles: z.array(z.enum(['nitro', 'still'])).optional(),
  pricing: z.object({ retail: z.number().nullable(), wholesale: z.number().nullable() }),
  links: z.object({ store: z.string().url().optional(), amazon: z.string().url().optional() }).optional(),
  image: urlPath.optional(),
  alt: z.string().optional(),
  views: z.array(z.enum(['retail', 'wholesale'])).min(1),
});

const redirectSchema = z
  .object({
    id: z.string(),
    type: z.enum(['canonicalisation', 'pattern', 'exact', 'external', 'query']),
    from: z.string(),
    to: z.string().nullable(),
    status: z.literal(301),
    state: z.enum(['defined', 'pending-decision']),
    note: z.string().optional(),
    evidenceFragment: z.string().optional(),
  })
  .refine((r) => (r.state === 'defined') === (r.to !== null), {
    message: 'defined redirects need a destination; pending-decision redirects must have none',
  });

const baselineSchema = z.object({
  urls: z.array(
    z.object({
      path: urlPath,
      tier: z.number(),
      expect: z.literal('200'),
      canonical: z.literal('self'),
      indexable: z.boolean(),
      inSitemap: z.boolean(),
    }).passthrough(),
  ),
  preservationRules: z.object({ forbiddenBuildStrings: z.array(z.string()).min(1) }).passthrough(),
}).passthrough();

export const loadSite = () => siteSchema.parse(YAML.parse(read('site.yaml')));
export const loadNavigation = () => navigationSchema.parse(YAML.parse(read('navigation.yaml')));
export const loadProducts = () => z.array(productSchema).parse(YAML.parse(read('products.yaml')));
export const loadRedirects = () =>
  z.object({ rules: z.array(redirectSchema) }).parse(YAML.parse(read('redirects.yaml'))).rules;
export const loadBaseline = () => baselineSchema.parse(JSON.parse(read('seo-baseline.json')));
