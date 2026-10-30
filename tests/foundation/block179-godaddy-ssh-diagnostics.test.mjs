import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, chmodSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Runs the workflow's real `run:` script under bash with mocked ssh-keyscan / ssh-keygen / ssh.
const wf = readFileSync(".github/workflows/godaddy-ssh-check.yml", "utf8");
const body = wf.split(/^ {8}run: \|\n/m)[1];
assert.ok(body, "run block found");
const script = body.split("\n").map((l) => l.replace(/^ {10}/, "")).join("\n");

const PIN = "SHA256:PINNEDPINNEDPINNED";
const SECRETS = {
  GODADDY_SSH_HOST: "secret-host.example.invalid",
  GODADDY_SSH_PORT: "2222",
  GODADDY_SSH_USER: "secretuser",
  GODADDY_SSH_PRIVATE_KEY: "-----BEGIN OPENSSH PRIVATE KEY-----\nSECRETKEYBODY\n-----END OPENSSH PRIVATE KEY-----",
  GODADDY_SSH_KEY_PASSPHRASE: "secretpassphrase",
  GODADDY_SSH_HOST_FINGERPRINT: PIN,
};

function mock(path, src) {
  writeFileSync(path, `#!/bin/bash\n${src}\n`);
  chmodSync(path, 0o755);
}

function run({ scan, env = {}, ssh = "ok" }) {
  const dir = mkdtempSync(join(tmpdir(), "b179-"));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  writeFileSync(join(dir, "scan.txt"), scan);
  mock(join(bin, "ssh-keyscan"), `cat "${dir}/scan.txt"`);
  // Like the real tool: exit 255 on anything that is not "<host> <type> <base64>". Fingerprint = "SHA256:" + 3rd field.
  mock(
    join(bin, "ssh-keygen"),
    `f="\${2}"; read -r a b c < "$f"
case "$a" in ''|'#'*) echo "$f is not a public key file." >&2; exit 255 ;; esac
case "$b" in ssh-*|ecdsa-*) ;; *) echo "invalid" >&2; exit 255 ;; esac
[ -n "$c" ] || exit 255
echo "256 SHA256:$c $a (KEY)"`,
  );
  mock(
    join(bin, "ssh"),
    `echo "$@" > "${dir}/ssh.args"
for a in "$@"; do case "$a" in UserKnownHostsFile=*) cp "\${a#UserKnownHostsFile=}" "${dir}/known_hosts.seen" ;; esac; done
case "${ssh}" in
  ok) printf SSH_OK ;;
  auth) echo "secretuser@secret-host.example.invalid: Permission denied (publickey)." >&2; exit 255 ;;
  keyload) echo 'Load key "/tmp/x/key": invalid format' >&2; exit 255 ;;
  keyload_auth) echo 'Load key "/tmp/x/key": error in libcrypto' >&2; echo "secretuser@secret-host.example.invalid: Permission denied (publickey)." >&2; exit 255 ;;
  connect) echo "ssh: connect to host secret-host.example.invalid port 2222: Connection timed out" >&2; exit 255 ;;
  hostkey) echo "Host key verification failed." >&2; exit 255 ;;
  shell) echo "boom" >&2; exit 1 ;;
  garbage) printf 'something else' ;;
esac`,
  );
  const r = spawnSync("bash", ["-c", script], {
    env: { PATH: `${bin}:${process.env.PATH}`, HOME: dir, ...SECRETS, ...env },
    encoding: "utf8",
  });
  // ::add-mask:: lines are consumed by the Actions runner and never rendered.
  const out = `${r.stdout}${r.stderr}`.split("\n").filter((l) => !l.startsWith("::add-mask::")).join("\n");
  return { ...r, out, dir };
}

const good = "h ssh-ed25519 PINNEDPINNEDPINNED\n";
const stage = (r) => (r.out.match(/\[stage=([a-z-]+)\]/) || [])[1];

function assertNoLeak(r) {
  for (const s of ["secret-host", "secretuser", "SECRETKEYBODY", "secretpassphrase", "2222", "/home", "public_html"]) {
    assert.ok(!r.out.includes(s), `output leaked ${s}`);
  }
}

