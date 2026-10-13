# Block 43 (Issue #103) — Pre-cutover security, static deployment and clean-rollback readiness

Repository-only. **No** live WordPress, cPanel, DNS, SSL, hosting, Search Console, production scanning, credential, staging deployment, production deployment, redirect or sitemap submission, Stage 9 or cutover action was taken. Egress to `bonafidenitro.com` is blocked for Claude cloud, so nothing here is an observation of the live site.

> **This document does not say the live site is safe, the compromise is remediated, or a clean rollback copy exists.** Those are open external gates (§3). Nothing in GitHub can mark them PASS.

Authority: `04-wordpress-to-static-migration-master-plan.md` §3 (security), §12 (rollback copy), §13 (QA), §14 (cutover), §15 (rollback), §18 (decisions). This runbook only adds what is missing; it does not restate those checklists.

## 1. Inventory — implemented and tested vs missing / owner-only

| Area | In repo, tested (head `3db1ca2` + this Block) | Missing / owner-only |
| --- | --- | --- |
| Build artifact | `npm run build` → `dist/` (41 pages, 84 files); `check:dist` (forbidden strings); QA T1–T11, T13 against `dist/`; **new** `check:artifact` (§2.1) | Tagged release + archived build + recorded manifest (done at cutover step 4, not now) |
| Redirects | `deploy/apache/redirects.htaccess` generated from `src/data/redirects.yaml` (41 `defined` rules, 301, one hop, mod_rewrite; `check:htaccess` stale guard; `block20` test) | Real behaviour on the cPanel host (mod_rewrite, `AllowOverride`, non-ASCII) is **unverified** (doc 22 "Staging verification procedure") |
| `.htaccess` handling | Artifact is redirects + protocol/host only. Hand-editing the server `.htaccess` is forbidden (master plan §10.4). Static builds contain no `.htaccess` (`check:artifact` rejects one in `dist/`) | No composed docroot `.htaccess` (real 404 `ErrorDocument`, staging `X-Robots-Tag`/auth, headers) exists; no decision on who installs it |
| robots / sitemap | `dist/robots.txt` (`Disallow:` empty, declares sitemap), `dist/sitemap.xml` (37 `<loc>`, includes `/products-2/`); T9/T10 | Live robots/sitemap are WordPress output until cutover; submission is a separate human action |
| Staging isolation | Nothing in repo. Static pages are deliberately **indexable**, so staging `noindex` cannot live in the build | Locked staging host (HTTP auth + `X-Robots-Tag: noindex` + IP restriction) — owner/host |
| Deploy scripts | **None** (no deploy, symlink flip, rsync, or rollback script) | Model A / A′ choice (D1), scripts, and rehearsal — later Block + approval |
| Branch / release gates | PR-only flow, never merge/deploy without recorded Žaneta approval (AGENTS.md); `build-qa.yml` runs build, `check:dist`, tests | Release tag and "deploy from tag only" rule (cutover step 4) |
| Security remediation | Static build contains none of the injected markup (T11 + `check:artifact`) | **Everything in §3** — the compromise lives in the WordPress/hosting account, not in this repo |
| Rollback | Procedure in master plan §12.3/§15.4 | No clean copy, no rehearsal, no measured restore time |

## 2. Pre-cutover verification for a staged static build (procedure only — NOT executed)

### 2.1 Local, deterministic, runnable now

```
npm ci && npm run build
npm run check:dist           # forbidden strings
npm run check:artifact       # file-set / executable / obfuscation / WordPress-runtime scan
node scripts/check-release-artifact.mjs --write-manifest build-manifest.json   # archive with the release
npm test && npm run qa:foundation && npm run check:htaccess
npm run qa:strict            # must be 0 findings before any cutover; today: 40 blocking
```

