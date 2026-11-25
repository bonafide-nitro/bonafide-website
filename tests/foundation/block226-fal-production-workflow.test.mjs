import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wf = readFileSync(".github/workflows/fal-production.yml", "utf8");
const doc = readFileSync("docs/FAL_PRODUCTION.md", "utf8");
const PHRASE = "I APPROVE A PAID FAL.AI GENERATION FOR BONA FIDE";

const job = (name) => {
  const m = wf.match(new RegExp(`^  ${name}:\\n((?:(?:    .*)?\\n)+)`, "m"));
  assert.ok(m, `job ${name} exists`);
  return m[1];
};

test("workflow is manual-only (no push/PR/schedule/@claude trigger)", () => {
  const on = wf.match(/^on:\n((?:(?:[ ]+.*)?\n)+?)(?=^\S)/m)[1];
  assert.match(on, /workflow_dispatch:/);
  assert.doesNotMatch(on, /\bpush:|pull_request|schedule|workflow_run|repository_dispatch|issue_comment|issues:/);
});

test("no token permissions, no checkout, main-only, scoped fal-production environment", () => {
  assert.match(wf, /^permissions: \{\}$/m);
  assert.doesNotMatch(wf, /actions\/checkout|contents: write|id-token/);
  for (const name of ["preflight", "generate"]) {
    const body = job(name);
    assert.match(body, /github\.ref == 'refs\/heads\/main'/, name);
    assert.match(body, /environment: fal-production/, name);
  }
});

test("FAL_KEY only from the fal-production secret and never echoed or traced", () => {
  assert.match(wf, /FAL_KEY: \$\{\{ secrets\.FAL_KEY \}\}/);
  assert.doesNotMatch(wf, /secrets\.(?!FAL_KEY\b)\w+/);
  assert.doesNotMatch(wf, /set -x/);
  assert.match(wf, /set \+x/);
  assert.doesNotMatch(wf, /echo[^\n]*\$\{?FAL_KEY/);
  assert.doesNotMatch(wf, /-H\s+["']Authorization/);
  assert.match(wf, /-H @"\$work\/auth"/);
});

test("preflight uses the read-only identity endpoint and fails closed", () => {
  const body = job("preflight");
  assert.match(body, /https:\/\/api\.fal\.ai\/v1\/account\/billing/);
  assert.doesNotMatch(body, /queue\.fal\.run|fal\.run\//);
  assert.match(body, /FAL_EXPECTED_ACCOUNT: \$\{\{ vars\.FAL_EXPECTED_ACCOUNT \}\}/);
  assert.match(body, /Identity verification incomplete\. Failing closed\./);
  assert.match(body, /identity-mismatch/);
  assert.match(body, /\*molosoc\*\)/);
  assert.match(body, /verified=true/);
});

test("paid generate job is gated by mode, exact phrase, and verified preflight", () => {
  const body = job("generate");
  assert.match(body, /needs: preflight/);
  assert.match(body, /inputs\.mode == 'generate'/);
  assert.ok(body.includes(`inputs.paid_confirmation == '${PHRASE}'`));
  assert.match(body, /needs\.preflight\.outputs\.verified == 'true'/);
  assert.match(wf, /default: preflight/);
});

test("untrusted inputs reach shell only via env, never inline expressions in run", () => {
  const runs = [...wf.matchAll(/run: \|\n((?:(?:          .*)?\n)+)/g)].map((m) => m[1]);
  assert.ok(runs.length >= 3);
  for (const r of runs) assert.doesNotMatch(r, /\$\{\{/);
});

test("generate sends the key only to queue.fal.run", () => {
  const body = job("generate");
  assert.match(body, /https:\/\/queue\.fal\.run\/\*\) ;;/);
  assert.match(body, /refusing to send the key elsewhere/);
});

test("docs cover setup, launch, phrase, isolation and result storage", () => {
  for (const s of ["FAL_EXPECTED_ACCOUNT", "FAL_KEY", "fal-production", PHRASE, "MOLOSOC", "required reviewers", "fal-result-"]) {
    assert.ok(doc.includes(s), s);
  }
});
