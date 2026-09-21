# BONA FIDE — WORDPRESS TO GITHUB STATIC MIGRATION MASTER PLAN

**Domain:** `https://bonafidenitro.com` — unchanged. This is **not** a domain migration.
**Date:** 21 September 2026
**Status:** PLAN ONLY. No code written. No production change. No WordPress change. No DNS change. No redirect created. No Search Console change.

**Authoritative evidence base (do not re-derive):**

1. `BONA FIDE — PRE-MIGRATION SEO BASELINE`
2. `bona-fide-seo-baseline-RAW-DATA-APPENDIX.md`
3. `BONA FIDE — PRODUCTS / PRODUCTS-2 FORENSIC SEO PRESERVATION REPORT`
4. The read-only WordPress crawl inventory contained in (3) §15

---

## 1. EXECUTIVE SUMMARY

Bona Fide is moving a 16-month-old, lightly-trafficked but **highly concentrated** organic footprint off a compromised WordPress installation onto a GitHub-controlled static site, on the same domain and initially the same hosting, while keeping a *cleaned* WordPress copy as a live rollback asset.

**The numbers that govern every decision in this plan.** Over 16 months the property earned 4,590 clicks from 356,000 impressions. **Four URLs carry 84% of those clicks** (`/`, `/products/`, `/howtobuy/`, and the HTTP homepage variant). 42 pages are indexed. 182 external links come from 65 domains, 129 of them pointing at the homepage. 86% of clicks are US. Mobile and desktop are level on clicks but mobile ranks nine positions better.

**Three findings reshape the project beyond a normal CMS swap:**

1. **A live security compromise.** The active Sydney theme's `header.php` injects two lookalike-CDN scripts into `<head>` on every public page, next to obfuscated inline JavaScript. Search Console reports "Deceptive pages" with no sample URLs. **This makes the current WordPress filesystem unusable as a rollback target**, and it must be remediated on the current install *before* cutover — a static rebuild removes the symptom, not the access route, and both live in the same hosting account.
2. **`/products/`** **and** **`/products-2/`** **are two different commercial pages, not duplicates.** `/products-2/` is WordPress page 7801, titled "Products NEW", created 2022-04-25 as a clone that then diverged into a wholesale/trade catalogue with a published price list and six Alliance Brand SKUs that exist on no other URL. It is the **best-ranking page on the domain for** **`pet coffee keg`** (position 4.3 vs `/products/` at 14.0). Google has independently selected each as its own canonical. Both ship as static 200s with self-canonicals and no redirect between them. Its only discovery path is the XML sitemap — that is load-bearing and must be reproduced exactly.
3. **The drift mechanism is architectural, and the rebuild can fix it without touching either URL.** Product data on both pages is hand-typed inside Thrive Architect; there is no single source of truth, which is precisely why the two pages diverged. The new repository will hold **one** **`products`** **dataset** rendered through **two views** — a retail view at `/products/` and a wholesale view at `/products-2/` — encoding today's differences as data rather than losing them. This preserves both URLs' unique equity and eliminates the cause of the original problem.

**The plan is sequenced in four phases:** secure → build → cut over → optimise. Security remediation and the creation of a verified-clean WordPress rollback copy are **hard prerequisites** to cutover. The static launch reproduces Google's current understanding of the site as faithfully as possible and changes nothing else. Optimisation — including the `/products-2/` title differentiation, tea architecture, B2B expansion and any consolidation — is explicitly out of launch scope and gated behind a minimum 90-day observation window.

**Expected, planned losses at launch:** AMP (8,415 impressions/quarter at 0.4% CTR, 32 clicks) disappears. This is a deliberate trade, not a failure, and must not trigger rollback.

---

## 2. MIGRATION PRINCIPLES

These are binding. Every later decision in this document is justified against them.

| # Principle Practical consequence  |                                                               |                                                                                                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1**                             | **Preservation first. Migration second. Optimisation third.** | Nothing is "improved" during the platform change.                                                                                                                                                                    |
| **P2**                             | **The CMS change is the only variable.**                      | No URL changes, no intent rewrites, no taxonomy changes, no consolidation on launch day.                                                                                                                             |
| **P3**                             | **When in doubt, preserve both.**                             | Where two URLs both hold equity, ship both as 200s and consolidate later with evidence. Applies to `/products/` + `/products-2/`, and to `/nitro-cold-brew/` + `/nitro-cold-brew-old/`, and the health-cluster pair. |
| **P4**                             | **Preserve SEO meaning, not WordPress implementation.**       | Thrive Architect markup, Sydney PHP, inline plugin CSS and the 76 KB `tve_custom_css` blobs are discarded. Titles, H1s, headings, copy, product data, links, image paths, schema and canonicals are carried across.  |
| **P5**                             | **The compromised filesystem is evidence, never production.** | Three separate states: forensic snapshot, clean rollback copy, static production.                                                                                                                                    |
| **P6**                             | **Rollback must be executable, not theoretical.**             | Verified on staging before cutover, with a named owner and a documented time-to-restore.                                                                                                                             |
| **P7**                             | **The repository is the source of truth.**                    | Routine content edits happen in Git, never in WordPress. WordPress becomes read-only the moment the static site goes live.                                                                                           |
| **P8**                             | **Every protected URL is a test, not a hope.**                | The SEO baseline becomes a machine-readable manifest that CI enforces.                                                                                                                                               |
| **P9**                             | **Nothing is deleted on launch day.**                         | Not WordPress, not the database, not uploads, not the old sitemaps. Retirement is a separate, later decision.                                                                                                        |
| **P10**                            | **Zero unexpected 404s.**                                     | Any old URL that returns 404 without being explicitly classified as such is a launch blocker.                                                                                                                        |

---

## 3. SECURITY PREREQUISITE (PART A)

**Do not remediate yet. This is the procedure to follow when remediation is authorised.**

The static rebuild does **not** remediate this. The Safe Browsing flag attaches to the domain, and the static site will be served from the same hosting account. If the entry route is an account credential, a vulnerable plugin, or a shell dropped elsewhere on the account, the new static docroot is equally reachable.

### 3.1 Evidence classification

#### CONFIRMED COMPROMISE INDICATORS

| # Indicator Evidence  |                                                                         |                                                                                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1                    | Third-party script injection in the active theme                        | `wp-content/themes/sydney/header.php`, 59 lines, **lines 18–19**, loading `cdn.quickdelivr.com/mpackage.js` (×2) and `cdn.coredelivr.com/mpackage.js`                                 |
| C2                    | Injection present site-wide                                             | Verified on `/`, `/products/`, `/products-2/`, `/howtobuy/`, `/about/`, `/blog/`, `/contact-bona-fide-nitro-coffee-and-tea/`, `/nitro-cold-brew/` — 3 references per page, every page |
| C3                    | Obfuscated inline JavaScript adjacent to the injection, inside `<head>` | Randomised identifiers `kEWRpcHH`, `wConDmkjW`, `lcKgBdJa`, `NdLCkEWOVdMG`, `hSkdzblcUG`                                                                                              |
| C4                    | Google Safe Browsing flag                                               | Search Console → Security issues → **"Deceptive pages"**, Sample URLs: **N/A**                                                                                                        |
| C5                    | Lookalike CDN hostnames serving an identically-named payload            | Two unrelated "delivr" domains both serving `mpackage.js`                                                                                                                             |
| C6                    | Spam referring domain                                                   | URL Inspection lists `http://weon.polylepistizttyrant.lol/` as a referring page for `http://bonafidenitro.com/`                                                                       |

#### REQUIRES SERVER INVESTIGATION — cannot be resolved read-only from the browser

| # Question Why it matters  |                                                                                                                                                                                                    |                                                                                                                                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1                         | **Where does the large obfuscated inline blob come from?** `header.php` is only 2,148 bytes with no line over 192 characters, so it is not the source of the full blob seen in rendered HTML       | There is at least one more injection point                                                                                                                                                                                                                   |
| S2                         | Are WordPress core files modified?                                                                                                                                                                 | WP 7.0.5 running, 7.1.1 available                                                                                                                                                                                                                            |
| S3                         | Are any of the 32 active plugins modified or backdoored?                                                                                                                                           | Plugin file-integrity check                                                                                                                                                                                                                                  |
| S4                         | Are there PHP files in `wp-content/uploads/` or other non-executable directories?                                                                                                                  | Classic webshell location                                                                                                                                                                                                                                    |
| S5                         | What is in `.htaccess` (root, `wp-admin`, `wp-content`, `uploads`)?                                                                                                                                | Conditional-redirect cloaking                                                                                                                                                                                                                                |
| S6                         | Are `wp_options`, `wp_posts` or `wp_postmeta` carrying injected script or base64 blobs?                                                                                                            | Database-level persistence                                                                                                                                                                                                                                   |
| S7                         | What is in `wp_cron` / scheduled events?                                                                                                                                                           | Re-infection timer                                                                                                                                                                                                                                           |
| S8                         | Are there unexpected admin users, or users with recently changed passwords/emails?                                                                                                                 | See S9                                                                                                                                                                                                                                                       |
| S9                         | **Are** **`sys_maint`** **(ID 6) and** **`thrive_support`** **(ID 2) expected accounts?** Known accounts: John Goerke/`admin` (ID 1), `thrive_support` (2), Noelle (4), Arnel (5), `sys_maint` (6) | `sys_maint` in particular has no obvious owner. `thrive_support` is plausibly a legitimate Thrive Themes support account that should have been removed after use                                                                                             |
| S10                        | Server-level persistence: cron jobs, `.bashrc`/profile, SSH `authorized_keys`, mail filters, cPanel API tokens, FTP accounts                                                                       | Only visible with shell/cPanel access                                                                                                                                                                                                                        |
| S11                        | Access/error log review for the injection window                                                                                                                                                   | Establishes entry route and timeline                                                                                                                                                                                                                         |
| S12                        | Are file permissions writable where they should not be (`755`/`644` expectations, `wp-config.php`)?                                                                                                |                                                                                                                                                                                                                                                              |
| S13                        | Do any plugins have known CVEs at their installed version?                                                                                                                                         | 32 active plugins, several long-unmaintained (`404 to Start`, `Faq Responsive`, `Reveal IDs`, `WP File Manager`) — **`WP File Manager`** **has a well-known history of critical RCE vulnerabilities and is the single highest-suspicion plugin on the list** |

#### CLEAN / LEGITIMATE COMPONENTS — verified, do not chase

| Component Status                                                                                 |                                                                                                         |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `Head & Footer Code` plugin contents                                                             | Clean. Two blocks (625 and 242 characters) holding **GTM, Facebook Pixel, Klaviyo** only. No injection. |
| `Simple 301 Redirects` rules                                                                     | Clean. 11 rules, all `/services/*` + `/collections-nitro-coffee/` → `nitrocoffee.store`.                |
| `Yoast SEO Redirects`                                                                            | Empty — zero rules.                                                                                     |
| `wp-login.php`                                                                                   | No injection present.                                                                                   |
| AMP-rendered pages (`/…/amp/`)                                                                   | No injection present.                                                                                   |
| RSS feed (`/?feed=rss2`)                                                                         | No injection present.                                                                                   |
| REST API root (`/wp-json/`)                                                                      | No injection present.                                                                                   |
| Manual Actions                                                                                   | No issues detected.                                                                                     |
| HTTPS report                                                                                     | 0 non-HTTPS URLs, no issues in 90 days.                                                                 |
| `robots.txt`                                                                                     | Clean; declares `wp-sitemap.xml`.                                                                       |
| Third-party scripts `www.google.com/recaptcha/api.js`, `static.klaviyo.com/onsite/js/klaviyo.js` | Legitimate.                                                                                             |

**INTERPRETATION of the clean list:** the injection is scoped to the **theme render path** only. That is consistent with a single modified theme file plus at least one other front-end-only injection point (S1), rather than a core-level or database-level infection — but that must be *verified*, not assumed.

### 3.2 Remediation procedure (ordered)

**Phase A0 — Capture, before touching anything**

1. Full filesystem backup of the hosting account (not just `public_html`) — tar/zip, downloaded off-server, checksummed.
2. Full MySQL dump, downloaded off-server, checksummed.
3. Export cPanel account metadata: cron jobs, email accounts and forwarders, FTP accounts, API tokens, subdomains, SSL certs, PHP version.
4. Export Search Console state: current Security issues screen, Page Indexing counts, sitemap list.
5. Record the Sydney `header.php` contents and SHA-256 hash as evidence.
6. Store all of the above as the **FORENSIC SNAPSHOT**, write-once, offline, never served.

**Phase A1 — Establish ground truth**
7\. Download pristine copies of WordPress core 7.0.5, the Sydney theme at its installed version, and all 32 plugins at their installed versions.
8\. Run a file-integrity diff of the live filesystem against those pristine copies. Produce a definitive **modified/added/unexpected file list**.
9\. Specifically diff `wp-content/themes/sydney/` and confirm whether a child theme exists.
10\. Enumerate every file modified in the last 24 months, sorted by mtime.
11\. Search the filesystem for: `base64_decode`, `eval(`, `gzinflate`, `str_rot13`, `assert(`, `preg_replace` with `/e`, `FilesMan`, `quickdelivr`, `coredelivr`, `mpackage`.
12\. Search for `.php` files under `wp-content/uploads/` (there should be none).
13\. Review every `.htaccess` on the account.
14\. Resolve **S1** — locate the origin of the obfuscated inline blob.

**Phase A2 — Database**
15\. Search `wp_options` for injected `<script`, `//cdn.`, base64 blobs, and unexpected autoloaded options.
16\. Search `wp_posts` / `wp_postmeta` for the same, including inside Thrive's `tve_updated_post` and `tve_custom_css` meta on all pages.
17\. Inspect `wp_users` and `wp_usermeta`: list all users, roles, registration dates, last-login where available, and `wp_capabilities`.
18\. **Resolve S9** — confirm with John Goerke whether `sys_maint` and `thrive_support` are expected. Any unexplained account is treated as a compromise indicator.
19\. Inspect scheduled events (`cron` option) for unknown hooks.

