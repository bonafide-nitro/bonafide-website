# Bona Fide Website Migration — Execution Plan

**Repository:** `bonafide-nitro/bonafide-website`  
**Domain:** `https://bonafidenitro.com`  
**Status:** Planning and gated execution only.  
**Core rule:** Preserve first, optimize later.

This file turns the migration master plan into a controlled sequence. No stage automatically authorizes the next stage. Each stage ends with a STOP gate and review.

## Stage 0 — Planning control

### Objective
Create one shared execution sequence for ChatGPT, Claude, Codex, and the operator.

### Allowed actions
- Read the migration evidence in `docs/migration/`.
- Update planning/checklist documentation only.
- Record decisions and unresolved blockers.

### Proof required
- This execution plan exists in the repository.
- All work references the four authoritative migration evidence files.

### STOP gate
Do not begin technical implementation until Stage 1 is explicitly approved.

---

## Stage 1 — Pre-build blocker verification (READ ONLY)

### Objective
Resolve the factual unknowns that determine how the migration must be built and deployed.

### Tasks
1. **D1 — Hosting/deployment capability**
   - Determine whether GoDaddy/cPanel supports:
     - symlink-based release switching,
     - custom document root,
     - SSH/SFTP,
     - rsync,
     - sibling release directories,
     - any PHP/runtime constraints that affect static deployment.
   - Prefer a release/symlink model if supported; otherwise document the safest rsync fallback.
   - Do not change hosting configuration.

2. **I1 — Unknown redirect destinations**
   - Inspect the unresolved legacy URLs from the master plan with read-only HTTP requests.
   - Record:
     - current status,
     - redirect hops,
     - final destination,
     - whether the destination is internal/external,
     - whether the redirect is intentional or suspicious.
   - Do not create or change redirects.

3. **D5 — BookingPress usage**
   - Determine whether BookingPress is actually in use.
   - Check for:
     - configured services,
     - appointments,
     - recent or future bookings,
     - pages/forms using BookingPress.
   - Do not disable or delete anything.

4. **D11 — Static form approach**
   - Record the approved architecture decision:
     - hosted static-compatible form service,
     - provider remains replaceable,
     - no provider purchase required yet.

### Required output
Create a report named:

`BONA FIDE — PRE-BUILD MIGRATION BLOCKERS RESOLVED`

The report must distinguish:
- facts observed,
- decisions already approved,
- unresolved questions,
- recommended next action.

### STOP gate
No Astro scaffold, no production changes, no WordPress changes, no deployment connection, no redirect changes.

Stage 1 must be reviewed and explicitly approved before Stage 2.

---

## Stage 2 — Forensic preservation before cleanup

### Objective
Preserve evidence from the current compromised WordPress installation before remediation.

### Allowed actions
- Create an offline forensic snapshot.
- Record relevant users, plugins, theme files, cron jobs, suspicious scripts, timestamps, and access evidence.
- Capture current configuration needed for later comparison.

### Prohibited actions
- Do not clean, delete, patch, rotate, or overwrite evidence before the snapshot is complete.

### Proof required
- Forensic snapshot exists and is stored separately from production.
- Security findings are documented.

### STOP gate
No security remediation until snapshot completeness is confirmed.

---

## Stage 3 — WordPress security remediation

### Objective
Identify and close the compromise path, then produce a clean WordPress rollback copy.

### Tasks
- Investigate malicious injection source.
- Remove malicious code and persistence.
- Review unexpected users and access paths.
- Review cron/scheduled tasks and relevant file integrity.
- Rotate credentials and enable stronger account protection where appropriate.
- Confirm the cleaned WordPress site functions.
- Preserve the infected snapshot separately.

### Proof required
- Suspicious scripts no longer render.
- Entry route is understood or materially mitigated.
- Clean WordPress rollback copy exists.
- Security verification is documented.

### STOP gate
No production static cutover until a clean rollback asset exists.

---

## Stage 4 — Repository technical foundation

### Objective
Create the static-site foundation without deploying it.

### Tasks
- Scaffold Astro.
- Create agreed repository structure.
- Create data/config files for products, navigation, redirects, site settings, and SEO baseline.
- Keep `/products/` and `/products-2/` as separate launch URLs.
- Do not copy WordPress theme PHP or suspicious injected code.

### Proof required
- Local/static build succeeds.
- No production deployment is connected.
- Required URL-preservation rules are represented in configuration.

### STOP gate
Do not begin broad page migration until QA foundations are in place.

---

## Stage 5 — Migration QA framework

### Objective
Create automated checks before migrating pages.

### Checks
- Protected URLs.
- Expected 200/301/404 status behavior.
- Canonicals.
- Titles and H1s.
- Sitemap membership.
- Redirect rules and chain detection.
- `/products/` vs `/products-2/` separation.
- Image path preservation.
- Absence of known malicious/suspicious script strings.

### STOP gate
Page migration begins only after the QA framework can detect preservation failures.

---

## Stage 6 — Static page migration

### Objective
Move existing site content into Astro while preserving launch-time SEO variables.

### Rules
- Same domain.
- Preserve protected URLs.
- Preserve search intent and page meaning.
- Preserve important image paths.
- Preserve `/products/` and `/products-2/` as distinct pages.
- No optimization changes unless explicitly approved.

### STOP gate
No cutover preparation until the static preview passes QA.

---

## Stage 7 — Integrations

### Objective
Recreate legitimate integrations cleanly.

### Scope
- Analytics/tagging.
- Meta tracking if retained.
- Klaviyo where needed.
- Forms.
- Store/Shopify links and other external commerce links.
- Any confirmed booking function still in use.

### Rule
Reimplement from verified configuration. Do not copy current WordPress page-source scripts blindly.

---

## Stage 8 — Full pre-launch comparison

### Objective
Compare the static preview against the preserved SEO baseline and current live behavior.

### Proof required
- Tier-1/Tier-2 URL checks pass.
- Redirect plan passes.
- Sitemap/robots/canonical checks pass.
- Product pages remain distinct.
- No unexpected 404s.
- No suspicious script carryover.

### STOP gate
No cutover without explicit approval.

---

## Stage 9 — Cutover and rollback procedure

### Objective
Write and verify the exact production switch and rollback commands before using them.

### Required
- Deployment command/process.
- Rollback command/process.
- Verification checklist.
- Responsible operator.
- Timing.
- Clean WordPress fallback location.

### STOP gate
Cutover requires explicit approval immediately before execution.

---

## Stage 10 — Production cutover

Perform only the approved switch, then immediately run the post-cutover verification checklist.

---

## Stage 11 — Monitoring

Monitor at:
- 24 hours,
- 72 hours,
- 7 days,
- 14 days,
- 30 days,
- 60 days,
- 90 days.

Track crawl/indexing, Search Console changes, redirects, errors, ranking/traffic anomalies, and form/integration behavior.

---

## Stage 12 — Optimization after stability

Only after migration stability:
- metadata improvements,
- internal linking,
- `/products-2/` differentiation,
- content improvements,
- new landing pages,
- broader architecture changes.

Do not mix these changes into the migration cutover.
