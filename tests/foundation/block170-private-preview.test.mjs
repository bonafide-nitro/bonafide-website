// Issue #170: Vercel static config and the fail-closed privacy probe. Offline; no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classify, probe } from '../../scripts/check-private-preview.mjs';

const cfg = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const res = (status, location) => ({ status, headers: { get: (k) => (k === 'location' ? location ?? null : null) } });

test('vercel.json is static-only, matches the Astro build, and carries no secrets or redirects', () => {
  assert.equal(cfg.framework, 'astro');
  assert.equal(cfg.outputDirectory, 'dist');
  assert.equal(cfg.buildCommand, 'npm run build');
  assert.equal(cfg.trailingSlash, true);
  assert.ok(!('redirects' in cfg) && !('rewrites' in cfg) && !('env' in cfg) && !('crons' in cfg));
  const h = cfg.headers.flatMap((r) => r.headers);
  assert.ok(h.some((x) => x.key === 'X-Robots-Tag' && /noindex/.test(x.value)));
  assert.ok(!/https?:\/\/(?!openapi\.vercel\.sh)/.test(JSON.stringify(cfg)), 'no hosts/endpoints committed');
});

test('probe passes only login walls', () => {
  assert.equal(classify({ status: 401 }).ok, true);
  assert.equal(classify({ status: 307, location: 'https://vercel.com/sso-api?url=x' }).ok, true);
  assert.equal(classify({ status: 302, location: 'https://vercel.com/login?next=%2Fx' }).ok, true);
  for (const c of [
    { status: 302, location: 'https://vercel.com/' },
    { status: 302, location: 'https://vercel.com/docs' },
    { status: 302, location: 'http://vercel.com/not-a-login' },
    { status: 302, location: 'http://vercel.com/login' },
    { status: 302, location: 'https://vercel.com/login/../docs' },
    { status: 302, location: 'https://sub.vercel.com/login' },
    { status: 200 }, { status: 404 }, { status: 500 }, { status: 307, location: 'https://evil.test/vercel.com' }, { status: 302, location: 'notaurl' }]) {
    assert.equal(classify(c).ok, false, JSON.stringify(c));
  }
});

test('probe fails closed: no URLs, bad URLs, http, network errors, any public response', async () => {
  assert.equal((await probe([]))[0].ok, false);
  assert.equal((await probe(['nope']))[0].ok, false);
  assert.equal((await probe(['http://a.vercel.app/']))[0].ok, false);
  assert.equal((await probe(['https://a.vercel.app/'], async () => { throw new Error('boom'); }))[0].ok, false);
  assert.equal((await probe(['https://a.vercel.app/'], async () => res(200)))[0].ok, false);
  assert.equal((await probe(['https://a.vercel.app/'], async () => res(401)))[0].ok, true);
  const mixed = await probe(['https://a.vercel.app/', 'https://b.vercel.app/'], async (u) => res(u.includes('a.') ? 401 : 200));
  assert.deepEqual(mixed.map((r) => r.ok), [true, false]);
});