**Phase A3 — Access paths**
20\. Review and rotate: WordPress admin passwords, cPanel password, FTP/SFTP accounts, SSH keys, database user password, any API tokens. Enable 2FA on cPanel and WordPress admin.
21\. Review `authorized_keys`, server cron, and mail forwarders.
22\. Review plugin versions against CVE databases. Prioritise **WP File Manager**.
23\. Review file permissions and ownership.

**Phase A4 — Clean**
24\. Replace WordPress core with pristine files.
25\. Replace the Sydney theme with a pristine copy — **and re-apply only the customisations that are verified legitimate**. The malicious `header.php` lines are not re-applied. *(Note: because the static site will not use this theme, theme customisations only need to be good enough for the rollback copy to render correctly.)*
26\. Replace all plugin files with pristine copies. Deactivate and delete plugins that are not needed for the rollback copy to function — in particular reassess **WP File Manager**.
27\. Remove confirmed malicious files.
28\. Clean any database injections found in A2.
29\. Remove or lock any unexplained users.
30\. Purge caches (WP-Optimize) and any CDN cache.

**Phase A5 — Verify**
31\. Re-crawl every page of the cleaned install and confirm zero references to `quickdelivr`, `coredelivr`, `mpackage`, and zero obfuscated inline blocks.
32\. Re-run the file-integrity diff — expect zero unexplained modifications.
33\. Scan with at least two independent tools (e.g. Wordfence + an external scanner such as Sucuri SiteCheck).
34\. Confirm the legitimate integrations still render: GTM, Facebook Pixel, Klaviyo, reCAPTCHA, Contact Form 7.
35\. Monitor for 7 days for re-infection before declaring clean.

**Phase A6 — Google**
36\. In Search Console → Security issues, click **Request Review**, describing what was found and fixed.
37\. Track until the issue clears. Expect days, not hours.

### 3.3 Definition of CLEAN — all must be true

The WordPress rollback copy may be called CLEAN only when **every** statement below is verifiably true and documented:

- [ ] A forensic snapshot exists off-server, checksummed, and has not been modified.
- [ ] File-integrity diff against pristine core/theme/plugins shows **zero unexplained modifications**.
- [ ] `quickdelivr`, `coredelivr` and `mpackage` return **zero** matches across filesystem and database.
- [ ] The origin of the obfuscated inline blob (S1) has been **located and removed** — not merely no longer rendering.
- [ ] No `.php` files exist in `wp-content/uploads/` or other upload paths.
- [ ] All `.htaccess` files reviewed and understood.
- [ ] Database scanned for injections; any found, removed.
- [ ] Every WordPress user account is accounted for and owned. `sys_maint` and `thrive_support` explicitly resolved.
- [ ] All credentials rotated; 2FA enabled on cPanel and WordPress.
- [ ] Scheduled tasks (WP cron and server cron) reviewed.
- [ ] Two independent malware scans return clean.
- [ ] 7 consecutive days with no re-infection.
- [ ] A Safe Browsing review has been **requested**; ideally cleared.
- [ ] All legitimate content, media and settings are intact and the site renders correctly.
- [ ] The clean copy is stored separately from the forensic snapshot and separately from the static production docroot.

**Cutover gate:** items 1–13 must be complete before the static site goes live. The Safe Browsing review *clearing* is desirable before cutover but is not a hard blocker, because the static site removes the offending markup from the served pages — **provided** the access route has been closed.

---

## 4. CURRENT ARCHITECTURE (PART B, current state)

```
                        bonafidenitro.com  (apex, HTTPS)
                                 │
                    ┌────────────┴────────────┐
                    │  GoDaddy / cPanel host  │
                    └────────────┬────────────┘
                                 │  public_html/
                                 ▼
                      ┌──────────────────────┐
                      │  WordPress 7.0.5     │
                      │  PHP + MySQL render  │
                      └──────────┬───────────┘
                                 │
        ┌────────────┬───────────┼───────────┬──────────────┐
        ▼            ▼           ▼           ▼              ▼
   Sydney theme  Thrive      32 active    Yoast SEO     AMP plugin
   (header.php   Architect   plugins      (canonical,   (29 /amp/
    COMPROMISED) (page       (Simple 301,  schema,       twins)
                  content in  CF7,          sitemap
                  post meta)  BookingPress, fallback)
                              Klaviyo,
                              H&F Code …)
                                 │
                                 ▼
                    wp-content/uploads/  (all media, some ranking)

```

**Key characteristics of the current stack that the migration must address:**

| Characteristic Detail Consequence    |                                                                                                                                           |                                                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Page content lives in post meta      | `tve_updated_post` (235 KB on page 147, 299 KB on 7801) plus \~76 KB `tve_custom_css` each                                                | Content cannot be cleanly exported; it must be **transcribed from the rendered page**, which is how the forensic report captured it |
| No product data model                | Product names, descriptions, nutrition and prices are hand-typed inside Thrive on each page                                               | The direct cause of `/products/` ↔ `/products-2/` drift                                                                             |
| Sitemap generated by WordPress core  | `/sitemap.xml` → `/wp-sitemap.xml` → 4 children, 50 URLs                                                                                  | Disappears with WordPress; must be regenerated                                                                                      |
| Canonicals generated by Yoast        | Self-canonical on all indexable pages                                                                                                     | Must be regenerated by the static build                                                                                             |
| Schema generated by Yoast            | `WebPage` + `ImageObject` + `BreadcrumbList` + `WebSite`, plus `Article` + `Person` on posts. 24 valid breadcrumb pages, 1 review snippet | Must be regenerated                                                                                                                 |
| Redirects in a plugin                | 11 rules in Simple 301 Redirects                                                                                                          | Must move to `.htaccess`, generated from repo data                                                                                  |
| Tracking in a plugin                 | GTM, Facebook Pixel, Klaviyo in Head & Footer Code                                                                                        | Must be reimplemented from source configuration, not copy-pasted from page HTML                                                     |
| Forms                                | Contact Form 7 (3–4 forms on every page) + reCAPTCHA                                                                                      | Needs a static-compatible replacement                                                                                               |
| Booking                              | BookingPress generates 6 pages and parameter URLs                                                                                         | Decision gate — see §11                                                                                                             |
| 404 handling                         | `404 to Start` plugin redirects 404s to the homepage                                                                                      | **Masks broken links today and must not be reproduced.** Static site returns a real 404 with a real 404 status                      |
| Only 3 pages have a meta description | `/products/`, `/products-2/` (identical), `/services/hair-raiser-organic/`                                                                | Not a launch fix; noted in the backlog                                                                                              |
| Media                                | `wp-content/uploads/` — \~20 image URLs rank in web search; 2 PDFs indexed                                                                | **Paths must be preserved**                                                                                                         |

---

## 5. TARGET ARCHITECTURE (PART B, target state)

```
   ┌──────────────── GitHub repository (SOURCE OF TRUTH) ────────────────┐
   │  content (MD/MDX) · data (YAML) · layouts · components · redirects  │
   │  seo-baseline.json (protected URL manifest) · QA test suites        │
   └───────────────┬───────────────────────────────┬─────────────────────┘
                   │ PR                            │ merge to main
                   ▼                               ▼
      ┌─────────────────────────┐      ┌──────────────────────────┐
      │ PREVIEW BUILD           │      │ PRODUCTION BUILD (CI)    │
      │ Cloudflare Pages /      │      │ static HTML + assets     │
      │ Netlify preview URL     │      │ + generated .htaccess    │
      │ noindex + password      │      │ + sitemap.xml            │
      └─────────────────────────┘      └────────────┬─────────────┘
                                                    │ deploy (rsync / FTPS / git)
                                                    ▼
   ┌──────────────────────── GoDaddy / cPanel account ─────────────────────┐
   │                                                                       │
   │   /home/<user>/sites/static-<build>/   ← static production docroot    │
   │   /home/<user>/sites/current  ─────────► symlink (the switch)         │
   │   /home/<user>/sites/wp-clean/         ← CLEAN WordPress rollback     │
   │        └── reachable only via a locked staging host, never public     │
   │                                                                       │
   │   public_html  ──► points at  sites/current                           │
   └───────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                    bonafidenitro.com  (same domain, same SSL, NO DNS CHANGE)

   FORENSIC SNAPSHOT: off-server, offline, write-once. Never served. Ever.

```

### 5.1 How production routing changes without destroying WordPress

**DATA constraint from the brief:** same hosting, same domain, same SSL initially. No DNS migration.

**Recommended mechanism — the symlink switch (Model A).**

1. Before cutover, WordPress is physically moved (not copied away from the domain, *moved*) so that `public_html` no longer contains a live WordPress install. The clean WordPress copy lives at `/home/<user>/sites/wp-clean/`, served only through a locked staging host (HTTP auth + `X-Robots-Tag: noindex`).
2. The static build is deployed to a **timestamped directory**: `/home/<user>/sites/static-2026-11-04-1430/`.
3. `/home/<user>/sites/current` is a **symlink**. Cutover = repoint the symlink at the new static directory. Rollback = repoint it at `wp-clean`. Both are atomic and take under a second.
4. `public_html` is itself a symlink to `sites/current`, or the vhost document root is set to it.

**Why this design:** cutover and rollback become a one-line operation with no DNS TTL, no SSL re-issue, no file copying, and no risk of a half-deployed state. Every past static build remains on disk for instant re-deployment.

**Dependency — must be confirmed with GoDaddy before committing:** not every cPanel plan permits a symlinked `public_html` or a custom document root, and some have `symlink protection` enabled. **D1 in §18.**

**Fallback mechanism (Model A′) if symlinks are not permitted.** Keep `public_html` as a real directory. Deploy static builds there via rsync with `--delete`, from a directory that is itself a mirror of the build. Keep the clean WordPress at `/home/<user>/sites/wp-clean/`. Rollback = an rsync of `wp-clean` into `public_html` plus restoring the WordPress `.htaccess`. Slower (minutes, not seconds) but universally supported. **This must be rehearsed and timed on staging.**

**Future upgrade path (Model B) — not part of this migration.** Once the static site is stable, putting Cloudflare (free tier) in front of the origin gives edge caching, a WAF, and an instant origin-swap rollback. That introduces a nameserver change and is therefore deliberately excluded from this project, which is scoped as "not a domain migration".

### 5.2 What WordPress becomes

| Aspect After cutover  |                                                                                                                                                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public serving        | **None.** WordPress no longer answers any request on `bonafidenitro.com`.                                                                                                                                               |
| Accessibility         | A locked staging host (e.g. `wp-legacy.bonafidenitro.com`) behind HTTP auth, `noindex`, and IP restriction where possible.                                                                                              |
| Editing               | **Frozen.** WordPress becomes read-only the moment the static site is live. Any content change made in WordPress after cutover creates drift between the rollback copy and production and must be prohibited by policy. |
| Purpose               | Rollback asset and content archive.                                                                                                                                                                                     |
| Retirement            | A separate decision, no earlier than 90 days post-launch. See §12.5.                                                                                                                                                    |

---

## 6. SEO PRESERVATION CONSTRAINTS

These are non-negotiable inputs to every other section.

### 6.1 The protected set

**Tier 1 — URLs that must not change, for any reason (17 URLs).** Together these carry 4,078 of 4,590 clicks (89%) and 168 of 182 external links (92%).

`/` · `/products/` · `/products-2/` · `/howtobuy/` · `/kegerators/` · `/nitro-cold-brew/` · `/hot-nitro-coffee/` · `/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/` · `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/` · `/about/` · `/contact-bona-fide-nitro-coffee-and-tea/` · `/coffee-on-tap-is-the-future/` · `/nitro-coffee-kegs/` · `/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/` · `/blog/` · `/nitro-coffee-questions/` · `/hot-nitro-equipment-rental/`

**Tier 2 — URLs preserved at launch under principle P3, reviewed after 90 days (14 URLs).**

`/nitro-cold-brew-old/` · `/nitro-coffee-health-benefits/` · `/what-is-nitro-cold-brew-coffee/` · `/nitro-cold-brew-coffee-made-easy-2/` · `/a-touch-of-vanilla-to-your-nitro-coffee/` · `/coffee-trends-dominate-2018/` · `/how-ambient-stable-coffee-kegs-help-you-save-more-money/` · `/nitro-coffee-in-time-of-covid-19-pandemic-how-safe-is-it/` · `/is-coffee-healthy/` · `/coffee-doesnt-produce-cancer-says-leading-american-scientist/` · `/nitro-coffee-future/` · `/interested-in-selling-usa/` · `/interested-in-selling-eu-and-usa/` · `/interested-in-selling-eu-qr-2/`

### 6.2 Constraint table

| # Constraint Source  |                                                                                                                                                                                 |                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| SEO-1                | All 17 Tier-1 and 14 Tier-2 URLs return static **200**, same path, **same trailing slash**, self-canonical, indexable                                                           | Baseline §16d; forensic §12                                            |
| SEO-2                | `/products-2/` gets **no redirect, no cross-canonical, no noindex, no slug change, no intent rewrite, and no new internal links at launch**                                     | Forensic report, conclusions                                           |
| SEO-3                | `/products-2/` **must** be in the new XML sitemap — it is its only discovery path                                                                                               | URL Inspection: sole referring page is `wp-sitemap-posts-page-1.xml`   |
| SEO-4                | `BreadcrumbList` JSON-LD on all 24 pages that carry it today                                                                                                                    | Breadcrumbs report: 24 valid, 0 invalid                                |
| SEO-5                | Homepage review/rating markup reproduced **if verified legitimate** (item name "Bona Fide Nitro Coffee and Tea")                                                                | Review snippets: 1 valid. See D7 in §18                                |
| SEO-6                | Every `/…/amp/` URL (25 indexed alternates, 29 generated) **301s** to its canonical page. No 404s, no chains                                                                    | AMP report                                                             |
| SEO-7                | `http://` → `https://` and `www.` → apex in a **single 301 hop**                                                                                                                | HTTPS report + 301 clicks historically attributed to the HTTP homepage |
| SEO-8                | Image **filenames and paths under** **`/wp-content/uploads/`** **are preserved verbatim**                                                                                       | \~20 image URLs rank; external sites reference them                    |
| SEO-9                | Titles and H1s carried across unchanged at launch on all Tier-1 and Tier-2 URLs                                                                                                 | P2                                                                     |
| SEO-10               | The keg query vocabulary stays on `/products/`; the PET-keg / Alliance Brand / wholesale vocabulary stays on `/products-2/`                                                     | Forensic §11                                                           |
| SEO-11               | `/products/` keeps its global-navigation presence (currently linked from 56 of 57 pages)                                                                                        | Live crawl                                                             |
| SEO-12               | Real 404s return HTTP 404. The "404 to Start" homepage-redirect behaviour is **not** reproduced                                                                                 | Crawl inventory                                                        |
| SEO-13               | Consistent trailing-slash policy, enforced by 301                                                                                                                               | 6 slash-less duplicates currently answer 200                           |
| SEO-14               | New `robots.txt` declares the new sitemap and disallows nothing currently crawlable and ranking                                                                                 | Current robots.txt                                                     |
| SEO-15               | US-first. No geo-routing, no hreflang, no country splitting                                                                                                                     | 86% of clicks are US                                                   |
| SEO-16               | No page ships with a `<title>` identical to another page's — **except** `/products/` and `/products-2/`, which keep theirs unchanged at launch by deliberate exception under P2 | Baseline guardrails + forensic §11c                                    |

