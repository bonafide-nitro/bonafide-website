// Issue #183: guards the preparation-only endpoint test plan. Offline; no network, no hosting access.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const hasPhp = spawnSync('php', ['-v']).status === 0;
const doc = fs.readFileSync('docs/GODADDY_CONTACT_ENDPOINT_TEST.md', 'utf8');

test('plan states preparation-only, single approval point, rollback, no-PII rules', () => {
  assert.match(doc, /Preparation only/);
  assert.match(doc, /ONE owner approval point/);
  assert.match(doc, /## Rollback/);
  assert.match(doc, /No-logging-of-PII/);
  assert.match(doc, /exactly \*\*one\*\* valid synthetic POST/);
  assert.match(doc, /not inside `public_html`|\*\*not\*\* inside `public_html`/);
});

test('no new workflow was added for the endpoint test', () => {
  const wf = fs.readdirSync('.github/workflows');
  assert.ok(!wf.some((f) => /contact-endpoint|endpoint-test|brevo-endpoint/i.test(f)));
});

test('smoke script is CLI-only, offline and never reads the private config', () => {
  const s = fs.readFileSync('deploy/contact/smoke-cli.php', 'utf8');
  assert.match(s, /PHP_SAPI !== 'cli'/);
  assert.ok(!/curl_|fsockopen|stream_socket|file_get_contents\s*\(\s*['"]http|bonafide-private|BF_CONTACT_CONFIG|getenv/.test(s));
});

test('smoke script passes with the stub transport and prints no secrets', { skip: !hasPhp && 'php not installed' }, () => {
  const r = spawnSync('php', ['deploy/contact/smoke-cli.php'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /SMOKE OK/);
  assert.equal((r.stdout.match(/^PASS /gm) || []).length, 8);
  assert.ok(!/FAIL|synthetic-not-a-key|@/.test(r.stdout));
});
