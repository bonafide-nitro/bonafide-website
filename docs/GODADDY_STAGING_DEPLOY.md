# Private GoDaddy staging preview (Issue #195)

Source-only. Merging this PR changes nothing on GoDaddy, DNS, cPanel or production. No agent runs the workflow, creates the subdomain or touches the server.

Target: `https://staging.bonafidenitro.com/`, its **own docroot outside `public_html`**, behind HTTP Basic auth. The live WordPress site on `bonafidenitro.com` is never a target: the host name is a constant in the workflow, and the remote script refuses any docroot that is, contains, sits inside, or links to `public_html` / `htdocs` / `www`.

Files: `.github/workflows/godaddy-staging-deploy.yml`, `deploy/staging/staging-remote.sh` (SHA-256 pinned in the workflow), `scripts/staging-package.mjs`, `tests/foundation/block195-godaddy-staging-deploy.test.mjs`.

## Fast public preview (Issue #198, default `access = public-noindex`)

The owner chose speed over a password: the default `access` input is `public-noindex`.

**Public staging is not private.** Anyone who has the link can view `https://staging.bonafidenitro.com/`. noindex is not access control: it only asks search engines not to index the site (server-sent `X-Robots-Tag: noindex, nofollow` plus a blanket-Disallow `robots.txt`). Do not put anything on it that must stay confidential. The build is production-faithful static content with a **mock** contact form; the build is rejected if it references the live handler, a provider key, or any forbidden string, and no secret, WordPress export, draft or private file is ever packaged.

What changes in public mode (everything else is identical to the private flow below):

- **No Basic auth**: no `.htaccess` auth, no password file, and none of `GODADDY_STAGING_AUTH_FILE`, `GODADDY_STAGING_BASIC_USER`, `GODADDY_STAGING_BASIC_PASSWORD` is needed. Only the existing SSH secrets are required.
- **Docroot derived, then verified**: if `GODADDY_STAGING_DOCROOT` is unset, the workflow reads the SSH account home (`cd ~ && pwd -P`, read-only) and uses `<home>/staging.bonafidenitro.com` as a *candidate*. It is trusted only after (1) the pinned remote script proves it is outside `public_html`/`htdocs`/`www`, neither contains nor sits inside them, is not a symlink and holds only empty/our content, and (2) an HTTPS **nonce probe** proves the staging host name serves exactly that directory. If the real cPanel docroot differs, the probe fails with `vhost-mismatch` and the build is never uploaded (setting `GODADDY_STAGING_DOCROOT` overrides the derivation).
- **TLS first**: certificate verification is never relaxed. If the host is not reachable over valid HTTPS (subdomain missing, AutoSSL not issued yet) a deploy stops with `[stage=tls-or-dns]` before writing anything; a dry-run only warns.
- **Wrong-host guard**: a blank or default host answering the request cannot pass; the random nonce file must be returned with HTTP 200 by the staging host name.
- **Explicit consent**: `deploy` needs `confirm = DEPLOY_PUBLIC_STAGING` (instead of `DEPLOY_STAGING`) and `approved_sha` = the exact commit, plus the `godaddy-staging-deploy` Environment approval. `rollback` is unchanged (`ROLLBACK_STAGING`).

Owner steps for public mode: create the subdomain in cPanel with a document root **outside `public_html`** (expected `/home/<cpanel user>/staging.bonafidenitro.com`) and make sure AutoSSL has issued a certificate for it (you said the subdomain already exists; no DNS or production change is made by the workflow). Then Actions → *GoDaddy STAGING deploy* → run on `main` with `mode = dry-run` (default access) and approve `godaddy-staging-preflight`; then `mode = deploy`, `confirm = DEPLOY_PUBLIC_STAGING`, `approved_sha` = the SHA of `main`, and approve `godaddy-staging-deploy`. Selecting `access = basic-auth` restores the private flow described in the rest of this document.

## What the workflow does

`workflow_dispatch` only, `main` only. Three modes (input `mode`, default **dry-run**):

| Mode | Environment (owner approval) | Writes? | Extra inputs |
| --- | --- | --- | --- |
| `dry-run` | `godaddy-staging-preflight` | **Nothing** | none |
| `deploy` | `godaddy-staging-deploy` | staging docroot only | `confirm` = `DEPLOY_STAGING`, `approved_sha` = the exact 40-char commit of `main` |
| `rollback` | `godaddy-staging-deploy` | staging docroot only | `confirm` = `ROLLBACK_STAGING` |

**Dry-run**: builds with `PUBLIC_CONTACT_FORM_MODE=mock`, runs the artifact checks, assembles both packages (and the staging `.htaccess` preflight), connects over fingerprint-pinned SSH, runs the read-only remote preflight, and makes one anonymous HTTPS request to the staging host (fails if it is currently publicly readable). It also sends one `HEAD` to `https://bonafidenitro.com/` to report that production is reachable (informational only).