### 6.3 Accepted, planned losses

| Loss Magnitude Why accepted                           |                                                                                                  |                                                                                                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| AMP                                                   | 8,415 impressions and 32 clicks per quarter; 25 indexed alternate URLs; 15.6% of all impressions | AMP CTR is 0.4% versus 1.6% site-wide. A static site is already fast. Rebuilding AMP would be disproportionate. **Must not trigger rollback.** |
| WordPress-generated author/category archive behaviour | See §7 classification                                                                            | Reproduced as simple static listings where they hold equity                                                                                    |
| Live commenting                                       | 0 value; comments already disabled on both product pages                                         | —                                                                                                                                              |

---

## 7. FINAL URL MIGRATION METHODOLOGY (PART C)

### 7.1 Classification rules

Applied in order:

1. If the URL is in Tier 1 → **KEEP EXACT STATIC 200**.
2. If the URL holds measurable equity (clicks, ≥150 impressions, external links, or a position ≤15 on any query) **and** consolidating it is a judgement call rather than a certainty → **KEEP STATIC 200 FOR INITIAL MIGRATION / OPTIMISE LATER**. *(This is principle P3 and it deliberately overrides the preliminary redirect register in the SEO baseline.)*
3. If the URL is not indexed, has no external links, and has no query at a meaningful position → **301 AT INITIAL MIGRATION** to the nearest topically relevant page. Never to the homepage.
4. If the URL currently 301s → **LEGACY REDIRECT TO REPRODUCE**, preserving the existing destination.
5. If the URL is generated by WordPress/plugin machinery and should not exist on a static site → **TECHNICAL URL — DO NOT GENERATE**.
6. If the correct action cannot be determined from available evidence → **INVESTIGATE BEFORE FINAL MAPPING**.

### 7.2 KEEP EXACT STATIC 200 (17)

| URL 16-mo clicks 16-mo impr Ext links Note                           |       |        |                  |                                                     |
| -------------------------------------------------------------------- | ----- | ------ | ---------------- | --------------------------------------------------- |
| `/`                                                                  | 2,051 | 89,411 | 129 / 55 domains | Review snippet + breadcrumbs                        |
| `/products/`                                                         | 1,171 | 87,725 | 8 / 7            | Retail view of the products dataset                 |
| `/howtobuy/`                                                         | 336   | 34,416 | 13 / 6           | Second-most-linked page; −30% YoY                   |
| `/products-2/`                                                       | 178   | 23,928 | 0 reported       | Wholesale view. **Sitemap membership load-bearing** |
| `/kegerators/`                                                       | 105   | 22,542 | 0                | Owns the dispenser cluster                          |
| `/nitro-cold-brew/`                                                  | 87    | 45,027 | 2 / 1            | Third-largest impression pool                       |
| `/hot-nitro-coffee/`                                                 | 87    | 5,179  | 4 / 3            | Best non-branded position on the site (5.3)         |
| `/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/` | 71    | 15,115 | 1 / 1            | Sole bag-in-box asset                               |
| `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/`      | 43    | 19,336 | 1 / 1            | Health-cluster target                               |
| `/about/`                                                            | 31    | 18,781 | 2 / 2            |                                                     |
| `/contact-bona-fide-nitro-coffee-and-tea/`                           | 25    | 9,620  | 0                | Conversion endpoint                                 |
| `/coffee-on-tap-is-the-future/`                                      | 19    | 8,405  | 0                | Owns `coffee on tap`                                |
| `/nitro-coffee-kegs/`                                                | 10    | 1,179  | **5 / 2**        | Kept on link equity alone                           |
| `/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/`         | 9     | 24,017 | 3 / 3            | Position 2.5 on a 1,633-impression query            |
| `/blog/`                                                             | 0     | 2,626  | 0                | Index page                                          |
| `/nitro-coffee-questions/`                                           | 9     | 2,036  | 0                | Site-wide nav item                                  |
| `/hot-nitro-equipment-rental/`                                       | 24    | 2,737  | 0                | Sole owner of EU equipment-price queries            |

### 7.3 KEEP STATIC 200 FOR INITIAL MIGRATION / OPTIMISE LATER (18)

| URL Equity held Why not consolidated at launch                   |                                                                                                                          |                                                                                                                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/nitro-cold-brew-old/`                                          | 55 clicks / 27,204 impr; **primary ranker for** **`is nitro coffee bad for you`** **at 7.2**; +15 YoY                    | Identical title and H1 to `/nitro-cold-brew/`, but it is the page Google ranks. Consolidating on launch day risks losing a position-7 ranking. Phase 2 candidate. |
| `/nitro-coffee-health-benefits/`                                 | 4 clicks / 8,724 impr                                                                                                    | Splits `nitro cold brew benefits` 601/621 with the Tier-1 health page. Phase 2.                                                                                   |
| `/what-is-nitro-cold-brew-coffee/`                               | 8 clicks / 9,693 impr; **positions 1.0–3.2 for** **`nitro drip`****,** **`nitro meaning`****,** **`nitro`**; 2 ext links | Those position-1 rankings must be proven reproducible on a destination before any redirect. Phase 2.                                                              |
| `/nitro-cold-brew-coffee-made-easy-2/`                           | 28 clicks / 12,319 impr; **sole owner of the draft cluster** (\~2,300 impressions)                                       | Directly relevant to the "Draft Coffee and Tea" positioning. Phase 2 → a proper `/draft-systems/` hub.                                                            |
| `/a-touch-of-vanilla-to-your-nitro-coffee/`                      | 4 clicks / 3,746 impr; 2 ext links                                                                                       |                                                                                                                                                                   |
| `/coffee-trends-dominate-2018/`                                  | 10 clicks / 2,613 impr; **3 ext links**                                                                                  | Content dated; URL carries links                                                                                                                                  |
| `/how-ambient-stable-coffee-kegs-help-you-save-more-money/`      | 4 clicks / 815 impr; **3 ext links**                                                                                     |                                                                                                                                                                   |
| `/nitro-coffee-in-time-of-covid-19-pandemic-how-safe-is-it/`     | 1 click / 1,842 impr; 2 ext links                                                                                        |                                                                                                                                                                   |
| `/is-coffee-healthy/`                                            | 0 clicks / 334 impr                                                                                                      | Indexed; trivial to keep                                                                                                                                          |
| `/coffee-doesnt-produce-cancer-says-leading-american-scientist/` | 0 clicks / 1,256 impr                                                                                                    | Indexed                                                                                                                                                           |
| `/nitro-coffee-future/`                                          | 0 clicks / 170 impr                                                                                                      | Indexed                                                                                                                                                           |
| `/interested-in-selling-usa/`                                    | 9 clicks / 1,068 impr                                                                                                    | Three near-identical reseller pages; consolidate in Phase 2                                                                                                       |
| `/interested-in-selling-eu-and-usa/`                             | 8 clicks / 1,393 impr; 1 ext link                                                                                        |                                                                                                                                                                   |
| `/interested-in-selling-eu-qr-2/`                                | 1 click / 106 impr                                                                                                       |                                                                                                                                                                   |
| `/blog/page/2/`                                                  | 0 clicks / 178 impr                                                                                                      | Reproduce pagination                                                                                                                                              |
| `/category/news-nitro-coffee-and-nitro-tea/` + `/page/2/`        | 0 clicks / 548 + 50 impr                                                                                                 | Reproduce as a simple static category listing                                                                                                                     |
| `/author/admin/` + `/author/admin/page/2/`                       | **24 clicks** / 1,204 + 43 impr, position 8.3                                                                            | Real traffic from a WordPress author archive. Reproduce as a static "Articles by John Goerke" listing at the same URL. Revisit in Phase 2                         |
| `/privacy-policies/` and `/terms-of-service/`                    | noindex, no canonical today                                                                                              | Keep at 200, keep `noindex`, add self-canonicals                                                                                                                  |

### 7.4 301 AT INITIAL MIGRATION (11)

Low-risk only: not indexed, no external links, no meaningful position.

| Old URL Destination Rationale                                                                                                                                                                                        |                                                                 |                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/blog-old/`                                                                                                                                                                                                         | `/blog/`                                                        | Discovered-not-indexed; 199 impr                                                                                                                                     |
| `/on-tap-in-10-min/`                                                                                                                                                                                                 | `/coffee-on-tap-is-the-future/`                                 | Discovered-not-indexed; 21 impr                                                                                                                                      |
| `/stability-kegs-nitro-coffee/`                                                                                                                                                                                      | `/how-ambient-stable-coffee-kegs-help-you-save-more-money/`     | Discovered-not-indexed; 11 impr                                                                                                                                      |
| `/gastro-and-hotel-2023-paid-ticket/`                                                                                                                                                                                | `/contact-bona-fide-nitro-coffee-and-tea/`                      | Expired 2023 event; 26 impr                                                                                                                                          |
| `/thank-you-page-usa/`                                                                                                                                                                                               | `/interested-in-selling-usa/`                                   | Discovered-not-indexed; noindex today                                                                                                                                |
| `/category/our-facilities/`                                                                                                                                                                                          | `/about/`                                                       | Discovered-not-indexed, empty                                                                                                                                        |
| `/category/products/`                                                                                                                                                                                                | `/products/`                                                    | Discovered-not-indexed, empty                                                                                                                                        |
| `/category/tea/`                                                                                                                                                                                                     | `/products/` at launch                                          | Discovered-not-indexed. **Note: this slug is the naming precedent for a future** **`/nitro-tea/`****; do not reuse it in Phase 2 without re-pointing this redirect** |
| `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-health-benefits/`                                                                                                                                              | `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/` | Near-miss slug, 2 impr                                                                                                                                               |
| `/thank-you-your-ticket-is-paid/`                                                                                                                                                                                    | `/contact-bona-fide-nitro-coffee-and-tea/`                      | noindex today                                                                                                                                                        |
| 6 slash-less duplicates: `/hot-nitro-coffee`, `/nitro-cold-brew`, `/a-touch-of-vanilla-to-your-nitro-coffee`, `/coffee-trend-dominate-2018`, `/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health`, `/contact` | their trailing-slash equivalents                                | URL-form canonicalisation                                                                                                                                            |

**Booking URLs — conditional on D5 (§18):** `/book-appointment/`, `/my-bookings/`, `/cancel-appointment/`, `/cancel-payment/`, `/appointment-cancellation-confirmation/`, `/thank-you/`. If booking is retired → 301 all six to `/contact-bona-fide-nitro-coffee-and-tea/`. If booking survives → a single static `/book-appointment/` at 200 with an embedded scheduler, and the other five 301 to it.

### 7.5 LEGACY REDIRECT TO REPRODUCE (30+)

**Protocol and host canonicalisation — highest priority, single hop:**
`http://bonafidenitro.com/*` → `https://bonafidenitro.com/*` · `http://www.bonafidenitro.com/*` → apex HTTPS · `https://www.bonafidenitro.com/*` → apex HTTPS.

**AMP — all 29 generated / 25 indexed:** every `/<slug>/amp/` → `/<slug>/`. Plus `/amp/` → `/`, `/thank-you/amp/`, `/my-bookings/amp/`, `/appointment-cancellation-confirmation/amp/`, `/kegerators/amp/`, and the three `/amp/?bpa_page=bookingpress_download&…` parameter variants → `/`.

**Existing plugin redirects — reproduce all 11 verbatim in** **`.htaccess`****:**
`/services/peru-organic/` · `/services/ethiopia-yirgacheffe-organic/` · `/services/guatemala-organic/` · `/services/hair-raiser-organic/` · `/services/organic-hibiscus-tea/` · `/services/mango-tea/` · `/services/espresso-organic-nitro-coffee/` · `/services/passion-fruit-tea/` · `/services/green-citrus-nitro-tea/` · `/services/cascara-coffee-cherry-tea/` · `/collections-nitro-coffee/` — all to their current `nitrocoffee.store` destinations.

**Currently-redirecting same-origin URLs:** `/contact/` and `/contact` → `/contact-bona-fide-nitro-coffee-and-tea/`.

**Parameter/legacy URLs currently redirecting:** `/?p=1187`, `/?p=1202`, `/?p=1211` → their current destinations.

**Malformed URLs — the only place a homepage redirect is defensible:** `/To`, `/where-to-refill-your-` (and its `http://` twin). See §7.7.

### 7.6 TECHNICAL URL — DO NOT GENERATE

`/wp-admin/*` · `/wp-login.php*` · `/wp-json/*` · `/xmlrpc.php` · `/?s={search_term_string}` and all search URLs · `/comments/feed/` and all feeds · `/?bpa_page=bookingpress_download&action=generate_ics&state=…&appointment_id=` (×3) and the `/amp/` variants (×3) · `/resource/video_files/*.mp4?t={seek_to_start_number}` · `/wp-sitemap.xml` and its four children *(superseded — see §7.7)* · `/wp-content/uploads/wpo/wpo-plugins-tables-list.json` · any `?p=` post-ID URL not already listed · `/wp-json/tcb/v1/video-reporting` (currently 404 — leave as a genuine 404).

**Retained despite being under** **`/wp-content/`****:** the entire `uploads/` media tree, copied into the static build at the identical path. This is a preservation requirement (SEO-8), not an accident.