`check:artifact` (`scripts/check-release-artifact.mjs`, read-only) fails on: any extension outside a static allowlist (so no `.php`, `.sql`, archives, logs); `.htaccess`/`.htpasswd`/`.env*`/`wp-config*`/`xmlrpc.php`; `.git`, `node_modules`, `wp-admin`, `wp-includes`, `wp-json`, `wp-content/{plugins,themes,mu-plugins,upgrade}`; the three injection strings, the five obfuscated identifiers recorded in master plan §3.1 C3; `eval(`, `atob(`, `new Function(`, `String.fromCharCode`, `document.write(`, `unescape(`, long `\x..` runs; WordPress theme/plugin/includes/login/generator references, `<meta http-equiv="refresh">`, `<script>` in SVG. Retained `/wp-content/uploads/` media paths are allowed. It prints a SHA-256 tree hash; `--verify-manifest` reports missing/extra/changed files. This is a heuristic guard on the generated output only; it does not scan the host.

### 2.2 On the staged copy (requires separate approval — §5)

Run after the build is uploaded to a locked staging path, **never** against the live docroot:

1. **File-set integrity** — fetch/inspect the staged tree with the same tool: `node scripts/check-release-artifact.mjs --dir <staged-copy> --verify-manifest build-manifest.json` must report 0 missing/extra/changed. Count must equal the manifest count (84 at this head).
2. **Generated HTML security** — `check:artifact` clean; `grep -rEi 'quickdelivr|coredelivr|mpackage|wp-content/themes' <staged-copy>` returns nothing; script hosts exactly the allowlist in `qa/qa.config.json` (`www.googletagmanager.com` only).
3. **robots / sitemap / canonical equivalence** — staged `/robots.txt` and `/sitemap.xml` match the build byte-for-byte; sitemap contains `/products-2/`; every protected page is self-canonical to `https://bonafidenitro.com/...` (T3/T9/T10 already enforce this on `dist/`).
4. **Staging-only noindex** — served by the staging host (`X-Robots-Tag: noindex, nofollow` + HTTP auth). Verify the header is present on staging and that **it is absent from the build and from anything destined for production**.
5. **Redirect equivalence** — doc 22 procedure with `curl -sI --resolve bonafidenitro.com:443:<STAGING_IP> https://bonafidenitro.com<path>` (no redirect following). **Do not test by hitting a staging hostname**: every `defined` rule has an absolute `https://bonafidenitro.com/...` destination and the protocol/host rules rewrite to the production host, so a staging hostname would bounce testers onto the live WordPress site. Expect 41 rules → 301, one hop; unknown path → real 404 page.
6. **Key paths** — `/`, `/products/`, `/products-2/`, `/howtobuy/` each 200; `/products/` ≠ `/products-2/` rendered bytes; `/products-2/` has 0 internal links in (T8).
7. **Commerce external links** — `/products/` 13 Amazon destinations rendered; `nitrocoffee.store` links present. Status of store counts is an **open evidence gap** (`/products/` 13 of 16, `/products-2/` 18 of 22); do not mark commerce PASS until QA T5 clears.
8. **Transport (T12)** — http→https, www→apex one hop each, certificate valid; MIME types (`.xml`, `.webp`, `.woff2`) correct; trailing-slash 301 on directories (T13 server half).

### 2.3 Abort / rollback conditions

*Abort before routing switch (nothing is touched):* any ⛔ gate in master plan §14 fails; `qa:strict` ≠ 0; `check:artifact` ≠ 0; manifest mismatch; any §3 gate not evidenced; staging serves the build indexable or without auth; D1 undecided; rehearsed restore not timed.
*Roll back after switch:* the triggers and windows in master plan §15.2 (5xx 15 min; HTTPS/non-200 on `/`, `/products/`, `/products-2/` 30 min; malicious content in the static build — immediate). SEO volatility and AMP going to zero are **not** triggers (§15.3). Procedure: §15.4 with Zaneta as named decision-maker.

## 3. External verification required (owner or authorized security professional) — all OPEN

None of these can be performed or evidenced from GitHub. Each needs written evidence attached to a GitHub record before the matching gate flips.