**Deploy** order is fixed so that no website build is ever reachable unprotected:
1. Install a tiny **protection-only** tree: `.htaccess` (Basic auth + `X-Robots-Tag: noindex, nofollow`, fail-closed if `mod_headers` is missing), blanket-Disallow `robots.txt`, a placeholder page and one random-nonce file.
2. **Prove it over HTTPS** (certificate verified, no redirects): anonymous request = 401; authenticated request = 200 and returns the nonce (this proves the host name maps to the docroot that was just written, i.e. the vhost/docroot mapping is verified before anything else is uploaded); noindex header present. If any check fails the run stops and **no build bytes are uploaded**.
3. Upload and unpack the build next to the docroot, then swap it in (`mv`, two renames). The previous docroot is kept as `<docroot>.bf-prev-<UTC>` (newest 3 kept). `.well-known` (AutoSSL) is carried over.
4. Re-verify (anonymous 401, authenticated 200, noindex, `robots.txt` Disallow, marker names the deployed commit). On failure the previous protected docroot is restored automatically.

**Rollback** swaps the newest *protected* backup back in (refuses a backup lacking our auth/noindex `.htaccess`) and confirms the host still answers 401.

Contact form: the build is mock/disabled only (browser simulation, no request). The build is rejected if it contains `contact-submit`, `api.brevo.com`, an `api-key`/`xkeysib-` string, or any forbidden-string finding. The live Brevo handler and `~/bonafide-private/` are never referenced. Canonical URLs in the build still name the production host (the build is deliberately production-faithful); `noindex` + auth stop indexing.

Remote output is limited to fixed `STAGING_*` tokens; the runner never prints paths, key material, credentials, ssh stderr or file contents, and masks host, user, port, both paths and the Basic credentials.

## Owner setup (one time, each step a separate hosting write that needs your explicit approval; none is done by this PR)

1. **Subdomain** (cPanel → Domains): create `staging.bonafidenitro.com` with a document root **outside `public_html`**, e.g. `/home/<cpanel user>/staging.bonafidenitro.com`. Do **not** accept the default `public_html/staging…`. This adds a DNS record on GoDaddy.
2. **SSL**: enable AutoSSL (or install a certificate) for the subdomain and confirm `https://staging.bonafidenitro.com/` loads with a valid certificate **before** any credential is used.
3. **Password**: create the Basic-auth user. Either cPanel → *Directory Privacy* on the staging docroot (it writes the password file under `~/.htpasswds/…`) or `htpasswd -c` over SSH. Note the absolute path of the **password file**; it must be outside every web root and outside the docroot. The workflow writes its own `.htaccess` that references that file (it replaces the one Directory Privacy writes in the docroot), so Directory Privacy only has to have created the file.
4. **GitHub secrets** (Settings → Secrets, preferably as Environment secrets of both Environments; enter them only in the GitHub form, never in chat, issues or PRs):

| Secret | Value |
| --- | --- |
| `GODADDY_SSH_HOST`, `GODADDY_SSH_PORT`, `GODADDY_SSH_USER`, `GODADDY_SSH_PRIVATE_KEY`, `GODADDY_SSH_KEY_PASSPHRASE` (if encrypted), `GODADDY_SSH_HOST_FINGERPRINT` | already configured for the SSH check (`docs/GODADDY_SSH_CONNECTION.md`) |
| `GODADDY_STAGING_DOCROOT` | absolute path of the staging docroot from step 1 (letters, digits, `. _ - /`) |
| `GODADDY_STAGING_AUTH_FILE` | absolute path of the password file from step 3 |
| `GODADDY_STAGING_BASIC_USER`, `GODADDY_STAGING_BASIC_PASSWORD` | the Basic-auth login used by the workflow's verification probes (and by you in the browser). No quotes, backslashes or newlines |

5. **Environments** (Settings → Environments): create `godaddy-staging-preflight` and `godaddy-staging-deploy`, each with the owner as required reviewer and deployment branch limited to `main`.
6. Check the host allows `.htaccess` `AuthConfig` and `mod_headers` for the docroot (default on cPanel). If not, step 2 of a deploy fails with `protection-not-proven` before anything is uploaded.

## Running it (owner)

1. Actions → *GoDaddy STAGING deploy* → Run workflow on `main`, `mode` = `dry-run`; approve `godaddy-staging-preflight`. Read the result. Expected: `DRY RUN COMPLETE … Nothing was written`.
2. Separate approval: run again with `mode` = `deploy`, `confirm` = `DEPLOY_STAGING`, `approved_sha` = the full SHA shown on `main`; approve `godaddy-staging-deploy`. Expected: `Protection PROVEN …` then `Release verified …`.
3. Open the staging URL in a browser and sign in with the Basic credentials.

Failure lines look like `::error::[stage=<name>] …`: `missing-secret`, `path-format`, `script-pin`, `fingerprint-mismatch`, `preflight` (+ `STAGING_FAIL reason=<name>` such as `docroot-in-webroot`, `docroot-unrecognized-content`, `authfile-unusable`), `staging-public`, `install-protect`, `protection-not-proven`, `vhost-mismatch`, `install`, `verify`, `rollback`.

## Automatic redeploy on push to `main` (NOT enabled)

Per the Issue, auto-deploy needs a separate explicit owner decision **after** a manual deploy has proven the staging target and its protection. Enabling it later would be a small separate Block (a `push: main` trigger that runs `mode=deploy` through the same protected Environment); this PR contains no such trigger.

## Not covered

Production cutover, `public_html`, WordPress, redirects, DNS beyond the owner's subdomain step, Search Console, the live contact handler or Brevo, any Vercel preview. `deploy/apache/staging-overlay.htaccess.template` stays the single source of the staging protection rules; production artifacts remain free of staging markers (`check:apache`).