### 7.7 INVESTIGATE BEFORE FINAL MAPPING (7 items)

| # Item What to do Blocking?  |                                                                                                                                                                                                                                                                                                                                                                                                                                               |                                                                                                                                                                                                                                                                                          |                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| I1                           | **15 cross-origin redirects whose destination is unknown**: `/To`, `/roots/`, `/where-to-refill-your-`, `/blog-new/`, `/collections/`, `/sustainability/`, `/copyright-notice/`, `/kegging-service/`, `/best-coffee-creamers/`, `/best-nitro-cold-brew-coffee-maker/`, `/author/raul/`, `/cold-brew-coffee-tap-future-serve/`, `/contact-email/`, `/collections-nitro-coffee/`, plus the `http://` and `www.` variants of `/kegging-service/` | `curl -I` each from a shell and record the real `Location`. **Several may be going to the homepage via the "404 to Start" plugin** — if so, they are not real redirects and each needs a deliberate destination                                                                          | **YES — blocks the redirect register**                 |
| I2                           | `/wp-content/uploads/2026/02/Bona-Fide-Marketing-Plan-2026.pdf` — indexed, 602 impressions                                                                                                                                                                                                                                                                                                                                                    | Business decision: should an internal-sounding marketing plan be publicly indexed? If yes, preserve the path. If no, remove it *and* request removal in GSC                                                                                                                              | **YES**                                                |
| I3                           | `/wp-content/uploads/2021/09/17x11-Bona-FIde-coffee-for-Offices-version-10-Email_compressed.pdf` — 569 impressions, 0 clicks                                                                                                                                                                                                                                                                                                                  | Keep at same path, or 301 to `/howtobuy/`                                                                                                                                                                                                                                                | No                                                     |
| I4                           | The 6 `/services/*` product URLs currently 301'd off-site                                                                                                                                                                                                                                                                                                                                                                                     | Confirm the Shopify destinations are still live, and decide whether Phase 2 wants to reclaim `/services/*` as on-site product-detail URLs                                                                                                                                                | No                                                     |
| I5                           | BookingPress — is appointment booking still used?                                                                                                                                                                                                                                                                                                                                                                                             | Determines §7.4 booking block and §11                                                                                                                                                                                                                                                    | **YES**                                                |
| I6                           | `/author/admin/` — keep the WordPress-style author URL, or plan a Phase-2 move?                                                                                                                                                                                                                                                                                                                                                               | Keep at launch (24 clicks). Decide the Phase-2 target then                                                                                                                                                                                                                               | No                                                     |
| I7                           | The homepage review/rating markup                                                                                                                                                                                                                                                                                                                                                                                                             | Inspect what actually generates it. **Do not blindly reproduce self-serving review markup** — Google has tightened on this. If it is a legitimate aggregate of third-party reviews, reproduce it; if it is the site rating itself, drop it and note the expected loss of one rich result | No — but resolve before the schema module is finalised |

### 7.8 Sitemap transition

| Item Action                                                                                   |                                                                                                                                                      |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/wp-sitemap.xml` + 4 children                                                                | Cease to exist. 301 `/wp-sitemap.xml` → `/sitemap.xml`                                                                                               |
| `/sitemap.xml`                                                                                | **Keep this exact URL.** It is the sitemap Google associates with both product pages. The static build generates it                                  |
| `https://bonafidenitro.com/sitemap_index.xml` (submitted 2018, "Sitemap is HTML" error since) | Leave alone at launch. Remove the submission from GSC in the first post-launch week                                                                  |
| `http://bonafidenitro.com/sitemap.xml` (duplicate protocol submission)                        | Leave alone at launch. Remove the submission post-launch                                                                                             |
| Sitemap contents                                                                              | \~48–50 canonical, indexable, 200-returning URLs. **Must include** **`/products-2/`****.** Must exclude noindex, utility, booking and technical URLs |

---

## 8. PROPOSED INFORMATION ARCHITECTURE (PART D)

### 8.1 Launch IA — reproduce, do not redesign

**The launch navigation is identical to today's.** Current global nav destinations: `/`, `/nitro-cold-brew/`, `/howtobuy/`, `/products/`, `/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/`, `/kegerators/`, `/about/`, `/contact-bona-fide-nitro-coffee-and-tea/`, `/nitro-coffee-questions/`, `/blog/`, plus external `nitrocoffee.store`. `/products-2/` stays out of the navigation.

Internal linking at launch is a faithful reproduction of the current graph: ten URLs receive site-wide navigation links; the blog sidebar set receives 12–15 each; `/products-2/` receives zero.

### 8.2 Target IA — Phase 2 onward, evidence-backed only

Existing-equity pages are marked **[E]**; genuinely new pages **[N]**. No page below is invented — every **[N]** is justified by Search Console impressions with no adequate landing page today.

#### Commercial spine

| URL E/N Audience Purpose Primary intent Query cluster Conversion goal Nav Internal links SEO preservation  |         |                    |                                                    |                          |                                                                                                                                                                                                                   |                          |                                                         |                                                                       |                                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | ------- | ------------------ | -------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `/`                                                                                                        | **[E]** | Both               | Brand entity + routing                             | Branded / navigational   | `bona fide`, `bonafide coffee`, `bona fide nitro coffee`, `nitro coffee`, `nitro tea`                                                                                                                             | Route to retail or trade | Root                                                    | Hub to everything                                                     | 2,051 clicks · 129 ext links · review snippet · breadcrumbs. **Never change**                                  |
| `/products/`                                                                                               | **[E]** | B2C + small trade  | Retail keg catalogue                               | Transactional            | `cold brew keg`, `cold brew kegs`, `nitro cold brew keg`, `coffee keg`, `nitro coffee keg`, `keg of coffee`, `kegged coffee` (\~25 queries)                                                                       | Store / Amazon purchase  | Primary                                                 | ↔ `/kegerators/`, ↔ `/howtobuy/`, ↔ `/nitro-cold-brew/`, → bag-in-box | 1,171 clicks. Title must keep "Cold Brew", "Nitro Coffee", "Kegs". Amazon + store links preserved              |
| `/products-2/`                                                                                             | **[E]** | B2B / distributors | Wholesale catalogue + price list + Alliance Brands | Commercial B2B           | `pet coffee keg` (pos 4.3), `5 gallon coffee keg`, `plastic coffee keg`, Caveman cluster, `nitro coffee can manufacturer`, `nitro coffee can supplier`, `nitro cold brew for businesses`                          | Trade enquiry            | **None at launch**; Phase 2 candidate from `/howtobuy/` | **Zero at launch**                                                    | 178 clicks. Sitemap membership load-bearing. Price list, 6 Alliance SKUs and 6 unique images must survive      |
| `/howtobuy/`                                                                                               | **[E]** | B2B                | Distributor / wholesale entry                      | Commercial B2B           | `coffee distributors`, `coffee distributors near me`, `wholesale nitro cold brew`, `nitro coffee can supplier`, `nitro cold brew for office`                                                                      | Trade enquiry            | Primary                                                 | ↔ `/products/`, → `/products-2/` *(Phase 2 only)*                     | 336 clicks · **13 ext links** · **−30% YoY, priority rebuild target**                                          |
| `/kegerators/`                                                                                             | **[E]** | Both               | Dispensing equipment                               | Commercial               | `nitro coffee dispenser` (1,531), `countertop nitro coffee dispenser` (829), `nitro coffee machine` (1,548), `cold brew dispenser`, `nitro coffee kegerator`, `commercial nitro cold brew machine` (\~5,300 impr) | Equipment enquiry        | Primary                                                 | ↔ `/products/`, ↔ draft systems                                       | 105 clicks. **URL stays.** Phase 2: title/H1 change only — the page is named for a term almost nobody searches |
| `/hot-nitro-coffee/`                                                                                       | **[E]** | Both               | Hot nitro product                                  | Product                  | `hot nitro coffee` (pos 4.7), `nitro hot coffee`                                                                                                                                                                  | Product enquiry          | Secondary                                               | ← `/products/`                                                        | 87 clicks at position 5.3 — best non-branded position on the site                                              |
| `/hot-nitro-equipment-rental/`                                                                             | **[E]** | B2B EU             | EU equipment rental                                | Commercial, geo-specific | `europe nitro coffee dispenser two tap price eur` + EU price variants                                                                                                                                             | Trade enquiry            | Secondary                                               | ← `/kegerators/`                                                      | Sole owner of EU equipment-price queries. Conditional on D6                                                    |
| `/nitro-coffee-kegs/`                                                                                      | **[E]** | Both               | Keg formats                                        | Informational/commercial | `pet coffee keg`, `nitro coffee kegs`                                                                                                                                                                             | Route to `/products/`    | Secondary                                               | → `/products/`                                                        | **5 ext links from 2 domains** — kept on link equity                                                           |

#### Product / category expansion — Phase 2

