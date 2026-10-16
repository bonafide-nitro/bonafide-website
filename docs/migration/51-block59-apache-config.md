# Block 59 (Issue #135) — Offline Apache config artifacts and preflight

Repository-only. **No** live WordPress, cPanel, domain, DNS, SSL, Search Console, hosting, staging, server request or deployment action. Nothing here was installed or tested on any Apache host, and nothing here says a host can run it.

## What was added
- `scripts/build-apache-config.mjs` (`npm run build:apache`, `npm run check:apache`) — deterministic, pure function of `deploy/apache/redirects.htaccess`; writes only under `deploy/apache/`, never a docroot.
- `deploy/apache/production.htaccess` — production candidate: `ErrorDocument 404 /404.html` (local path, so the 404 status is kept), guarded `AddType` for `.xml .txt .webmanifest .webp .avif .svg .woff2 .woff`, and the existing 41 generated redirect/protocol/host rules embedded **verbatim**. No staging content, no PHP handler, no catch-all, nothing touching `/wp-content/uploads/`.
- `deploy/apache/staging-overlay.htaccess.template` — **separate, staging-only**, never composed into production. Basic auth with human-supplied realm and `AuthUserFile` placeholders (`@@...@@`; an absolute path outside the docroot to a human-created htpasswd file), `Require valid-user` (inside the `mod_headers` branch only, so valid credentials can never override the denial), and server-enforced `Header always set X-Robots-Tag "noindex, nofollow"`. Fails closed (`Require all denied`) if `mod_headers` is absent. It is unusable until a human fills the placeholders; the repo never holds credentials, a password file, a staging host or a deploy command.
- Preflight: `node scripts/build-apache-config.mjs --preflight <file> --target production|staging [--docroot <absolute staging docroot>]` exits 1 on unsafe input; `--gates` lists open inputs. Production is blocked on any noindex/`X-Robots-Tag`/auth/placeholder/htpasswd, a missing or non-local 404, non-301 redirects, mod_alias redirects, fallback routing, upload-path rules, PHP handlers, or redirects that differ from `redirects.htaccess`. Staging is blocked on unresolved placeholders, missing/weaker noindex, incomplete auth, any directive outside the documented allowlist (e.g. `Require all granted`, `Header … unset X-Robots-Tag`), an `AuthUserFile` that resolves inside the human-supplied `--docroot` (staging preflight fails closed if `--docroot` is not given), or no fail-closed branch.
- `tests/foundation/block59-apache-config.test.mjs`.

`deploy/apache/redirects.htaccess`, `check:htaccess`, and `check:artifact` (which still rejects any `.htaccess` inside `dist/`) are unchanged. The 40 strict blockers and G1–G6 are unchanged.

## Open gates (not answerable from the repo — treated as gates, not assumed)
D1 (symlinked/custom docroot vs Model A′) · `mod_rewrite`, `mod_mime`, `mod_headers` available · `AllowOverride` permits FileInfo and AuthConfig in `.htaccess` · who installs the production file · staging host, owner, and a human-created htpasswd outside the docroot · observed host behaviour (below). Passing preflight does **not** prove any of these.

## Manual staging verification (NOT executed; needs separate recorded Žaneta approval and a locked staging host)
1. Human completes the overlay locally (`@@` values) and runs `--preflight <file> --target staging --docroot <actual staging docroot>`; installs staging config = completed overlay + `production.htaccess` per the host owner's process. Never install the overlay on the production docroot.
2. `curl -sI --resolve bonafidenitro.com:443:<STAGING_IP> https://bonafidenitro.com/` without credentials → `401`; with credentials → `200` and `X-Robots-Tag: noindex, nofollow` on HTML, XML and image responses.
3. `curl -sI --resolve … https://bonafidenitro.com/no-such-page/` → `404` with the 404 page body (not 200, not 3xx).
4. For each `defined` redirect (doc 22) → exactly one `301`, correct `Location`; `http://` and `www.` → one hop to `https://bonafidenitro.com/…`.
5. `/sitemap.xml` → `application/xml`; a `.webp` → `image/webp`; a `.woff2` → `font/woff2`; a directory without trailing slash → `301` to the slash form.
6. Confirm the production file as installed on production (later, separately approved) contains no `X-Robots-Tag` and no auth: run `--preflight <that file> --target production`.

## Results at this Block
See the READY_FOR_SANTIAGO comment for exact test output. `qa:strict` is not changed and still reports its existing blocking findings. Live/external effects: none.
