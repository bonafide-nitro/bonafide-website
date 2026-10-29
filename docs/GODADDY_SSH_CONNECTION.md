# GoDaddy SSH connection — manual read-only check (Block 176)

Source-only. Nothing here connects to GoDaddy until the owner configures the secrets
and explicitly runs the workflow. No agent attempts SSH.

Workflow: `.github/workflows/godaddy-ssh-check.yml` (`workflow_dispatch` only, no other trigger).
The only remote command is `printf SSH_OK`. It never reads `public_html`, lists paths, or writes anything.

## GitHub secrets (Settings → Secrets and variables → Actions → Repository secrets)

| Secret | Required | Value |
| --- | --- | --- |
| `GODADDY_SSH_HOST` | yes | SSH hostname from cPanel |
| `GODADDY_SSH_PORT` | yes | SSH port from cPanel (numeric) |
| `GODADDY_SSH_USER` | yes | cPanel SSH username |
| `GODADDY_SSH_PRIVATE_KEY` | yes | Private key (authorized in cPanel → SSH Access) |
| `GODADDY_SSH_KEY_PASSPHRASE` | only if the key is encrypted | Key passphrase |
| `GODADDY_SSH_HOST_FINGERPRINT` | yes | Server host key fingerprint, `SHA256:...` form |

Enter these only in the GitHub secrets form. Never paste them in chat, issues, PRs, logs or to Claude.
The workflow fails closed if any required secret is empty.

## Where the owner gets the values

- Host, port, username: GoDaddy account → Web Hosting → cPanel Admin → Terminal/SSH Access page,
  or the hosting plan's "Settings" section (SSH is shown there when enabled). If unsure, ask GoDaddy support.
- Host key fingerprint: obtain it out of band, not from the workflow. Options: GoDaddy support or documentation,
  or from a trusted network run `ssh-keyscan -p <port> <host> | ssh-keygen -lf - -E sha256`
  and confirm the result with GoDaddy before saving it. Prefer the ed25519 or RSA line; the workflow accepts a match on any scanned key type.
- Host keys are never trusted automatically: `StrictHostKeyChecking=no` is not used. `ssh-keyscan` output
  is accepted only if its fingerprint equals `GODADDY_SSH_HOST_FINGERPRINT`, then used with `StrictHostKeyChecking=yes`.

## Approval gate (GitHub Environment)

The job uses the Environment `godaddy-ssh-readonly`. Owner setup:
1. Settings → Environments → New environment → `godaddy-ssh-readonly`.
2. Add Required reviewers (the owner) and restrict deployment branches to `main`.
3. Each run then waits for explicit approval. The job also refuses to run on any ref other than `main`.

Optionally move the six secrets into that Environment (as Environment secrets) so they
are unavailable to anything that has not been approved.

## Passphrase-protected cPanel RSA key

Supported: the passphrase is stored as `GODADDY_SSH_KEY_PASSPHRASE` and delivered through `SSH_ASKPASS`
reading an environment variable, so it never appears on a command line. GitHub masks secret values in logs;
the workflow additionally masks host, user and port, disables `xtrace`, writes the key to a `umask 077` temp directory
that is removed on exit, and suppresses ssh error detail.

Safer provisioning (recommended for future deploys): create a dedicated deploy key used only by GitHub Actions,
authorize only that key in cPanel, and revoke/rotate it if it is ever exposed. A passphrase stored alongside the key
in the same secret store adds little protection, so do not rely on it as a second factor; the Environment approval
and fingerprint pin are the real gates. If the cPanel-generated key's passphrase cannot be used non-interactively,
generate a new ed25519 key locally (`ssh-keygen -t ed25519`), import its public half in cPanel → SSH Access → Import Key,
and store the private half as `GODADDY_SSH_PRIVATE_KEY`.

## Running the test (owner only)

Actions → "GoDaddy SSH connectivity check (manual, read-only)" → Run workflow on `main` → approve the Environment prompt.
Expected log line: `SSH_OK received.` Failures print generic errors only (details are withheld on purpose).

## Out of scope

Deployments, file transfer, WordPress, DNS, email, Brevo, any form endpoint, and PR #175 (installer prep).