| URL E/N Audience Purpose Intent Query cluster Evidence  |         |      |                            |                          |                                                                                                                                                                                                                                  |                                                                                                                                                                                                       |
| ------------------------------------------------------- | ------- | ---- | -------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/nitro-tea/`                                           | **[N]** | Both | Dedicated tea category     | Product/category         | `nitro tea` (1,483), `tea on tap` (231), `draft tea`, `nitro infused tea`, `nitrogen infused tea`, `nitro iced tea`, `tea keg`, `what is nitro tea`, `nitro cold brew tea` — **\~1,850 impressions**                             | **Zero tea landing pages exist today** despite "Tea" being in the company name. The single biggest evidence-backed gap in the property                                                                |
| `/bag-in-box/`                                          | **[N]** | Both | Commercial BIB category    | Commercial               | `bag in box coffee` (564), `bag in box coffee concentrate` (314), `bag in box cold brew coffee` (313), `bag in box liquid coffee concentrate` (213), `cold brew coffee bag in box` (181), `bib coffee` — **\~1,900 impressions** | Currently owned by a single blog post. The blog post stays; this becomes the commercial page                                                                                                          |
| `/draft-systems/`                                       | **[N]** | B2B  | Draft/on-tap systems hub   | Commercial/informational | `cold brew on draft` (600), `nitro draft coffee` (436), `coffee draft system` (361), `draft nitro coffee` (329), `cold brew draft` (314), `coffee on draft`, `nitro coffee setup` — **\~2,300 impressions**                      | Currently owned by `/nitro-cold-brew-coffee-made-easy-2/`, which earns **zero clicks**. Directly relevant to the "Draft Coffee and Tea" positioning. Absorbs that URL via 301 after the 90-day window |
| `/office-coffee/`                                       | **[N]** | B2B  | Workplace coffee programme | Commercial B2B           | `cold brew keg for office` (484), `cold brew kegs for office` (64), `nitro cold brew for office` (77), `office coffee` — **\~630 impressions**                                                                                   | Currently served incidentally by `/howtobuy/`                                                                                                                                                         |

**Deliberately not proposed:** per-flavour product-detail pages, city/location pages, and any keyword-matched landing-page farm. The `/services/*` slugs are a historical precedent for product-detail URLs (I4) but the evidence does not currently justify rebuilding them — they earn 2–8 impressions each and are 301'd off-site to Shopify.

#### Content / education

| URL E/N Role                                                         |         |                                                                                                                                                                                |
| -------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/nitro-cold-brew/`                                                  | **[E]** | The nitro explainer hub. 45,027 impressions — third-largest pool on the site. Eventual consolidation target for `/nitro-cold-brew-old/` and `/what-is-nitro-cold-brew-coffee/` |
| `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/`      | **[E]** | Health-cluster target. Eventual consolidation target for `/nitro-coffee-health-benefits/`, `/is-coffee-healthy/`, `/coffee-doesnt-produce-cancer-…/`                           |
| `/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/` | **[E]** | The BIB informational article. Stays; feeds the new `/bag-in-box/` commercial page                                                                                             |
| `/coffee-on-tap-is-the-future/`                                      | **[E]** | Owns `coffee on tap` (4,597 impressions at 6.7)                                                                                                                                |
| `/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/`         | **[E]** | 24,017 impressions; position 2.5 on `is 3 cups of coffee too much`                                                                                                             |
| `/nitro-coffee-questions/`                                           | **[E]** | FAQ. Site-wide nav item                                                                                                                                                        |
| `/blog/` + posts                                                     | **[E]** | 15 posts reproduced at identical URLs                                                                                                                                          |

#### Company / legal

`/about/` **[E]** · `/contact-bona-fide-nitro-coffee-and-tea/` **[E]** · `/privacy-policies/` **[E]**, noindex · `/terms-of-service/` **[E]**, noindex · the three `/interested-in-selling-*/` reseller pages **[E]**, consolidating to one in Phase 2.

### 8.3 The coffee / tea and B2C / B2B split

**INTERPRETATION.** The evidence supports two orthogonal axes, and the target IA should express both without creating a combinatorial page explosion:

- **Audience axis:** retail (`/products/`, `/bag-in-box/`) versus trade (`/products-2/`, `/howtobuy/`, `/office-coffee/`, `/draft-systems/`).
- **Product axis:** coffee (well covered) versus tea (**zero coverage, \~1,850 impressions**).

Four new pages total. That is the whole expansion. Everything else is a title, content or internal-linking improvement on a URL that already exists.

---

## 9. CONTENT PRESERVATION STRATEGY (PART E)

**Method.** Content is transcribed from the *rendered* page, not exported from Thrive post meta. Thrive/Sydney markup, inline CSS and builder wrappers are discarded (P4). What crosses the boundary is: title, meta description where it exists, H1, heading hierarchy and text, body copy, product data, link targets, image paths and alt text, CTA text and destinations, structured data, canonical, and indexability.

### 9.1 Preservation map — Tier 1

| URL MUST PRESERVE CAN REWRITE CAN EXPAND CAN REMOVE                  |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |                                                                                 |                                                                                |                                                                               |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `/`                                                                  | Title `Nitro Coffee Experts & Leaders - Bona Fide Nitro Coffee & Nitro Tea` · H1 `BONA FIDE - EXPERTS IN NITRO COFFEE AND NITRO TEA` · brand entity vocabulary ("Bona Fide", "Bona Fide Brewing Company") · breadcrumb + review markup (subject to I7) · self-canonical · all outbound nav                                                                                                                                                                                                                                                                                              | Layout, hero imagery, section order                                             | Tea presence, trade routing                                                    | Thrive/Smart Slider markup, inline CSS                                        |
| `/products/`                                                         | Title `Cold Brew Nitro Coffee Kegs - Bona Fide Nitro Coffee and Tea` · H1 `Best Nitro Cold Brew Coffee Kegs On The Market` · meta description (212 ch) · **all 13 Amazon links** · **all 16 nitrocoffee.store links** · Nitro/Still style distinction · both Bag-in-Box sections · equipment CTA · 180-day claim · all 6 core SKUs + 3 teas + 3 specialty flavours with nutrition lines, tasting notes and the $149.00 prices · **all 35 image paths** · breadcrumbs · self-canonical · nav presence                                                                                    | Section ordering, visual design, CTA button styling                             | `Product` schema, richer filtering, clearer retail/trade split                 | Thrive markup, `tve_custom_css`, style toggles implemented as builder widgets |
| `/products-2/`                                                       | Title and meta description **unchanged at launch** · H1 `Best Nitro Cold Brew Coffee Kegs on the Market` · **the full Alliance Brand section (6 partner SKUs, names, descriptions, prices)** · **the wholesale price list ($195/$135/$125/$120 across 19 blocks)** · "Direct Distribution Program" and "direct-store-delivery (DSD)" copy · PET Keg / 5 Gal format vocabulary · 120-day claim · **the 6 unique alliance-brand image filenames** · `Organic Vanilla Nitro Coffee` in the main range · breadcrumbs · self-canonical · **sitemap membership** · **zero internal links in** | Nothing at launch                                                               | Nothing at launch                                                              | Thrive markup only                                                            |
| `/howtobuy/`                                                         | Title `Nitro Office Coffee Distributor - Bona Fide Nitro Coffee and Tea` · H1 `Nitro Coffee Distributors and Wholesale Coffee Keg Suppliers` · distributor/wholesale/supplier vocabulary · all outbound links · nav presence                                                                                                                                                                                                                                                                                                                                                            | Body copy — **this page is declining 30% YoY and is a priority rebuild target** | B2B content depth, supplier/co-pack coverage, office programme                 | Thrive markup                                                                 |
| `/kegerators/`                                                       | URL · title `Kegerators - Bona Fide Nitro Coffee` · H1 `Equipment to Serve Nitro Cold Brew Coffee` · dispenser/machine/countertop vocabulary · images                                                                                                                                                                                                                                                                                                                                                                                                                                   | Title/H1 **in Phase 2 only**                                                    | Equipment specs, comparison                                                    | Thrive markup                                                                 |
| `/nitro-cold-brew/`                                                  | URL · title `Nitro Cold Brew - Bona Fide Brewing Company - Nitro Coffee Experts` · H1 `ALL ABOUT NITRO COLD BREW COFFEE` · nitro explainer vocabulary (`nitro coffee`, `nitro coffee machine`, `nitro coffee psi`)                                                                                                                                                                                                                                                                                                                                                                      | Body copy                                                                       | Becomes the consolidated nitro hub in Phase 2                                  | Thrive markup                                                                 |
| `/hot-nitro-coffee/`                                                 | URL · title `Hot Nitro Coffee - Bona Fide Nitro Coffee` · H1 `Hot Nitro Coffee` (exact)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Body copy                                                                       |                                                                                | Thrive markup                                                                 |
| `/cold-brew-…-bag-in-box-…-kegs/`                                    | URL · title `Cold Brew Bag In Box Coffee - Bona Fide Nitro Coffee` · H1 `Cold Brew Bag In Box Coffee` · full BIB vocabulary                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Body copy                                                                       |                                                                                | Thrive markup                                                                 |
| `/healthy-benefits-…-healthy/`                                       | URL · title · H1 `HEALTHY BENEFITS OF DRINKING NITRO COFFEE, IS NITRO COFFEE HEALTHY?` · the "is nitro cold brew bad for you / healthy / benefits" vocabulary                                                                                                                                                                                                                                                                                                                                                                                                                           | Body copy                                                                       | Becomes the consolidated health hub                                            | Thrive markup                                                                 |
| `/about/`                                                            | URL · title `Nitro Coffee Best Quality - Bona Fide Nitro Coffee Experts` · H1 `Bona Fide Nitro Coffee and Tea` · brand entity content                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Body copy                                                                       | Entity signals for `bona fide` (18,994 impressions at position 13 with 0% CTR) | Thrive markup                                                                 |
| `/contact-…-and-tea/`                                                | URL · title `Contact - Bona Fide Nitro Coffee And Tea` · H1 `Contact` · working form                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Form implementation                                                             | Trade vs retail routing                                                        | CF7 markup                                                                    |
| `/coffee-on-tap-is-the-future/`                                      | URL · title `COFFEE "ON TAP" IS THE FUTURE - Bona Fide Nitro Coffee` · H1 identical · "coffee on tap" vocabulary                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Body copy                                                                       |                                                                                | Thrive markup                                                                 |
| `/nitro-coffee-kegs/`                                                | **URL above all** (5 external links) · title `Nitro Coffee Kegs - Bona Fide Nitro Coffee & Tea Experts` · H1 `Nitro Coffee Kegs` · PET keg vocabulary                                                                                                                                                                                                                                                                                                                                                                                                                                   | Body copy                                                                       |                                                                                | Thrive markup                                                                 |
| `/3-cups-of-coffee-a-day-…/`                                         | URL · title and H1 `3 Cups of Coffee a Day: Why It Can Be Good for the Health` · the "3 cups / is 3 cups too much" vocabulary (position 2.5)                                                                                                                                                                                                                                                                                                                                                                                                                                            | Body copy                                                                       | Refresh and cite sources                                                       | Thrive markup                                                                 |
| `/blog/`, `/nitro-coffee-questions/`, `/hot-nitro-equipment-rental/` | URLs · titles · H1s (note `/nitro-coffee-questions/` currently has **no H1** — adding one is an improvement, not a regression) · EU price vocabulary on the rental page                                                                                                                                                                                                                                                                                                                                                                                                                 | Body copy                                                                       | FAQ schema on the questions page                                               | Thrive markup                                                                 |

### 9.2 Preservation map — Tier 2 (summary rule)

For all 18 Tier-2 URLs: **MUST PRESERVE** the URL, `<title>`, H1, the specific query vocabulary listed in §7.3, all external-link-bearing paths, images and self-canonical. **CAN REWRITE** body copy. **CAN EXPAND** freely. **CAN REMOVE** all Thrive/Sydney markup. No Tier-2 page may have its title or H1 changed at launch.

### 9.3 Media preservation

| Asset class Rule            |                                                                                                                                                                                                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/wp-content/uploads/**`    | **Copied into the static build at the identical path.** Non-negotiable — \~20 image URLs rank, and external sites reference these paths                                                                                                                                                   |
| Ranking images specifically | `Nitro-Coffee-Explain-Graphic-Bona-Fide-Keg-Tap.jpg`, `Bona-Fide-Cold-Dispenser-countertop-small-min-1.png`, `All-about-nitro-cold-brew-coffee.jpg`, `Hair-Raiser-Nitro-Coffee-for-website.png`, `Kegerator-counter-top-Bona-Fide.jpg`, and the 2023 `Nitro-Coffee-Explain-Graphic-*` set |
| The 6 Alliance Brand images | Unique to `/products-2/`. Must survive with identical filenames                                                                                                                                                                                                                           |
| The 2 indexed PDFs          | Subject to I2/I3                                                                                                                                                                                                                                                                          |
| New/optimised derivatives   | May be generated (WebP/AVIF) **in addition to**, never instead of, the originals at their original paths                                                                                                                                                                                  |
| Alt text                    | Currently poor — 10 of 25 images on `/products-2/` have empty `alt`, several use filenames as alt. **Improving alt text is safe and encouraged**; it is not a preserved element                                                                                                           |

---

## 10. GITHUB / STATIC TECHNICAL ARCHITECTURE (PART F)

### 10.1 Stack recommendation

**Recommended: Astro (static output).**

| Requirement Why Astro fits        |                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single product dataset, two views | Content Collections with Zod schema validation — the dataset is type-checked at build time, so a malformed product fails the build rather than the page |
| 50 pages, mostly static content   | Zero JavaScript shipped by default                                                                                                                      |
| 15 blog posts                     | First-class Markdown/MDX                                                                                                                                |
| Per-page metadata + JSON-LD       | Component-based `<SEO>` and `<Schema>` props                                                                                                            |
| Sitemap                           | Official `@astrojs/sitemap` integration, filterable                                                                                                     |
| Image pipeline                    | Built-in `astro:assets` with original-path passthrough via `public/`                                                                                    |
| Output                            | Plain static HTML — rsyncs to cPanel with no runtime                                                                                                    |

**Conservative alternative: Eleventy (11ty).** Simpler, pure static, no framework runtime, smaller learning curve. Choose Eleventy if the team wants the lowest possible complexity and is willing to hand-roll the product-view logic. **Decision D2 in §18.** Hugo is a third option if build speed ever matters — it will not at 50 pages.

**Editing workflow (satisfies P7):** add a Git-backed CMS — **Sveltia CMS** or **Decap CMS** — as a static admin route behind GitHub auth. Content editors change Markdown/YAML through a UI; the change becomes a Git commit; CI rebuilds and deploys. No WordPress, no server, no database.

### 10.2 Repository structure

```
bonafide-static/
├─ .github/workflows/
│  ├─ preview.yml              PR → build → deploy preview → run QA suite
│  ├─ production.yml           main → build → QA gate → deploy to cPanel
│  └─ scheduled-qa.yml         daily crawl of production against the manifest
├─ src/
│  ├─ pages/
│  │  ├─ index.astro
│  │  ├─ products/index.astro          → /products/   (RETAIL view)
│  │  ├─ products-2/index.astro        → /products-2/ (WHOLESALE view)
│  │  ├─ [...slug].astro               → content-driven static pages
│  │  ├─ blog/index.astro, blog/[page].astro
│  │  ├─ author/admin/index.astro      → preserved author archive
│  │  ├─ category/[slug].astro         → preserved category archive
│  │  ├─ 404.astro                     → REAL 404 status
│  │  ├─ sitemap.xml.ts                → /sitemap.xml (the preserved URL)
│  │  └─ robots.txt.ts
│  ├─ layouts/      Base · Page · Article · ProductIndex · Legal
│  ├─ components/
│  │  ├─ seo/       Meta · Canonical · OpenGraph · TwitterCard
│  │  ├─ schema/    Organization · WebSite · WebPage · BreadcrumbList · Article · Product · Review
│  │  ├─ product/   ProductCard · RetailCTA · WholesalePrice · AllianceBadge · NutritionLine
│  │  └─ ui/        Nav · Footer · Breadcrumbs · ContactForm · CTA
│  ├─ content/
│  │  ├─ pages/     one MD/MDX file per static page, frontmatter-driven
│  │  ├─ posts/     the 15 blog posts
│  │  └─ config.ts  Zod schemas — build fails on schema violation
│  ├─ data/
│  │  ├─ products.yaml          ← SINGLE SOURCE OF TRUTH for all SKUs
│  │  ├─ navigation.yaml        ← global nav; /products-2/ absent by design
│  │  ├─ redirects.yaml         ← generates .htaccess
│  │  ├─ site.yaml              ← org info, NAP, social, analytics IDs
│  │  └─ seo-baseline.json      ← PROTECTED URL MANIFEST (see §13)
│  ├─ lib/         canonical.ts · schema.ts · sitemap.ts · htaccess.ts
│  └─ styles/
├─ public/
│  ├─ wp-content/uploads/…      ← media preserved at original paths
│  └─ favicon, og images
├─ scripts/
│  ├─ build-htaccess.mjs        redirects.yaml → .htaccess
│  ├─ crawl.mjs                 crawl any environment, emit JSON report
│  └─ compare-baseline.mjs      report vs seo-baseline.json
├─ tests/
│  ├─ url-matrix.spec.ts
│  ├─ redirects.spec.ts
│  ├─ seo-elements.spec.ts
│  └─ schema.spec.ts
└─ docs/
   ├─ CUTOVER-RUNBOOK.md
   ├─ ROLLBACK-RUNBOOK.md
   └─ the three SEO evidence documents

```

### 10.3 The products data model — the centrepiece

This is the single architectural change that fixes the root cause of the `/products/` ↔ `/products-2/` divergence **without touching either URL**.

```yaml
# src/data/products.yaml  (illustrative shape, not code to run)
- id: hair-raiser-organic
  name: "Hair Raiser® Organic"
  category: coffee              # coffee | tea
  line: core                    # core | specialty | alliance
  brand: "Bona Fide"
  format: "5 Gal PET Keg"
  nutrition: "Cal: 2, Protein: 0.3g, Fat: 0g, Sugar: 0, Caffeine: 100mg"
  description: "A dark coffee blend lover? …"
  styles: [nitro, still]        # rendered on retail view only
  pricing:
    retail: null                # not shown on /products/
    wholesale: 195.00           # shown on /products-2/
  links:
    store: "https://www.nitrocoffee.store/products/hair-raiser®-organic-nitro-coffee"
    amazon: "https://www.amazon.com/…"
  image: "/wp-content/uploads/2017/10/Hair-Raiser-Nitro-Coffee-for-website.png"
  alt: "Hair Raiser Nitro Coffee by Bona Fide"
  views: [retail, wholesale]    # ← WHICH PAGE RENDERS IT

- id: caveman-coffee-nitro
  name: "Caveman Coffee Company Nitro"
  category: coffee
  line: alliance
  brand: "Caveman Coffee Company"
  pricing: { retail: null, wholesale: 125.00 }
  image: "/wp-content/uploads/…/Caveman-Coffee-Comapany-Nitro-by-Bona-Fide.png"
  views: [wholesale]            # ← /products-2/ ONLY — preserves the exclusivity

```

**View rules, encoded not assumed:**