test("happy path still reports SSH_OK with strict host checking and only the matched key", () => {
  const r = run({ scan: `# h:2222 SSH-2.0-OpenSSH_8\nh ssh-rsa OTHERKEY\n${good}` });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /SSH_OK received/);
  assert.match(readFileSync(join(r.dir, "ssh.args"), "utf8"), /StrictHostKeyChecking=yes/);
  assert.equal(readFileSync(join(r.dir, "known_hosts.seen"), "utf8"), good);
  assertNoLeak(r);
});

test("regression: banner comment / blank / garbage scan lines no longer abort with silent exit 255", () => {
  const scan = `# h:2222 SSH-2.0-OpenSSH_8\n\nnot a key line\nh badtype xyz\n${good}# trailing`;
  const r = run({ scan });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /SSH_OK received/);
});

test("regression: only malformed lines -> host-key-parse, exit 1 with a message", () => {
  const r = run({ scan: "# h:2222 SSH-2.0-OpenSSH_8\ngarbage\n" });
  assert.equal(r.status, 1);
  assert.equal(stage(r), "host-key-parse");
  assert.ok(!existsSync(join(r.dir, "ssh.args")), "must not attempt ssh");
  assertNoLeak(r);
});

test("malformed lines never satisfy the pin; real mismatch reports fingerprint-mismatch", () => {
  const r = run({ scan: `# comment ${PIN}\nh ssh-ed25519 DIFFERENT\n` });
  assert.equal(r.status, 1);
  assert.equal(stage(r), "fingerprint-mismatch");
  assert.ok(!existsSync(join(r.dir, "ssh.args")), "must not attempt ssh");
  assertNoLeak(r);
});

test("empty host scan -> host-scan", () => {
  const r = run({ scan: "" });
  assert.equal(r.status, 1);
  assert.equal(stage(r), "host-scan");
});

test("missing secrets and bad config -> missing-secret, names only the variable", () => {
  for (const env of [
    { GODADDY_SSH_PRIVATE_KEY: "" },
    { GODADDY_SSH_HOST: "" },
    { GODADDY_SSH_PORT: "22x" },
    { GODADDY_SSH_HOST_FINGERPRINT: "MD5:aa" },
  ]) {
    const r = run({ scan: good, env });
    assert.equal(r.status, 1);
    assert.equal(stage(r), "missing-secret");
    assert.ok(!existsSync(join(r.dir, "ssh.args")));
  }
  const r = run({ scan: good, env: { GODADDY_SSH_PRIVATE_KEY: "" } });
  assert.match(r.out, /GODADDY_SSH_PRIVATE_KEY/);
});

test("private key that is not a PEM/OpenSSH key -> key-parse without ssh", () => {
  const r = run({ scan: good, env: { GODADDY_SSH_PRIVATE_KEY: "SECRETKEYBODY not a key" } });
  assert.equal(r.status, 1);
  assert.equal(stage(r), "key-parse");
  assert.ok(!existsSync(join(r.dir, "ssh.args")));
  assertNoLeak(r);
});

test("ssh stage classification never leaks ssh stderr", () => {
  const cases = {
    auth: "ssh-auth",
    keyload: "key-parse",
    keyload_auth: "key-parse",
    connect: "ssh-connect",
    hostkey: "fingerprint-mismatch",
    shell: "remote-shell",
    garbage: "remote-shell",
  };
  for (const [mode, want] of Object.entries(cases)) {
    const r = run({ scan: good, ssh: mode });
    assert.equal(r.status, 1, mode);
    assert.equal(stage(r), want, mode);
    assertNoLeak(r);
  }
});

test("workflow keeps its guard rails", () => {
  assert.doesNotMatch(wf, /StrictHostKeyChecking=(no|accept-new)/);
  assert.match(wf, /StrictHostKeyChecking=yes/);
  assert.doesNotMatch(wf, /ssh-keygen[^\n]*\| *awk/, "no pipeline whose failure aborts under pipefail");
});
