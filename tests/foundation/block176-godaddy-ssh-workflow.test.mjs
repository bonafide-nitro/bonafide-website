import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wf = readFileSync(".github/workflows/godaddy-ssh-check.yml", "utf8");
const doc = readFileSync("docs/GODADDY_SSH_CONNECTION.md", "utf8");

test("workflow is manual-only", () => {
  const on = wf.match(/^on:\n((?:[ ]+.*\n)+)/m)[1];
  assert.match(on, /workflow_dispatch:/);
  assert.doesNotMatch(on, /push|pull_request|schedule|workflow_run|repository_dispatch/);
});

test("workflow has no token permissions, restricts to main, uses a protected environment", () => {
  assert.match(wf, /^permissions: \{\}$/m);
  assert.match(wf, /github\.ref == 'refs\/heads\/main'/);
  assert.match(wf, /environment: godaddy-ssh-readonly/);
});

test("host key is pinned, never disabled", () => {
  assert.doesNotMatch(wf, /StrictHostKeyChecking=(no|accept-new)/);
  assert.match(wf, /StrictHostKeyChecking=yes/);
  assert.match(wf, /GODADDY_SSH_HOST_FINGERPRINT/);
});

test("only the harmless remote command runs, no writes or live paths", () => {
  assert.match(wf, /'printf SSH_OK'/);
  assert.doesNotMatch(wf, /public_html|scp |rsync|sftp|\bcurl\b|uses: actions\/checkout/);
});

test("fails closed on missing config and never traces secrets", () => {
  assert.match(wf, /Failing closed/);
  assert.match(wf, /set \+x/);
  assert.doesNotMatch(wf, /set -x|echo .*\$\{?GODADDY_SSH_(PRIVATE_KEY|KEY_PASSPHRASE)/);
});

test("docs name every secret", () => {
  for (const s of ["HOST", "PORT", "USER", "PRIVATE_KEY", "KEY_PASSPHRASE", "HOST_FINGERPRINT"]) {
    assert.ok(doc.includes(`GODADDY_SSH_${s}`), s);
    assert.ok(wf.includes(`secrets.GODADDY_SSH_${s}`), s);
  }
});