| `/products/` — RETAIL view `/products-2/` — WHOLESALE view  |                                           |                                                      |
| ----------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| Renders products where                                      | `views` includes `retail`                 | `views` includes `wholesale`                         |
| Alliance line                                               | excluded                                  | **included — all 6 SKUs**                            |
| Pricing shown                                               | `pricing.retail` only (3 SKUs at $149.00) | `pricing.wholesale` (19 blocks, $195/$135/$125/$120) |
| Amazon CTA                                                  | **yes, all 13**                           | no                                                   |
| Store CTA                                                   | yes                                       | yes                                                  |
| Style toggles                                               | yes                                       | no                                                   |
| Bag-in-Box sections                                         | yes                                       | no                                                   |
| Equipment cross-sell                                        | yes                                       | no                                                   |
| Shelf-life claim                                            | 180 days                                  | 120 days                                             |
| Distribution copy                                           | web store / Amazon                        | Direct Distribution Program / DSD                    |

**A build-time guard is mandatory:** a test asserting that the rendered `/products/` and `/products-2/` are **not** identical, that `/products-2/` contains the 6 alliance SKU names and ≥19 price strings, and that `/products/` contains ≥13 `amazon.com` links. Without this, a future refactor could silently collapse the two pages — the exact failure mode this whole project exists to avoid.

### 10.4 Supporting subsystems

| Subsystem Design      |                                                                                                                                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Routing**           | `trailingSlash: 'always'`, `build.format: 'directory'` — every page emits `/<path>/index.html`, matching today's URLs exactly                                                                                                                  |
| **Canonical**         | Derived automatically from the route; overridable per page in frontmatter. Self-canonical is the default and is asserted in CI                                                                                                                 |
| **Metadata**          | Frontmatter-driven `<SEO>` component. Title and description are **required fields** on Tier-1/Tier-2 pages; the build fails if a protected page loses its title                                                                                |
| **JSON-LD**           | Composable helpers. `Organization` and `WebSite` site-wide; `WebPage` + `BreadcrumbList` on every page; `Article` + `Person` on posts; `Product` available but **not enabled at launch**; `Review` only if I7 resolves in favour               |
| **BreadcrumbList**    | Generated from the route hierarchy and the navigation data, not hand-authored. CI asserts it exists on all 24 currently-valid URLs                                                                                                             |
| **Sitemap**           | Generated at `/sitemap.xml` (the preserved URL). Includes only canonical, indexable, 200 pages. **CI asserts** **`/products-2/`** **is present**                                                                                               |
| **robots.txt**        | Generated. Declares `/sitemap.xml`. Disallows nothing currently crawlable                                                                                                                                                                      |
| **Redirects**         | `redirects.yaml` → `.htaccess` via `scripts/build-htaccess.mjs`. Hand-editing `.htaccess` on the server is forbidden; it is a build artefact                                                                                                   |
| **404**               | A real 404 page returning HTTP 404. The "404 to Start" homepage-redirect behaviour is explicitly not reproduced                                                                                                                                |
| **Images**            | Originals passthrough at `/wp-content/uploads/…`. Modern derivatives generated alongside and served via `<picture>`, with the original as fallback                                                                                             |
| **CSS/JS**            | Scoped component CSS, no framework runtime. Target: zero blocking JS beyond the tag manager                                                                                                                                                    |
| **Preview**           | Cloudflare Pages or Netlify PR previews on a `*.pages.dev` / `*.netlify.app` subdomain. **Must** ship `X-Robots-Tag: noindex` and HTTP basic auth. No production DNS involvement                                                               |
| **Production deploy** | GitHub Actions → build → QA gate → rsync over SSH (or FTPS) to a timestamped directory → symlink flip. Deploy credentials are **new**, created after the security remediation, stored as GitHub Secrets, never reused from the compromised era |

---

## 11. INTEGRATION MIGRATION (PART G)

**Rule: reimplement from source configuration. Never copy JavaScript out of the current page HTML** — that HTML is compromised.

| Integration Still required? Migration approach Source of truth for config            |                              |                                                                                                                                                                                                                                                                              |                                                                                                             |
| ------------------------------------------------------------------------------------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Google Tag Manager**                                                               | **Yes — keep**               | Single GTM container snippet in the base layout. Consolidate other tags *inside* GTM rather than hard-coding them                                                                                                                                                            | The GTM container ID from the **Head & Footer Code** plugin (block 1, 625 chars) and the GTM account itself |
| **Facebook / Meta Pixel**                                                            | **Decide — D3**              | If Meta advertising is still running, move it into GTM as a tag. If not, drop it                                                                                                                                                                                             | Meta Events Manager — take the Pixel ID from the account, not the page                                      |
| **Klaviyo**                                                                          | **Likely yes**               | `klaviyo.js` with the public API key, loaded via GTM or directly. Klaviyo forms can replace the newsletter capture                                                                                                                                                           | The Klaviyo account's public API key                                                                        |
| **Google reCAPTCHA**                                                                 | **Conditional**              | Only if the chosen form provider needs it. Prefer the provider's own spam filtering plus a honeypot; reCAPTCHA adds a render-blocking third-party script for a low-traffic site                                                                                              | Google reCAPTCHA admin console — new keys                                                                   |
| **Contact Form 7**                                                                   | **Replaced**                 | A static-compatible form endpoint. **Recommended: a hosted form service** (Formspree, Basin, Web3Forms) — no server code, no PHP, nothing to compromise. **Alternative:** a single hardened PHP mail handler on the same cPanel account, acceptable only *after* remediation | Reproduce the existing field sets from the live forms                                                       |
| **BookingPress**                                                                     | **Decide — D5 / I5**         | If booking is retired: 301 the six URLs per §7.4 and eliminate the `?bpa_page=` parameter URLs permanently. If booking is required: embed a hosted scheduler (Cal.com, Calendly, SavvyCal) on a single `/book-appointment/` page                                             | Business decision                                                                                           |
| **Smart Slider 3, SiteOrigin, Content Views, Notibar, Easy TOC, Faq Responsive**     | **No**                       | Replaced by native components. Their output is reproduced as plain HTML                                                                                                                                                                                                      | —                                                                                                           |
| **Yoast SEO**                                                                        | **No**                       | Replaced by the repo's metadata/canonical/schema/sitemap subsystems                                                                                                                                                                                                          | —                                                                                                           |
| **AMP plugin**                                                                       | **No**                       | Retired. All `/amp/` URLs 301                                                                                                                                                                                                                                                |                                                                                                             |
| **Simple 301 Redirects**                                                             | **No**                       | Replaced by `redirects.yaml` → `.htaccess`                                                                                                                                                                                                                                   |                                                                                                             |
| **WP-Optimize / caching**                                                            | **No**                       | Static files need no cache plugin. Configure `Cache-Control` headers in `.htaccess` instead                                                                                                                                                                                  |                                                                                                             |
| **`cdn.quickdelivr.com/mpackage.js`** **(×2),** **`cdn.coredelivr.com/mpackage.js`** | **NO — EXPLICITLY EXCLUDED** | **Never reproduced under any circumstance.** A CI test must assert these strings appear nowhere in the build output                                                                                                                                                          | —                                                                                                           |

**Consent/analytics note:** GTM, Meta Pixel and Klaviyo all set cookies. The site has a `WP GDPR Fix Pro` plugin today. Whether a consent banner is required for the US-dominant audience is **D4**; if it is, it belongs in GTM's consent mode, configured once, not as another plugin.

---

## 12. CLEAN WORDPRESS FALLBACK ARCHITECTURE (PART H)

### 12.1 The three states

| State Contents Location Served publicly? Retention  |                                                                                                                                                              |                                                                                     |                                                                                        |                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **1. FORENSIC SNAPSHOT**                            | Full filesystem + full DB dump + cPanel metadata + GSC screenshots, all as captured *before* any remediation, checksummed                                    | Offline / cold storage, off-server. Two copies, one off-site                        | **Never**                                                                              | ≥ 12 months, or longer if any incident follow-up is open                        |
| **2. CLEAN WORDPRESS ROLLBACK COPY**                | Remediated, verified WordPress: pristine core/theme/plugins, injections removed, DB cleaned, users resolved, credentials rotated, content and uploads intact | `/home/<user>/sites/wp-clean/` on the same hosting account, plus an off-server copy | Only via a locked staging host (HTTP auth + `noindex` + IP restriction where possible) | Hot for **90 days** post-launch; warm (restorable within 24h) for **12 months** |
| **3. STATIC PRODUCTION**                            | The built static site                                                                                                                                        | `/home/<user>/sites/static-<timestamp>/`, with the previous 5 builds retained       | Yes, via the `current` symlink                                                         | Rolling                                                                         |

### 12.2 Component inventory for the rollback copy

| Component Requirement  |                                                                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WordPress files        | Pristine core 7.0.5 (or 7.1.1 if updated during remediation) + verified theme + verified plugins                                                                                          |
| Database               | Cleaned MySQL dump, restorable in one command. Includes all 30 pages and 15 posts                                                                                                         |
| Uploads                | `wp-content/uploads/` intact — **shared conceptually with the static site, but physically duplicated.** The static build has its own copy under `public/`. Neither may write to the other |
| `wp-config.php`        | Regenerated with **new** database credentials and **new** salts. Never restored from the forensic snapshot                                                                                |
| PHP runtime            | Record the required PHP version. Static production does not need PHP, but the rollback copy does — **confirm the hosting plan keeps PHP available after cutover (D1)**                    |
| DNS / routing          | No DNS change in either direction. Rollback is a symlink flip or an rsync                                                                                                                 |
| Isolation              | Static and WordPress live in sibling directories. WordPress has no write access to the static docroot and vice versa. Different file ownership where the host permits                     |

### 12.3 Rollback mechanics

**Model A (symlink):**

```
ln -sfn /home/<user>/sites/wp-clean /home/<user>/sites/current

```

Plus restoring the WordPress `.htaccess`. Time to restore: **< 1 minute.**

**Model A′ (rsync, if symlinks unavailable):**

```
rsync -a --delete /home/<user>/sites/wp-clean/ /home/<user>/public_html/

```

Time to restore: **minutes.** Must be rehearsed and timed on staging before cutover.

**In both cases:** restore the WordPress `.htaccess`, confirm the database connection, confirm the homepage renders, confirm the Simple 301 Redirects rules are live again, and confirm no injected scripts are present.

### 12.4 What must not be deleted

The forensic snapshot · the cleaned database dump · `wp-content/uploads/` in any copy · the three SEO evidence documents · this plan · the `seo-baseline.json` manifest · every static build in the retained window · the deploy and rollback scripts.

### 12.5 Eventual archival

No earlier than **90 days** after launch, and only if all monitoring gates in §16 are green: the clean WordPress copy may be moved from hot to cold storage. Full retirement of WordPress is a **separate decision with its own gate**, not part of this project.

---

## 13. QA / TEST ARCHITECTURE (PART I)

### 13.1 The protected URL manifest

The SEO baseline becomes `src/data/seo-baseline.json` — a machine-readable contract:

```jsonc
{
  "generated": "2026-09-21",
  "urls": [
    {
      "path": "/products/",
      "tier": 1,
      "expect": "200",
      "canonical": "self",
      "indexable": true,
      "titleMustContain": ["Cold Brew", "Nitro Coffee", "Kegs"],
      "h1MustContain": ["Nitro Cold Brew Coffee Kegs"],
      "mustContainText": ["Nitro Style", "Still (Flat) Style", "Bag In Box"],
      "minAmazonLinks": 13,
      "minStoreLinks": 16,
      "schema": ["WebPage", "BreadcrumbList"],
      "inSitemap": true,
      "minInternalLinksIn": 40
    },
    {
      "path": "/products-2/",
      "tier": 1,
      "expect": "200",
      "canonical": "self",
      "indexable": true,
      "mustContainText": [
        "Caveman Coffee Company Nitro", "Our Gorongosa Coffee Company",
        "Jittery John's", "Thai Treasures", "CULT Artisan", "Thanksgiving Coffee Company",
        "Direct Distribution Program", "PET Keg"
      ],
      "minPriceStrings": 19,
      "maxAmazonLinks": 0,
      "inSitemap": true,
      "maxInternalLinksIn": 0,        // orphan status is deliberate
      "mustNotRedirectTo": "/products/"
    }
    // … all 35 protected URLs, plus every redirect and every DO-NOT-GENERATE path
  ]
}

```

### 13.2 Test suites

| Suite Asserts Gate                |                                                                                                                                                                                                                                                        |                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| **T1 — URL matrix**               | Every `expect: 200` URL returns exactly 200. Every `expect: 301` returns 301 to the declared destination in **one hop**. Every DO-NOT-GENERATE path returns 404 (or the declared redirect). **Zero unexpected 404s**                                   | **Blocks deploy**         |
| **T2 — Redirects**                | One hop, correct destination, no loops, no chains, correct status code (301 not 302). Includes all 11 legacy plugin rules, all 29 AMP rules, protocol/host canonicalisation, and slash normalisation                                                   | **Blocks deploy**         |
| **T3 — Canonical & indexability** | Self-canonical on every indexable page; `noindex` only on the 4 declared pages; no page canonicalises to a URL that redirects                                                                                                                          | **Blocks deploy**         |
| **T4 — On-page elements**         | Exactly one `<h1>` per page; title present and matching `titleMustContain`; H1 matching `h1MustContain`; no two pages share a `<title>` **except** the declared `/products/` + `/products-2/` exception                                                | **Blocks deploy**         |
| **T5 — Content preservation**     | `mustContainText` strings present; `minPriceStrings`, `minAmazonLinks`, `maxAmazonLinks` satisfied; **`/products/`** **and** **`/products-2/`** **rendered output is not identical**                                                                   | **Blocks deploy**         |
| **T6 — Schema**                   | `BreadcrumbList` present on all 24 declared URLs; `Organization` and `WebSite` site-wide; all JSON-LD parses; validated against Google's Rich Results Test in CI where feasible                                                                        | **Blocks deploy**         |
| **T7 — Images**                   | Every referenced `/wp-content/uploads/` path exists in the build; the ranking-image list resolves 200; the 6 alliance images exist                                                                                                                     | **Blocks deploy**         |
| **T8 — Internal links**           | `/products/` linked from ≥40 pages; **`/products-2/`** **linked from 0 pages**; no internal link points at a redirecting or 404 URL                                                                                                                    | **Blocks deploy**         |
| **T9 — Sitemap**                  | `/sitemap.xml` returns 200 and valid XML; contains **`/products-2/`**; contains no noindex/utility/technical URL; every listed URL returns 200 and is self-canonical                                                                                   | **Blocks deploy**         |
| **T10 — robots.txt**              | Returns 200; declares the sitemap; disallows nothing in the protected set                                                                                                                                                                              | **Blocks deploy**         |
| **T11 — Security**                | The strings `quickdelivr`, `coredelivr`, `mpackage` appear **nowhere** in the build output. No unexpected third-party script hosts beyond an explicit allowlist                                                                                        | **Blocks deploy**         |
| **T12 — Transport**               | HTTPS enforced; `http://` → `https://` one hop; `www.` → apex one hop; valid certificate; HSTS considered                                                                                                                                              | Post-deploy smoke         |
| **T13 — Trailing slash**          | Every canonical URL ends in `/`; every slash-less variant 301s to the slash form                                                                                                                                                                       | **Blocks deploy**         |
| **T14 — Forms**                   | Contact form submits successfully and the message is received; spam protection active                                                                                                                                                                  | Post-deploy smoke, manual |
| **T15 — Analytics**               | GTM container fires; declared tags present; no tag fires twice                                                                                                                                                                                         | Post-deploy smoke         |
| **T16 — Rendering**               | Visual regression on the 17 Tier-1 URLs at mobile (390px) and desktop (1440px); no horizontal scroll; no missing assets in the console                                                                                                                 | Pre-deploy                |
| **T17 — Performance**             | Lighthouse ≥ 90 performance / ≥ 95 SEO / ≥ 90 accessibility on the Tier-1 set. **Note: there is no Core Web Vitals field-data baseline to compare against** (GSC reports "not enough usage data" for both device types), so these are lab targets only | Advisory                  |

