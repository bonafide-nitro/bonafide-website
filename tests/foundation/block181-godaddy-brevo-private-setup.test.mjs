// Issue #181: offline regression tests for the manual GoDaddy Brevo private-setup workflow. No network, no SSH.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const wf = readFileSync(".github/workflows/godaddy-brevo-private-setup.yml", "utf8");
const doc = readFileSync("docs/GODADDY_BREVO_PRIVATE_SETUP.md", "utf8");
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");

test("workflow is manual-only with dry-run as the default action", () => {
  const on = wf.match(/^on:\n((?:[ ]+.*\n)+)/m)[1];
  assert.match(on, /workflow_dispatch:/);
  assert.doesNotMatch(on, /push|pull_request|schedule|workflow_run|repository_dispatch/);
  assert.match(on, /default: dry-run/);
  assert.match(on, /options:\n\s+- dry-run\n\s+- apply-private/);
});

test("main-only, protected environment, read-only token", () => {
  assert.match(wf, /github\.ref == 'refs\/heads\/main'/);
  assert.match(wf, /environment: godaddy-brevo-private-setup/);
  assert.match(wf, /^permissions:\n  contents: read$/m);
  assert.match(wf, /persist-credentials: false/);
  assert.match(wf, /sparse-checkout: deploy\/contact/);
});

test("host key stays pinned and strict; nothing weakened", () => {
  assert.doesNotMatch(wf, /StrictHostKeyChecking=(no|accept-new)/);
  assert.match(wf, /StrictHostKeyChecking=yes/);
  assert.match(wf, /GlobalKnownHostsFile=\/dev\/null/);
  assert.match(wf, /fingerprint-mismatch/);
  assert.match(wf, /\[ "\$fp" = "\$GODADDY_SSH_HOST_FINGERPRINT" \]/);
});

test("pinned hashes match the audited files", () => {
  assert.ok(wf.includes(`PIN_INSTALLER_SHA256: ${sha("deploy/contact/install-private-config.sh")}`));
  assert.ok(wf.includes(`PIN_TEMPLATE_SHA256: ${sha("deploy/contact/contact-config.example.php")}`));
});

test("only the two audited files are transferred, never the endpoint or public_html", () => {
  const scp = wf.match(/scp [\s\S]*?\n\s+"\$\{target\}[^\n]*/)[0];
  assert.match(scp, /install-private-config\.sh/);
  assert.match(scp, /contact-config\.example\.php/);
  assert.doesNotMatch(scp, /contact-submit|contact-lib|rsync|-r /);
  assert.doesNotMatch(wf.replace(/^\s*#.*$/gm, "").replace(/case "\$real\/" in "\$pub"[^\n]*/g, ""), /\$HOME\/public_html\/|>\s*[^\n]*public_html/);
  assert.match(wf, /contact-submit|public_html/); // safety checks reference it, to refuse it
  assert.doesNotMatch(wf, /ls .*public_html|find .*public_html/);
});

test("no secret is ever read from or written to repo/output; no xtrace; fails closed", () => {
  assert.match(wf, /set \+x/);
  assert.doesNotMatch(wf, /set -x|echo .*\$\{?GODADDY_SSH_(PRIVATE_KEY|KEY_PASSPHRASE)/);
  assert.doesNotMatch(wf, /brevo_api_key|BREVO_API_KEY|api\.brevo\.com|\bcurl\b/i);
  assert.match(wf, /Failing closed/);
  assert.match(wf, /add-mask::\$\{remote_home\}/);
  assert.match(wf, /sed "s#\$\{remote_home\}#~#g"/);
});

test("installer modes map to dry-run (default) and apply; scratch is unique and cleaned up", () => {
  assert.match(wf, /mode=dry-run\n\s+\[ "\$ACTION" = apply-private \] && mode=apply/);
  assert.match(wf, /mktemp -d "\$HOME\/\.bonafide-stage\.XXXXXXXX"/);
  assert.match(wf, /cleanup_remote/);
  assert.match(wf, /trap 'cleanup_remote; rm -rf "\$work"' EXIT/);
});

test("docs cover environment setup, dry-run transport note, apply-private and rollback", () => {
  for (const s of ["godaddy-brevo-private-setup", "dry-run", "apply-private", "Rollback", "scratch", "cPanel", "GODADDY_SSH_HOST_FINGERPRINT"]) {
    assert.ok(doc.includes(s), s);
  }
  assert.match(doc, /Never paste the key/);
});

// Run the remote scratch-create snippet locally against a fake HOME to prove its safety properties.
const heredocs = [...wf.matchAll(/<<'REMOTE'[^\n]*\n([\s\S]*?)\n\s*REMOTE\n/g)].map((m) => {
  const lines = m[1].split("\n");
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return lines.map((l) => l.slice(indent)).join("\n");
});
const hasBash = spawnSync("bash", ["-c", "command -v realpath"]).status === 0;

test("remote scratch-create snippet creates a 700 dir outside public_html", { skip: !hasBash && "no bash/realpath" }, () => {
  assert.equal(heredocs.length, 2);
  const home = mkdtempSync(path.join(os.tmpdir(), "bf181-"));
  mkdirSync(path.join(home, "public_html"));
  const r = spawnSync("bash", ["-s"], { input: heredocs[0], env: { ...process.env, HOME: home }, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const name = r.stdout.match(/^SCRATCH=(.+)$/m)[1];
  assert.match(name, /^\.bonafide-stage\.[A-Za-z0-9]{8}$/);
  assert.equal((readdirSync(path.join(home, "public_html"))).length, 0);
  assert.ok(existsSync(path.join(home, name)));
});

test("remote scratch-create snippet refuses when HOME is inside public_html's tree", { skip: !hasBash && "no bash/realpath" }, () => {
  const base = mkdtempSync(path.join(os.tmpdir(), "bf181-"));
  // HOME == public_html: scratch would land inside it.
  const r = spawnSync("bash", ["-s"], { input: heredocs[0].replace('"$HOME/public_html"', `"${base}"`), env: { ...process.env, HOME: base }, encoding: "utf8" });
  assert.equal(r.status, 24);
  assert.deepEqual(readdirSync(base), []);
});
