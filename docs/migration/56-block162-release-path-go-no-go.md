# Issue #162 — Offline Apache cutover rehearsal and rollback preflight

Repository-only. No deployment, hosting or staging host, WordPress login, cPanel, DNS, SSL, Search Console, real form or transaction, credential change, new destination, meta rewrite, legal text or Phase 2 edit. Strict QA is unchanged (`npm run qa:strict`: 41 blocking findings before and after; no marker deleted or waived).

## What was added (the gap)
Block 59 validated Apache *files*, Block 62 validated the release *zip*. Nothing served the packaged build under a real Apache, and there was no rollback package or fail-closed rollback preflight.

| Command | What it does |
| --- | --- |
| `npm run rehearse:apache` (`scripts/rehearse-apache.mjs`) | Re-runs the Block 62 zip rehearsal and Block 59 production preflight, extracts the packaged `site/`, installs `deploy/apache/production.htaccess` as the docroot `.htaccess`, starts a real unprivileged Apache on `127.0.0.1` (HTTP and HTTPS with a throwaway self-signed cert; temp dir only), and asserts the groups below. Fails closed (exit 1) if Apache, openssl, the zip or the config is unusable. |
| `npm run rollback:preflight` (`scripts/rollback-package.mjs`) | Writes `rollback-out/` (`release-manifest.json` with path/bytes/sha256/stage, `SHA256SUMS` for plain `sha256sum -c`, `RESTORE-ORDER.txt`, the release zip and its checksum), then simulates install → newer release → reinstall of the retained release in a temp dir and proves the tree equals the retained manifest. `--previous-zip` uses a real earlier package. `--mode cutover` fails unless every owner prerequisite in `deploy/rollback/prerequisites.json` is `CONFIRMED` with a GitHub comment URL as evidence. |
| `deploy/rollback/prerequisites.json` | The nine owner-held rollback prerequisites, all `OPEN`, no evidence. It asserts nothing about any real backup. |

CI: `.github/workflows/preview-package.yml` installs Apache on the runner, runs both commands and the Block 162 tests with `REQUIRE_APACHE=1`, and uploads `rollback-out/` as a 14-day artifact. `npm test` skips only the Apache-dependent tests when no Apache is present (stated in the skip reason).

### Apache rehearsal checks (530 on the current build, Apache/2.4.58)
- **A** all 41 generated rules from the same `redirects.htaccess` the host receives: 38 path rules → exactly one `301` with the exact `Location` (query-string-discard rules checked with a query), internal destinations then `200`; `http://` apex, `http://www.` and `https://www.` → one hop to the https apex with path and query preserved; https apex does not loop.
- **B** every directory without trailing slash → `301` to the slash form; `/` and `/index.html` → `200 text/html`.
- **C** every one of the 101 packaged files is served `200`, byte-identical (sha256) and with the expected MIME type (`.xml`, `.txt`, `.webp`, `.svg`, fonts, `.ico`, …); no `X-Robots-Tag` or auth challenge on any response.
- **D** unknown path → real `404` with the `404.html` body and `noindex`; `wp-login.php`, `wp-admin`, `xmlrpc.php`, `wp-json`, plugins, `.htaccess`, `.htpasswd`, `.git`, `wp-config.php` → 403/404; docroot `.htaccess` is byte-equal to the production candidate and passes the production preflight (no staging overlay, noindex, auth or placeholder).
- **E** `robots.txt` declares the apex sitemap and has no blanket `Disallow`; all 37 sitemap URLs `200`, self-canonical, indexable.
- **F** critical paths with content assertions: home, `/products/` (retail), `/howtobuy/`, `/interested-in-selling-usa/` and `/nitro-coffee-kegs/` (wholesale/distributor), `/blog/`, one article, contact (`mailto:contact@bonafidenitro.com` present), booking (`aria-disabled`, `noindex`, no Calendly reference, not in sitemap); all 151 local `src`/`href` references on those pages resolve `200` through Apache; `/favicon.ico`; product-page images packaged.
- **G** no unexpected error-level lines in Apache's error log.

Observation (not changed here): an empty `.gitkeep` ships in `dist/` because `check:artifact` allowlists it; the rehearsal serves and byte-compares it. Harmless, and removing it is a separate build change.

## Finite production go/no-go table

### (a) Validated offline (repeatable: `npm run build && npm run package:preview && npm run rehearse:release && npm run rehearse:apache && npm run rollback:preflight`)
Zip safety and byte-identity to `dist/` · no PHP/WordPress runtime/forbidden strings/staging markers in the archive · production `.htaccess` is the exact generated artifact · 41 redirect rules, one hop, exact destinations · protocol/host canonicalisation · trailing slash · index · 404 status and body · MIME types · robots/sitemap/canonical · critical-path content (home, retail, how-to-buy, wholesale/distributor, blog/article, contact email fallback, booking disabled, favicon, product images) · deterministic upload manifest, checksums, stage order · offline reinstall of a retained release · rollback preflight fails closed on missing/unknown/unevidenced prerequisites.

### (b) Mandatory host-side checks at the approved cutover (cannot be simulated; need separate recorded Žaneta approval; master plan §14 steps 9–11)
1. Host has `mod_rewrite`, `mod_mime`, `AllowOverride FileInfo` for `.htaccess`, and `ErrorDocument` behaves as in the rehearsal; docroot model (symlink vs rsync) works. *Not simulated:* the real host's modules, `AllowOverride`, docroot layout, PHP coexistence.
2. Real TLS certificate, http→https and www→apex on the real certificate chain, CDN/proxy behaviour. *Not simulated:* the rehearsal uses a throwaway self-signed cert on loopback.
3. Re-run the redirect and critical-path checks from the rehearsal against the host (`curl -sI --resolve bonafidenitro.com:443:<IP> …`, never a different hostname) before the routing switch and the 10-minute smoke test after it.
4. Timed rollback rehearsal on the host (prerequisite W4) and `sha256sum -c SHA256SUMS` of the uploaded tree.
5. Analytics fires, one real contact message arrives, sitemap/robots live; Search Console actions are separate approvals.

### (c) Owner decisions that actually need an answer (none blocks the offline checks above)
| Decision | Why it is needed | Current state |
| --- | --- | --- |
| Legal privacy/terms text | Pages exist from recovered content; the owner must accept or supply wording | Open; no text invented |
| Missing commerce/distributor destinations, or explicit scope acceptance | Strict QA commerce findings remain | Open; markers not waived |
| Contact form / booking operating mode | No provider endpoint or Calendly URL approved; contact is email fallback, booking disabled | Open; both safe-disabled in the build |
| Analytics / consent | GTM present; consent mode and region policy unanswered | Open |
| Rollback prerequisites W1–W9 | Backups, clean WordPress copy, docroot model, decision-maker, archive of the release package | All `OPEN` in `deploy/rollback/prerequisites.json`; `--mode cutover` exits 1 until evidenced |

## Not claimed
No successful real rollback, no real WordPress backup (none read, assumed or restored), no host behaviour, no QA clearance. Apache here is the distribution `apache2` over loopback; PASS says the packaged artifact and its `.htaccess` behave correctly under stock Apache with those modules.