### 13.3 Where each suite runs

- **Every PR:** T1–T13, T16, T17 against the preview build.
- **Pre-cutover:** the full suite against the preview build, then against a staging copy served from the production host.
- **Immediately post-cutover:** T1–T13 against **production**, plus T12, T14, T15 as manual smoke tests.
- **Daily for 30 days, then weekly:** a scheduled GitHub Action crawls production and diffs against the manifest, alerting on any drift.

---

## 14. CUTOVER RUNBOOK (PART J)

**Timing:** a low-traffic weekday morning, US time. **Never a Friday.** Allow a 4-hour window with all named owners available.

**Go/no-go gates are marked ⛔. Any gate failing stops the cutover; nothing is deleted and the site stays on WordPress.**

| # Step Owner Detail  |                                                                                                |               |                                                                                                                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1                    | **Final forensic / current-state backup**                                                      | Hosting       | Full filesystem + database, taken *today*, checksummed, downloaded off-server. This is distinct from the pre-remediation forensic snapshot                                                                         |
| 2                    | ⛔ **Confirm the CLEAN WordPress rollback copy exists and works**                               | Hosting + SEO | Every checkbox in §3.3 ticked. Serve it from the locked staging host and confirm the homepage, `/products/`, `/products-2/` and a form all work. **Rehearse the rollback command and record the elapsed time**     |
| 3                    | **Final WordPress SEO crawl**                                                                  | SEO           | Crawl the live WordPress site one last time; store the output as the definitive pre-cutover state. This is the comparison set for step 9                                                                           |
| 4                    | **Final static build from** **`main`**                                                         | Dev           | Tag the release. Build artefact archived                                                                                                                                                                           |
| 5                    | ⛔ **URL matrix QA (T1, T3, T4, T5, T7, T8, T13) on the build**                                 | Dev + SEO     | **Zero unexpected 404s.** Zero title/H1 regressions on protected URLs. `/products/` ≠ `/products-2/`                                                                                                               |
| 6                    | ⛔ **Redirect QA (T2) on the build**                                                            | Dev + SEO     | All legacy rules, all AMP rules, protocol/host, slash. One hop each                                                                                                                                                |
| 7                    | ⛔ **Security QA (T11)**                                                                        | Dev           | Zero matches for the three injection strings. Third-party script hosts match the allowlist exactly                                                                                                                 |
| 8                    | **Deploy static to a new timestamped directory**                                               | Dev           | Not yet live. Verify the directory contents and file count                                                                                                                                                         |
| 9                    | ⛔ **Serve the new build from the production host on the locked staging URL and re-run T1–T13** | Dev + SEO     | This catches server-level differences — `.htaccess` behaviour, MIME types, trailing-slash handling — that a local build cannot                                                                                     |
| 10                   | **PRODUCTION ROUTING SWITCH**                                                                  | Hosting       | Flip `current` → the new static directory (Model A), or rsync (Model A′). **WordPress files are not touched, moved or deleted**                                                                                    |
| 11                   | **Immediate live smoke test — 10 minutes**                                                     | All           | Homepage, `/products/`, `/products-2/`, `/howtobuy/`, `/kegerators/`, `/nitro-cold-brew/`, contact form, one blog post, one AMP redirect, one legacy `/services/*` redirect, `http://` → `https://`, `www.` → apex |
| 12                   | **Immediate live crawl**                                                                       | SEO           | Full crawl of production; diff against step 3's output and against the manifest. **Zero unexpected 404s**                                                                                                          |
| 13                   | **Canonical verification**                                                                     | SEO           | Spot-check the 17 Tier-1 URLs: self-canonical, indexable, one H1                                                                                                                                                   |
| 14                   | **Analytics verification**                                                                     | Marketing     | GTM fires; Klaviyo loads; Meta Pixel fires if retained; no duplicate tags; real-time data arriving                                                                                                                 |
| 15                   | **Form verification**                                                                          | Marketing     | Submit the contact form end to end; confirm receipt; confirm spam protection                                                                                                                                       |
| 16                   | **Structured-data verification**                                                               | SEO           | Rich Results Test on `/`, `/products/`, `/products-2/`, one blog post. Breadcrumbs valid on all                                                                                                                    |
| 17                   | **Sitemap publication**                                                                        | SEO           | Confirm `/sitemap.xml` is live, valid, and **contains** **`/products-2/`**. Do **not** yet remove the old sitemap submissions in GSC                                                                               |
| 18                   | **Search Console**                                                                             | SEO           | URL-inspect `/`, `/products/`, `/products-2/`, `/howtobuy/` on the live site. Submit the new sitemap. **Do not** request mass re-indexing. **Do not** use the Removals tool                                        |
| 19                   | **Monitoring start**                                                                           | SEO           | Start the §16 schedule. Enable the daily scheduled QA crawl. Set an uptime monitor on the homepage and `/products/`                                                                                                |
| 20                   | **Freeze WordPress**                                                                           | Hosting       | Communicate to the team: WordPress is read-only from this moment. No edits                                                                                                                                         |

**Explicitly NOT done on launch day:** deleting WordPress · deleting the database · deleting uploads · removing old sitemap submissions from GSC · changing DNS · changing titles or meta descriptions · adding internal links to `/products-2/` · consolidating any URL · enabling `Product` schema.

---

## 15. ROLLBACK RUNBOOK (PART K)

### 15.1 The distinction that governs this section

**STATIC APP FAILURE** is a functional defect in the new site. It is visible within minutes to hours, it is binary, and it justifies rollback.

**SEO VOLATILITY** is ranking and impression movement during Google's recrawl of a rebuilt site. It is expected, it is noisy, it resolves over weeks, and **it does not justify rollback.** Rolling back on SEO volatility converts a temporary fluctuation into two platform changes in quick succession, which is strictly worse.

### 15.2 Rollback triggers — STATIC APP FAILURE

Roll back if **any** of these is true and cannot be fixed by a forward deploy within the stated window:

| Trigger Window                                                                      |               |
| ----------------------------------------------------------------------------------- | ------------- |
| Site returns 5xx or is unreachable                                                  | 15 minutes    |
| HTTPS broken, certificate error, or mixed-content warnings on Tier-1 pages          | 30 minutes    |
| Homepage, `/products/` or `/products-2/` returns a non-200                          | 30 minutes    |
| Widespread unexpected 404s (>5 protected URLs)                                      | 30 minutes    |
| Contact form non-functional — enquiries being lost                                  | 2 hours       |
| Purchase paths broken (Amazon or store links dead/wrong)                            | 2 hours       |
| Malicious content detected in the static build                                      | **Immediate** |
| Catastrophic rendering failure on mobile                                            | 2 hours       |
| Analytics completely absent **and** the business needs the data for a live campaign | 4 hours       |

**Preferred response is always a forward fix.** Rollback is for when a forward fix is not achievable inside the window.

### 15.3 Explicitly NOT rollback triggers

- Ranking positions moving by a few places.
- Impressions dipping during recrawl.
- **AMP impressions and clicks going to zero** — this is planned (§6.3).
- Indexed page count changing as `/amp/` alternates drop out.
- `/products-2/` crawl frequency changing.
- A temporary dip in the `bona fide` branded query.
- Search Console reporting a transient crawl anomaly in the first fortnight.
- One page's position changing on one query.

### 15.4 Rollback procedure

1. **Declare.** Named decision-maker (default: Zaneta) confirms a §15.2 trigger and that no forward fix is available.
2. **Snapshot the failed state** — copy the static directory and logs before changing anything. Do not lose the evidence.
3. **Execute.** Model A: flip the `current` symlink to `wp-clean`. Model A′: rsync `wp-clean` into the docroot. Restore the WordPress `.htaccess`.
4. **Verify.** Homepage, `/products/`, `/products-2/`, one blog post, the contact form, one legacy redirect, HTTPS, and — critically — **confirm no injected scripts are present** in the restored copy.
5. **Confirm SEO state.** Canonicals intact, sitemap serving, robots.txt correct.
6. **Notify** the team; record the time of rollback.
7. **Post-mortem within 48 hours.** Root cause, the test that should have caught it, and the fix. Add that test to the suite before re-attempting cutover.
8. **Do not re-attempt cutover** until the failing test passes in CI.

**Target time-to-restore: under 5 minutes (Model A), under 30 minutes (Model A′).** This must be measured during the step-2 rehearsal, not estimated.

---

## 16. POST-LAUNCH MONITORING (PART L)

### 16.1 Schedule

| Checkpoint Focus  |                                                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **24 hours**      | Uptime · zero unexpected 404s · Tier-1 URLs 200 + self-canonical · sitemap fetched by Google · analytics flowing · forms working · no security warnings                     |
| **72 hours**      | First Googlebot crawls of Tier-1 URLs · URL Inspection on `/`, `/products/`, `/products-2/` · `/amp/` redirects being followed · crawl-error report                         |
| **7 days**        | Page Indexing report · index counts (expect AMP alternates to begin dropping) · first performance data · canonical selections · Google-selected canonical on `/products-2/` |
| **14 days**       | Position stability on the keg cluster · branded queries · `/howtobuy/` · crawl stats · the first meaningful click comparison                                                |
| **30 days**       | Full baseline comparison against the SEO baseline document · indexation settled · AMP impressions expected at or near zero · query-level review for both product pages      |
| **60 days**       | Trend confirmation · whether any Tier-2 URL has lost its distinguishing rankings · early read on consolidation gates                                                        |
| **90 days**       | **Consolidation decision gate** (§17.3) · Tier-2 review · whether the new IA work can begin                                                                                 |

### 16.2 URL watchlist

`/` · `/products/` · `/products-2/` · `/howtobuy/` · `/kegerators/` · `/nitro-cold-brew/` · `/hot-nitro-coffee/` · `/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/` · `/coffee-on-tap-is-the-future/` · `/nitro-cold-brew-old/` · `/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/` · `/about/` · `/nitro-coffee-kegs/`

### 16.3 Query watchlist with baselines

| Query group Baseline (16-mo) to compare against  |                                                                                                                                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Branded                                          | `bonafide coffee` 315 clicks @1.6 · `bona fide nitro coffee` 247 @1.5 · `bona fide coffee` 236 @1.0 · `bonafide nitro coffee` 125 @1.8 · `bona fide brewing company` 67 @1.5 · `bona fide` 18,994 impr @13.0 |
| Keg cluster                                      | `cold brew keg` 82 @9.1 · `nitro cold brew keg` 56 @9.4 · `cold brew kegs` 43 @7.3 · `nitro brew keg` 32 @9.1 · `coffee keg` 22 @9.5 · `nitro coffee keg` 17 @9.5                                            |
| **`pet coffee keg`**                             | **`/products-2/`** **767 impr @4.3** vs `/products/` 480 @14.0                                                                                                                                               |
| Caveman / alliance                               | `caveman coffee nitro` 116 @28.8 · `caveman nitro` 62 @13.7 · `caveman coffee nitro caffeine content` 62 @29.8 · `caveman nitro coffee` 55 @21.9                                                             |
| Supplier / manufacturer                          | `nitro coffee can supplier` 560 · `nitro cold brew coffee can supplier` 472 · `nitro coffee can manufacturer` 61 @9.6 · `coffee distributors` 1,934 @61.4                                                    |
| B2B                                              | `nitro cold brew for businesses` 37 @12.0 · `cold brew keg for office` 484 @15.4 · `wholesale nitro cold brew` 99 @4.0                                                                                       |
| Generic head terms                               | `nitro coffee` 17,541 @19.7 · `nitrocoffee` 2,466 @14.5                                                                                                                                                      |
| Other Tier-1                                     | `hot nitro coffee` 16 @4.7 · `coffee on tap` 14 @6.7 · `bag in box coffee` 564 @24.3 · `is 3 cups of coffee too much` 1,633 @2.5 · `nitro coffee dispenser` 1,531 @18.4                                      |

### 16.4 `/products-2/` specific watch

Because this URL is orphaned and survives on sitemap discovery alone, it needs its own tracking:

