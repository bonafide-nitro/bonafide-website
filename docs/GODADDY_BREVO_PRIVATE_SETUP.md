# GoDaddy Brevo private setup — manual protected workflow (Issue #181)

Source-only. Nothing connects to GoDaddy until the owner runs the workflow and approves its Environment.
Nothing happens on merge. No agent runs it.

Workflow: `.github/workflows/godaddy-brevo-private-setup.yml` (`workflow_dispatch` only, `main` only).
It reuses the pinned-host-key SSH pattern of `godaddy-ssh-check.yml` (`docs/GODADDY_SSH_CONNECTION.md`) and the same six
`GODADDY_SSH_*` secrets (including `GODADDY_SSH_HOST_FINGERPRINT`). Nothing about host checking is weakened.

## What it does

1. Verifies the two audited files in the checkout against pinned SHA-256 hashes (a changed installer or template stops the run until re-audited).
2. Verifies the host key against `GODADDY_SSH_HOST_FINGERPRINT`, then connects with `StrictHostKeyChecking=yes`.
3. Creates one **unique scratch directory** `~/.bonafide-stage.XXXXXXXX` (mode 700) in the server home, **outside `public_html`**.
   It refuses symlinks and anything resolving inside `public_html`.
4. Uploads **only** `install-private-config.sh` and `contact-config.example.php` there (SCP), then re-checks hashes, file types and permissions remotely.
5. Runs the existing installer from the scratch directory, with output filtered so the home path is shown as `~`.
6. Removes the scratch directory on exit, success or failure.

## Inputs

| `action` | Installer mode | Effect on the server |
| --- | --- | --- |
| `dry-run` (default) | `dry-run` | No private file is written. The **transport itself** creates and then removes the scratch directory in the home (step 3–6). Reports PHP >= 8.1, cURL, mbstring, and existing `bonafide-private/`, `ratelimit/`, config status. |
| `apply-private` | `apply` | Creates `~/bonafide-private/` and `~/bonafide-private/ratelimit/` (700) and a placeholder `contact-config.php` (600) **only if absent**. Idempotent; an existing config is never overwritten. Keeps `mode` in test. |

Run `dry-run` first. Choose `apply-private` only when the owner has decided to prepare the private folder.

## What it never does

- Upload the PHP submission endpoint, or write anything in `public_html`; deploy Astro; touch WordPress, DNS or Vercel; list the webroot.
- Read, print, accept or write the Brevo API key or any passphrase. The installer makes no network request and sends no email.
- Enable real contact email: the config stays in `test` mode with placeholders.
- Print host, user, port, key or ssh stderr. Failures print one line: `::error::[stage=<name>]`
  (`input`, `missing-secret`, `local-files`, `host-scan`, `host-key-parse`, `fingerprint-mismatch`, `key-parse`, `ssh-auth`, `ssh-connect`, `scratch-create`, `upload`, `upload-verify`, `installer`).

## Owner setup (one time, GitHub UI)

1. Settings → Environments → New environment → **`godaddy-brevo-private-setup`**.
2. Required reviewers: the owner. Deployment branches: `main` only.
3. Secrets: the existing six `GODADDY_SSH_*` repository secrets are reused. Optionally move them into this Environment.
   No new secret is needed. Do not add the Brevo key anywhere in GitHub.

## Running

Actions → "GoDaddy Brevo private setup (manual, protected, private-only)" → Run workflow on `main` → pick `action` → approve the Environment prompt.

## Entering the Brevo API key (owner only)

After `apply-private`, open `~/bonafide-private/contact-config.php` in the **cPanel File Manager editor** (or `nano` over your own SSH) and enter the key
yourself, then re-run `dry-run` (it reports `brevo_api_key set` without showing the value). Never paste the key in chat, GitHub, a workflow or the repo.

## If SCP is refused by the host

The run fails at `upload` and nothing else happens (the scratch directory is removed). Fallback: upload the two files from
`deploy/contact/` yourself with cPanel File Manager into a new folder in the home directory (not `public_html`), then run
`bash install-private-config.sh dry-run` in cPanel Terminal. No unsafe workaround is built in.

## Rollback

- The scratch directory is removed automatically. If a run was cancelled mid-way, delete any `~/.bonafide-stage.*` folder in cPanel File Manager.
- `apply-private` only ever adds `~/bonafide-private/`, `ratelimit/` and `contact-config.php` when each is absent, and never overwrites an existing
  `contact-config.php`. Before undoing anything, run `dry-run` first: items it reports as already existing (`exists (left as is)`,
  `already exists (never overwritten)`) were NOT created by the run. Do not delete those; they may hold owner-entered credentials or rate-limit state,
  and deleting them disables an already configured endpoint.
- To undo only what a specific run created, delete just the items that run reported as `[did] create ...` / `[did] copy ...` (for a first-time run
  that is the whole `~/bonafide-private/` folder; if the folder pre-existed, remove only the newly created `ratelimit/` and/or an untouched
  template-copy `contact-config.php` that contains no key you entered). Nothing else on the server was changed; WordPress and `public_html` are unaffected.
- Disable the workflow in Actions, or remove the Environment, to stop all further runs.

## Out of scope

Endpoint upload, Astro deploy, real email, Brevo API calls, DNS/WordPress/Vercel changes, and entering secrets.