| Gate | What must be demonstrated | Evidence expected |
| --- | --- | --- |
| G1 Forensic snapshot | Phase A0 (§3.2 steps 1–6): off-server, checksummed, write-once filesystem + DB + cPanel metadata + GSC screenshots | Checksums + storage location (not the data) |
| G2 Compromise & persistence removed | Resolve **S1** (origin of the obfuscated blob), S2–S8, S10–S13: file-integrity diff vs pristine WP 7.0.5/Sydney/32 plugins shows zero unexplained changes; zero `quickdelivr`/`coredelivr`/`mpackage` in filesystem **and** DB; no PHP under `uploads/`; all `.htaccess`, `wp_options`/posts/postmeta, WP-cron and server cron, `authorized_keys`, FTP, mail forwarders, cPanel tokens reviewed; **WP File Manager** reassessed; entry route identified from logs (S11) | Signed report from owner/security professional |
| G3 Accounts | **S9**: `sys_maint` and `thrive_support` confirmed or removed; all admins accounted for | Written owner confirmation |
| G4 Credential rotation | WordPress admins, cPanel, FTP/SFTP, SSH keys, DB user, API tokens rotated; 2FA on cPanel and WordPress; `wp-config.php` regenerated with new DB credentials and salts, **never restored from the forensic snapshot** | Owner attestation (no secret values in GitHub) |
| G5 Clean rollback copy | Built from **trusted pristine sources**, not the compromised archive; all §3.3 boxes ticked; two independent scans clean; 7 consecutive days without re-infection; Safe Browsing review requested | Scan reports, dated checklist |
| G6 Isolated restore test | Restore the clean copy (files + DB) in isolation (locked staging host, no shared writable paths with static docroot, locked HTTP auth). **No PHP from the compromised archive is ever executed**; only pristine core/theme/plugins plus content/uploads/DB that passed G2. Confirm homepage, `/products/`, `/products-2/`, a form, Simple 301 rules live, no injected scripts; record elapsed restore time (target < 5 min Model A, < 30 min Model A′) | Timed rehearsal log |

Repo checks (`check:artifact`, T11) prove only that the *static output* is free of the known markers. A pass there is never evidence for G1–G6.

## 4. Open decisions / access (not asked of anyone in this Block)

D1 (symlinked docroot or custom document root allowed on the GoDaddy/cPanel plan; PHP kept available post-cutover) · who installs the composed docroot `.htaccess` and staging protection · staging host name and auth owner · cutover window and named owners (§14) · release-tag owner · evidence gaps already recorded elsewhere and **not re-requested here**: Block 42 / Issue #102 (11 historical image paths) and Block 32 / Issue #83 (inaccessible sources), plus the commerce counts above and `qa:strict` findings.

## 5. Go / stop criteria and separate approvals

**GO to request a staging test** (all true): `qa:foundation`, tests and `check:artifact` green on the exact release SHA; manifest archived; G1 evidenced; D1 answered; staging host locked (auth + noindex + IP restriction) by the owner. Needs Žaneta's explicit recorded approval for that exact action.
**GO to request production cutover** (all true, plus separate recorded approval for that exact action): `qa:strict` = 0; §14 steps 1–9 ⛔ gates pass; G1–G6 evidenced (master plan §3.3 items 1–13 minimum); rollback rehearsal timed on staging; named owners and non-Friday window set.
**STOP** (any): a gate above is missing or only asserted; any QA suppression or scaffold clearance would be needed to pass; evidence would have to be invented; any step would touch live WordPress, DNS, SSL, hosting, Search Console, redirects or sitemaps without recorded approval.

## 6. Results at this Block

Branch based on `main` 3db1ca2. `npm run build` OK; `check:dist` clean; `check:artifact` OK (84 files); `npm test` all pass; Python isolation tests 303 OK; `check:htaccess` up to date; `qa:foundation` 0 invariants; **`qa:strict` FAIL with 40 blocking findings (unchanged — no QA rule changed, no scaffold cleared, nothing suppressed)**. Live/external effects: none.