| Signal Baseline Red flag      |                                                                  |                                                                                           |
| ----------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Google-selected canonical     | "Inspected URL"                                                  | Any change to `/products/` — **this is the consolidation trigger, not a failure** (§17.3) |
| Indexed status                | "Page is indexed"                                                | Dropping out of the index                                                                 |
| `pet coffee keg`              | 767 impr @ **4.3**                                               | Falling below position 10 while `/products/` does not improve                             |
| Caveman cluster               | \~295 impressions                                                | Disappearing entirely                                                                     |
| Generic `nitro coffee`        | 4,149 impr @12.7                                                 | —                                                                                         |
| Supplier/manufacturer queries | see §16.3                                                        | —                                                                                         |
| Crawl frequency               | \~every 3–4 weeks (last crawl 29 Aug vs 20 Sep for `/products/`) | Not crawled within 60 days of launch                                                      |
| Sitemap membership            | present in `/sitemap.xml`                                        | **Absent — this is a P1 incident**                                                        |
| Internal links in             | **0 — deliberate**                                               | Any internal link appearing is a regression against T8                                    |

### 16.5 Site-level monitoring

Uptime (homepage + `/products/`) · daily scheduled QA crawl against the manifest for 30 days, then weekly · GSC Page Indexing, Sitemaps, Security Issues, Manual Actions weekly for 90 days · Core Web Vitals (expect "not enough data" to persist — **absence of CWV data is not a failure**) · analytics sessions and conversions against the pre-launch period.

---

## 17. POST-MIGRATION OPTIMISATION BACKLOG (PART M)

**None of this is launch scope. None of it is scheduled as part of the cutover.**

### 17.1 Phase 2 — weeks 4–12, one change at a time

| # Item Evidence Note  |                                                                                                                               |                                                                                                        |                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| B1                    | **Differentiate** **`/products-2/`** **title and meta description.** Change `/products-2/` only; leave `/products/` untouched | Both ship byte-identical metadata; only 3 pages site-wide have a meta description at all               | **The first change after launch.** Made alone and measured |
| B2                    | Add meta descriptions to the other 54 pages                                                                                   | 54 of 57 pages have none                                                                               | Low risk, meaningful CTR upside                            |
| B3                    | Fix alt text across the product pages                                                                                         | 10 of 25 images on `/products-2/` have empty alt; several use filenames                                |                                                            |
| B4                    | Rebuild `/howtobuy/` content                                                                                                  | −30% YoY, 13 external links, ranks 61.4 for `coffee distributors` (1,934 impressions)                  | Highest-value single content fix                           |
| B5                    | `/kegerators/` title and H1 rework — **URL unchanged**                                                                        | Page is named for a term almost nobody searches; owns \~5,300 impressions of dispenser/machine queries |                                                            |
| B6                    | Topical internal linking                                                                                                      | `/coffee-on-tap-is-the-future/` has 3 links, `/nitro-coffee-kegs/` has 1 despite 5 external links      | Cheapest win in the whole audit                            |

### 17.2 Phase 3 — months 3–6

| # Item Evidence  |                                                                                                     |                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| B7               | **Launch** **`/nitro-tea/`**                                                                        | \~1,850 tea impressions, zero tea pages, "Tea" in the company name                                                                  |
| B8               | **Launch** **`/bag-in-box/`** commercial page                                                       | \~1,900 impressions currently held by one blog post                                                                                 |
| B9               | **Launch** **`/draft-systems/`**, then 301 `/nitro-cold-brew-coffee-made-easy-2/` into it           | \~2,300 impressions on a zero-click page; aligns with "Draft Coffee and Tea"                                                        |
| B10              | **Launch** **`/office-coffee/`**                                                                    | \~630 impressions                                                                                                                   |
| B11              | One contextual link from `/howtobuy/` → `/products-2/`; formalise the retail/wholesale split        | Forensic §13                                                                                                                        |
| B12              | Consolidate the health cluster into `/healthy-benefits-…-healthy/`                                  | `nitro cold brew benefits` splits 601/621 across two 0% CTR pages                                                                   |
| B13              | Consolidate `/nitro-cold-brew-old/` and `/what-is-nitro-cold-brew-coffee/` into `/nitro-cold-brew/` | **Only after** the destination demonstrably reproduces `is nitro coffee bad for you` @7.2 and `nitro drip`/`nitro meaning` @1.0–3.2 |
| B14              | Consolidate the three `/interested-in-selling-*/` pages                                             |                                                                                                                                     |
| B15              | `Product` schema on both product pages                                                              | No product markup exists today                                                                                                      |
| B16              | Merchant Center / Shopping evaluation                                                               | "Your products are not appearing in the Shopping tab"                                                                               |
| B17              | Retire the `sitemap_index.xml` and `http://` sitemap submissions in GSC                             | Erroring since 2018                                                                                                                 |
| B18              | Brand-entity work for `bona fide`                                                                   | 18,994 impressions at position 13 with 0% CTR                                                                                       |

### 17.3 The `/products-2/` consolidation gate

Carried verbatim from the forensic report. **Minimum 90-day observation window.** Consolidate only when **all eleven** gates are met:

1. `/products/` keg cluster within ±2 positions of baseline for 8 consecutive weeks.
2. Both URLs "Page is indexed" with Google-selected canonical = Inspected URL for 8 consecutive weeks.
3. Neither URL has appeared as "Duplicate, Google chose different canonical" post-launch.
4. A fresh page-filtered query pull confirms what happened to `/products-2/`'s unique query set.
5. **`pet coffee keg`** **resolved** — `/products/` has reached ≤ position 6, **or** the query has decayed below 100 impressions/quarter.
6. The business has decided whether the Alliance Brand range remains a live offer.
7. The destination already contains the price list, the six partner SKUs and the PET-keg vocabulary **before** the redirect is created.
8. `/products-2/` has no query in the last 90 days where it ranks materially better than the destination.
9. A third-party backlink index has been checked for historical links to `/products-2/` — **Search Console cannot answer this**.
10. The 301 and the `/products-2/amp/` mapping verified on staging: single hop, no chain.
11. This plan and the three evidence documents retained as the comparison baseline.

**Consolidate sooner only if** GSC flips `/products-2/` to "Duplicate, Google chose different canonical than user" — Google has then made the decision and the response is a deliberate 301, not a scramble.

**Never consolidate if** `/products-2/` holds or improves `pet coffee keg`, the Caveman cluster and the supplier queries while `/products/` holds the keg cluster. In that case, formalise the split instead (B11).

---

## 18. DEPENDENCIES AND UNRESOLVED DECISIONS

| # Decision / dependency Owner Blocks Default if unanswered  |                                                                                                                                                     |                 |                                               |                                                                                            |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **D1**                                                      | **Does the GoDaddy/cPanel plan permit a symlinked docroot or custom document root — and does it keep PHP available after the static site is live?** | Hosting         | Parts B, H, J, K                              | Use Model A′ (rsync). Rehearse and time it                                                 |
| **D2**                                                      | **Astro or Eleventy?**                                                                                                                              | Dev             | Part F                                        | Astro                                                                                      |
| **D3**                                                      | **Is Meta/Facebook Pixel still needed?**                                                                                                            | Marketing       | Part G                                        | Keep, moved inside GTM                                                                     |
| **D4**                                                      | **Is a consent banner required?**                                                                                                                   | Marketing/Legal | Part G                                        | Implement GTM consent mode                                                                 |
| **D5 / I5**                                                 | **Is BookingPress appointment booking still used?**                                                                                                 | Business        | §7.4, Part G                                  | Retire; 301 the six URLs                                                                   |
| **D6**                                                      | **Is EU equipment rental still a live business line?**                                                                                              | Business        | `/hot-nitro-equipment-rental/` classification | Keep the page                                                                              |
| **D7 / I7**                                                 | **What generates the homepage review snippet, and is it compliant?**                                                                                | SEO             | Schema module                                 | Do not reproduce self-serving review markup; document the expected loss of one rich result |
| **I1**                                                      | **The real destinations of the 15 cross-origin redirects**                                                                                          | Dev/Hosting     | **Redirect register — blocking**              | Must be resolved. `curl -I` each                                                           |
| **I2**                                                      | **Should** **`Bona-Fide-Marketing-Plan-2026.pdf`** **be publicly indexed?**                                                                         | Business        | §7.7                                          | Preserve the path; flag for review                                                         |
| **S9**                                                      | **Are** **`sys_maint`** **and** **`thrive_support`** **expected WordPress accounts?**                                                               | Business        | **Security clean gate — blocking**            | Treat as compromise indicators until confirmed                                             |
| **S1**                                                      | **Where does the obfuscated inline blob originate?**                                                                                                | Security        | **Security clean gate — blocking**            | Must be located                                                                            |
| **D8**                                                      | **Is the brand moving from "Nitro Coffee and Tea" to "Draft Coffee and Tea"?**                                                                      | Business        | Phase 3 content, not launch                   | Preserve existing "nitro" vocabulary at launch regardless                                  |
| **D9**                                                      | **Is tea a real product line to build architecture around?**                                                                                        | Business        | B7                                            | Build `/nitro-tea/` in Phase 3 — the evidence supports it                                  |
| **D10**                                                     | **Who owns post-launch SEO monitoring, and with what tooling?**                                                                                     | Business        | Part L                                        | Zaneta + the scheduled QA crawl                                                            |
| **D11**                                                     | **Form provider: hosted service or self-hosted PHP endpoint?**                                                                                      | Dev/Business    | Part G                                        | Hosted service — better security posture                                                   |
| **D12**                                                     | **Does** **`nitrocoffee.store`** **(Shopify) remain the commerce endpoint?**                                                                        | Business        | Product data model                            | Yes — all store links preserved                                                            |

---

## 19. EXACT EXECUTION ORDER

### Phase 0 — Decisions and preparation *(no production change)*

Resolve D1, D2, D5, D11 and I1. Assign owners. Confirm the hosting capability for the symlink model.

### Phase 1 — Security *(current WordPress, authorised change)*

Forensic snapshot → investigate → remediate → verify → clean rollback copy → Safe Browsing review request.
**This phase must complete before Phase 3 deploys anything.**

### Phase 2 — Build *(no production change)*

Repository scaffold → content transcription → product data model → QA suite → preview environment.

### Phase 3 — Cutover

Full QA → staging-on-production-host verification → routing switch → verification → monitoring start.

### Phase 4 — Optimise

90 days of monitoring, then the backlog, one change at a time.

---

# IMPLEMENTATION SEQUENCE

**STEP 1** — Resolve the blocking decisions: **D1** (hosting: symlink or rsync, and PHP availability post-cutover), **D2** (Astro or Eleventy), **D5** (BookingPress), **D11** (form provider). Assign a named owner to each phase.

**STEP 2** — Resolve **I1**: `curl -I` all 15 cross-origin redirect URLs and record their real destinations. Determine how many are being sent to the homepage by the "404 to Start" plugin. This unblocks the redirect register.

**STEP 3** — **Take the forensic snapshot.** Full filesystem, full database, cPanel metadata, Search Console screenshots. Off-server, checksummed, write-once. **Nothing else happens until this exists.**

**STEP 4** — Run the security investigation (§3.2 Phases A1–A3). Resolve **S1** (origin of the obfuscated blob) and **S9** (`sys_maint`, `thrive_support`). Produce the definitive modified-file list.

**STEP 5** — Remediate (§3.2 Phase A4). Clean files, clean database, resolve users, rotate every credential, enable 2FA.

**STEP 6** — Verify and create the **CLEAN WORDPRESS ROLLBACK COPY**. Tick every box in §3.3. Observe 7 days for re-infection. Request the Safe Browsing review.

**STEP 7** — Stand up the GitHub repository: structure, build pipeline, preview environment (noindexed and password-protected), and the `seo-baseline.json` protected URL manifest.

**STEP 8** — Build the QA suite (T1–T17) **before** building pages, so every page is written against a passing test.

**STEP 9** — Build the products data model. Transcribe all SKUs — core, tea, specialty and the six Alliance Brands — with the `views` flags that keep `/products/` and `/products-2/` distinct.

**STEP 10** — Build the 17 Tier-1 pages. Transcribe content faithfully. Preserve titles, H1s, headings, copy, links, image paths, CTAs.

**STEP 11** — Build the 18 Tier-2 pages, the 15 blog posts, the blog/category/author archives, and the legal pages.

**STEP 12** — Copy `wp-content/uploads/` into the build at identical paths. Verify every referenced image resolves (T7).

**STEP 13** — Implement metadata, canonicals, JSON-LD, breadcrumbs, `/sitemap.xml`, `robots.txt` and the real 404.

**STEP 14** — Build `redirects.yaml` and the `.htaccess` generator: legacy plugin rules, AMP, protocol/host, slash normalisation, and the §7.4 launch redirects.

**STEP 15** — Reimplement integrations from source configuration: GTM, Klaviyo, Meta Pixel (per D3), the form endpoint, and the booking decision (per D5). Confirm T11 passes — zero injection strings.

**STEP 16** — Run the full QA suite against the preview build until green. Fix, do not waive.

**STEP 17** — Deploy the build to the production host and serve it on the locked staging URL. **Re-run T1–T13 there.** This is the step that catches server-level differences.

**STEP 18** — **Rehearse the rollback.** Execute it on staging, time it, and record the elapsed time in the rollback runbook. A rollback that has never been executed is not a rollback.

**STEP 19** — Schedule the cutover window. Confirm all owners are available. Circulate the runbook.

**STEP 20** — **CUTOVER.** Execute §14 steps 1–20 in order, honouring every ⛔ gate.

**STEP 21** — Post-cutover verification: live crawl, canonicals, analytics, forms, structured data, sitemap submission, URL inspection. Freeze WordPress as read-only.

**STEP 22** — Monitor to the §16 schedule: 24h, 72h, 7d, 14d, 30d, 60d, 90d. Treat AMP disappearance as expected.

**STEP 23** — At day 30, remove the obsolete `sitemap_index.xml` and `http://` sitemap submissions from Search Console.

**STEP 24** — At day 30+, begin Phase 2 of the backlog — starting with **B1,** **`/products-2/`** **title and meta differentiation, made alone and measured.**

**STEP 25** — At day 90, run the §17.3 consolidation gate for `/products-2/`. Move the clean WordPress copy from hot to cold storage only if every monitoring gate is green.

**STEP 26** — Phase 3 backlog: the four new pages (`/nitro-tea/`, `/bag-in-box/`, `/draft-systems/`, `/office-coffee/`), the Tier-2 consolidations, `Product` schema, and the internal-linking programme — each as its own change.

---

*End of master plan. No code written. No production, WordPress, DNS, redirect or Search Console change made. Execution begins at STEP 1 on your authorisation.*