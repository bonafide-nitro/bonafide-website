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
  external: z.array(z.object({ commerceId: z.string(), label: z.string() }).strict()),
});

const STORE_HOSTS = ['nitrocoffee.store', 'www.nitrocoffee.store'];
const storeHref = z.string().superRefine((v, ctx) => {
  let u;
  try { u = new URL(v); } catch { return ctx.addIssue({ code: 'custom', message: 'not a URL' }); }
  if (u.protocol !== 'https:') ctx.addIssue({ code: 'custom', message: 'commerce links must be https://' });
  if (!STORE_HOSTS.includes(u.hostname)) ctx.addIssue({ code: 'custom', message: `host ${u.hostname} is not the approved store host` });
  if ([...u.searchParams.keys()].some((k) => k !== 'variant')) ctx.addIssue({ code: 'custom', message: 'no tracking/affiliate parameters' });
  if (u.hash) ctx.addIssue({ code: 'custom', message: 'no fragments' });
});

// Block 35 (Issue #88): retail Amazon destinations, evidenced per style by the owner-supplied original /products/ page.
const AMAZON_HOSTS = ['www.amazon.com'];
const amazonHref = z.string().superRefine((v, ctx) => {
  let u;
  try { u = new URL(v); } catch { return ctx.addIssue({ code: 'custom', message: 'not a URL' }); }
  if (u.protocol !== 'https:') ctx.addIssue({ code: 'custom', message: 'commerce links must be https://' });
  if (!AMAZON_HOSTS.includes(u.hostname)) ctx.addIssue({ code: 'custom', message: `host ${u.hostname} is not the approved Amazon host` });
  if (u.search || u.hash) ctx.addIssue({ code: 'custom', message: 'no tracking/affiliate parameters or fragments' });
});

const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  wholesaleName: z.string().optional(),
  category: z.enum(['coffee', 'tea']),
  line: z.enum(['core', 'specialty', 'alliance']),
  brand: z.string(),
  format: z.string().optional(),
  nutrition: z.string().optional(),
  description: z.string().optional(),
  styles: z.array(z.enum(['nitro', 'still'])).optional(),
  pricing: z.object({ retail: z.number().nullable(), wholesale: z.number().nullable() }),
  links: z.object({ store: storeHref.optional(), storeViews: z.array(z.enum(['retail', 'wholesale'])).optional(), amazon: z.object({ nitro: amazonHref.optional(), still: amazonHref.optional() }).strict().optional() }).optional(),
  amazonCta: z.boolean().optional(),
  specialRequest: z.boolean().optional(),
  image: urlPath.optional(),
  alt: z.string().optional(),
  views: z.array(z.enum(['retail', 'wholesale'])).min(1),
});

const commerceSchema = z.object({
  links: z.record(z.string(), z.object({ href: storeHref, label: z.string(), note: z.string().optional() }).strict()),
  unresolved: z.array(z.object({
    id: z.string(),
    page: z.string(),
    kind: z.enum(['amazon', 'store', 'external']),
    count: z.number().int().positive().nullable(),
    reason: z.string(),
  }).strict()),
}).strict();

const redirectSchema = z
  .object({
    id: z.string(),
    type: z.enum(['canonicalisation', 'pattern', 'exact', 'external', 'query']),
    from: z.string(),
    to: z.string().nullable(),
    status: z.literal(301),
    state: z.enum(['defined', 'pending-decision', 'deliberate-404', 'dropped']),
    note: z.string().optional(),
    evidenceFragment: z.string().optional(),
  })
  .refine((r) => (r.state === 'defined') === (r.to !== null), {
    message: 'defined redirects need a destination; every other state must have none',
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
export const loadCommerce = () => commerceSchema.parse(YAML.parse(read('commerce.yaml')));
export const loadRedirects = () =>
  z.object({ rules: z.array(redirectSchema) }).parse(YAML.parse(read('redirects.yaml'))).rules;
export const loadBaseline = () => baselineSchema.parse(JSON.parse(read('seo-baseline.json')));
