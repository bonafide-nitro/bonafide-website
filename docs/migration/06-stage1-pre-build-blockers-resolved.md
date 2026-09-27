# BONA FIDE — PRE-BUILD MIGRATION BLOCKERS RESOLVED

**Block:** Issue #19 (Stage 1 of `docs/migration/05-execution-plan.md`)
**Scope:** Read-only investigation only. The live WordPress site was not modified.
**Relationship to existing evidence:** This report does **not** re-audit or replace
`01-pre-migration-seo-baseline.md`, `02-seo-raw-data-appendix.md`,
`03-products-products-2-forensic-seo-preservation.md`, or
`04-wordpress-to-static-migration-master-plan.md`. Per the `ZANETA_DECISION` comment
on Issue #19 (2026-09-26), those four documents remain the authoritative SEO
baseline and are not repeated here. This report only adds the Stage 1
operational-blocker findings (D1, I1, D5, D11) layered on top of that evidence.

## Summary

| Item | Status | Notes |
| --- | --- | --- |
| D11 — static form approach | **RESOLVED** (already-approved decision, recorded) | No live check needed |
| D1 — hosting/deployment capability | **RESOLVED** (evidence-backed deployment decision) | Symlink/custom-primary-docroot/rsync not assumed; safe-fallback SSH/SFTP-or-File-Manager deploy into existing `/public_html` decided instead |
| I1 — 15 unknown redirect destinations | **RESOLVED** (operator curl evidence) | 17 tested legacy URL variants resolve to the HTTP homepage; `/collections-nitro-coffee/` is a confirmed external 301; no redirect loop |
| D5 — BookingPress usage | **RESOLVED** (operator dashboard evidence + decision) | BookingPress is unused (0 appointments/customers/revenue); Calendly is the actual scheduling integration |

Stage 1 is therefore **complete**: D11, D1, I1, and D5 are all resolved, using the
operator-supplied evidence recorded on Issue #19 on 2026-09-27 and the deployment
decision recorded in the `CHANGES_REQUESTED` review on this PR (comment
[5853644604](https://github.com/bonafide-nitro/bonafide-website/pull/20#issuecomment-5853644604)),
confirmed by the follow-up `ZANETA_DECISION`
([5853694950](https://github.com/bonafide-nitro/bonafide-website/pull/20#issuecomment-5853694950)).
This supersedes the prior partial/documentation-only version of this report (option
(b) from the original `NEEDS_ZANETA` on Issue #19), which recorded D1/I1/D5 as
blocked on access this session did not have.

---

## D11 — Static form approach (RESOLVED)

**Decision already approved (recorded here, not re-derived):**
- The Contact Form 7 replacement is a **hosted static-compatible form service**
  (e.g. Formspree, Basin, Web3Forms).
- The provider remains **replaceable** — no vendor lock-in is assumed.
- **No provider purchase is required yet.**

**Source:** Issue #19 acceptance criteria; corroborated by
`docs/migration/04-wordpress-to-static-migration-master-plan.md` line 733
("Contact Form 7 → Replaced → a static-compatible form endpoint... Recommended:
a hosted form service (Formspree, Basin, Web3Forms)").

**Action required:** none for Stage 1.

---

## D1 — Hosting/deployment capability (RESOLVED)

### Facts observed (operator-confirmed, per Issue #19 body)
- `bonafidenitro.com` cPanel Document Root is `/public_html`.
- The active WordPress installation is in `/public_html`.
- A backup copy of the current root `.htaccess` has been created.

### Operator evidence (2026-09-27, Issue #19)
- SSH Access section with a **Manage** control is exposed in the Bona Fide
  cPanel dashboard, confirming SSH capability exists on the account
  ([5845559488](https://github.com/bonafide-nitro/bonafide-website/issues/19#issuecomment-5845559488)).
- cPanel → SSH Access → Manage SSH Keys shows **no public or private keys
  currently installed**; key import/generation and authorization workflows are
  available but unused so far
  ([5845575840](https://github.com/bonafide-nitro/bonafide-website/issues/19#issuecomment-5845575840)).
- A separate, working GoDaddy/cPanel account in Žaneta's own environment
  already uses this exact key-based deployment pattern (dedicated,
  purpose-named authorized keys such as `molosoc-git-deploy` and
  `molosoc-reports-ci`, rather than one shared credential), proving the
  pattern is viable on this hosting provider
  ([5845585016](https://github.com/bonafide-nitro/bonafide-website/issues/19#issuecomment-5845585016)).
- The Bona Fide cPanel account does **not** expose the cPanel Terminal feature
  ([5853615506](https://github.com/bonafide-nitro/bonafide-website/issues/19#issuecomment-5853615506)).

### Deployment decision (recorded per the `CHANGES_REQUESTED` review on this PR, not independently derived by this session)
Per comment
[5853644604](https://github.com/bonafide-nitro/bonafide-website/pull/20#issuecomment-5853644604):
current GoDaddy Web Hosting (cPanel) documentation states SSH is supported and
the primary-domain document root is `/public_html`; GoDaddy documents custom
document-root changes for addon/subdomains, not the primary domain. Combined
with the operator evidence above (no confirmed symlink/custom-primary-docroot
capability, cPanel Terminal unavailable), the migration does **not** assume
**Model A** (symlink-based release switching) from
`04-wordpress-to-static-migration-master-plan.md` §7.5/§18. Symlink support,
custom-primary-docroot support, and `rsync` availability are all treated as
**unverified, non-required capabilities** — they are not blockers, because the
architecture below does not depend on them.

**Chosen safe-fallback architecture:**
1. Deploy the approved static build directly into the existing `/public_html`
   via SSH/SFTP, once a dedicated, authorized deploy key (e.g.
   `bonafide-git-deploy`, following the proven pattern above) has been created
   — creating/authorizing that key is a credential/permission action requiring
   its own separate, explicit Žaneta approval per `AGENTS.md` and is **not**
   authorized by this Block.
2. If SSH is not enabled/authorized by the time of deployment, fall back to
   the cPanel File Manager for the static-file upload.
3. Retain the current WordPress installation underneath `/public_html` as the
   rollback copy; its retirement is a separate, later, explicitly-approved
   decision (not this Block's).
4. PHP remains available on the hosting account. The static production site
   itself has no PHP dependency; the retained WordPress rollback copy can
   continue to depend on PHP. Per
   `04-wordpress-to-static-migration-master-plan.md:764`, PHP must remain
   available after cutover for that rollback copy regardless of the D11
   hosted-form decision.

### What remains for a later Block (not a Stage 1 blocker)
Creating and authorizing the actual SSH deploy key, and executing the first
deployment, are separate, explicitly-gated actions for a future Block — they
do not block recording this architecture decision now. No hosting
configuration, SSH key, or `.htaccess` setting was created, imported,
authorized, enabled, or otherwise changed by this Block.

---

## I1 — Unknown redirect destinations (RESOLVED)

### The 15 items requiring live inspection
Per `04-wordpress-to-static-migration-master-plan.md` §7.7 (I1), corroborated by
the full cross-origin redirect list in
`03-products-products-2-forensic-seo-preservation.md:649`:
`/To`, `/roots/`, `/where-to-refill-your-`, `/blog-new/`, `/collections/`,
`/sustainability/`, `/copyright-notice/`, `/kegging-service/` (+ `http://` and
`www.` variants), `/best-coffee-creamers/`, `/best-nitro-cold-brew-coffee-maker/`,
`/author/raul/`, `/cold-brew-coffee-tap-future-serve/`, `/contact-email/`,
`/collections-nitro-coffee/`,
`/healthy-benefits-drinking-nitro-coffee-nitro-coffee-health-benefits/`.

This session's own outbound access to `bonafidenitro.com` remains blocked at
this environment's egress proxy (unchanged from prior sessions), so the check
below was run by Žaneta directly and posted as operator evidence
([5853636069](https://github.com/bonafide-nitro/bonafide-website/issues/19#issuecomment-5853636069)),
per the recommended next action from the prior correction round.

### Operator evidence (2026-09-27, Issue #19) — 17 tested URL variants
**Direct one-hop HTTPS → HTTP homepage** (`http://bonafidenitro.com/` → 200 OK):
`/To`, `/roots/`, `/where-to-refill-your-`, `/blog-new/`, `/collections/`,
`/sustainability/`, `/copyright-notice/`, `/kegging-service/`,
`/best-coffee-creamers/`, `/best-nitro-cold-brew-coffee-maker/`, `/author/raul/`,
`/cold-brew-coffee-tap-future-serve/`, `/contact-email/` (13 URLs).

**Two-hop variants**, same final destination (`http://bonafidenitro.com/` → 200):
`https://www.bonafidenitro.com/where-to-refill-your-`,
`http://bonafidenitro.com/where-to-refill-your-`,
`https://www.bonafidenitro.com/kegging-service/`,
`http://bonafidenitro.com/kegging-service/` — each: 301 → canonical
`https://bonafidenitro.com/...` → 301 → `http://bonafidenitro.com` → 200 (4 URLs).

Total: **17 tested legacy URL variants resolve internally to the HTTP homepage**,
with no infinite redirect loop observed.

**Confirmed external redirect:** `https://bonafidenitro.com/collections-nitro-coffee/`
→ 301 → `https://www.nitrocoffee.store/collections/nitro-coffee` → 200. This
matches the previously documented legitimate Simple 301 Redirects rule for that
path.

(`/healthy-benefits-drinking-nitro-coffee-nitro-coffee-health-benefits/`, added to
this checklist in a prior correction round, was not separately called out in the
operator's tested-URL list; it falls under the same homepage-redirect pattern as
the other legacy paths above and should be confirmed individually before the
redirect register in `04-wordpress-to-static-migration-master-plan.md` §7.7 is
finalized.)

### Classification and Stage 1 conclusion
- `/collections-nitro-coffee/` is a confirmed intentional external redirect and
  must be represented explicitly in the migration redirect manifest.
- The remaining tested legacy paths currently redirect to the homepage. This
  behavior is consistent, reproducible, and not a redirect loop, but the
  HTTPS → HTTP downgrade on the homepage hop is legacy/undesirable behavior
  that must **not** be "cleaned up" casually during migration — the
  authoritative SEO evidence already documents material Google activity on the
  HTTP homepage variant. Encode these behaviors deliberately in the migration;
  any later normalization of HTTP/HTTPS or redirect chains is a separate,
  explicitly-approved SEO/optimization decision, not part of Stage 1.
- I1 is resolved on the operator evidence above. No redirects, WordPress
  settings, `.htaccess` rules, or production files were changed by this check.

---

## D5 — BookingPress usage (RESOLVED)

### Already documented (not a live check, cited for context only)
- `04-wordpress-to-static-migration-master-plan.md` line 228: "BookingPress
  generates 6 pages and parameter URLs — Decision gate — see §11."
- Lines 92-94: the plugin-driven integrations actually configured via the
  Head & Footer Code plugin are documented as GTM, Facebook Pixel, and
  Klaviyo only ("Clean... No injection") — BookingPress is a separate
  plugin/integration, not something delivered through Head & Footer Code.
- Line 734: if booking is retired, 301 the six URLs and eliminate the
  `?bpa_page=` parameter URLs; if required, embed a hosted scheduler instead.
- Line 1079 (§18, D5/I5): "Is BookingPress appointment booking still used? —
  Business — §7.4, Part G — Retire; 301 the six URLs" (a *provisional*
  recommendation, now confirmed by the operator evidence below).

### Operator evidence (2026-09-27, Issue #19)
Žaneta opened BookingPress in the live WordPress admin
([5845610071](https://github.com/bonafide-nitro/bonafide-website/issues/19#issuecomment-5845610071)):
- Total Appointments: **0**; Approved: **0**; Pending: **0**.
- Revenue: **€0.00**; Customers: **0**; Upcoming Appointments: empty.
- BookingPress menus are present (Calendar, Appointments, Payments, Customers,
  Services, Notifications, Customize, Settings) but show no usage history.

### Decision
Per the `ZANETA_DECISION — D5 RESOLVED` comment
([5853600785](https://github.com/bonafide-nitro/bonafide-website/issues/19#issuecomment-5853600785)):
- BookingPress is **not used** for Bona Fide's scheduling workflow — the
  business uses **Calendly** instead.
- BookingPress is therefore **not a required migration dependency** and must
  **not** be recreated in the static site.
- **Calendly** must be preserved/reimplemented as the scheduling integration in
  the later integrations stage.
- BookingPress itself is **not removed now** — its current WordPress
  installation must remain unchanged until forensic preservation is complete;
  removal is deferred to the authorized WordPress cleanup/security-remediation
  stage.

No WordPress plugin, setting, or content was disabled, deleted, or modified by
this Block or by the operator evidence capture.

---

## Consequence class and confirmation

- **Consequence class:** read-only external investigation plus reversible
  internal repository documentation, per Issue #19. The D1/I1/D5 evidence and
  decisions applied in this correction were captured and posted by Žaneta
  directly on Issue #19; this session did not perform any new live check
  against `bonafidenitro.com` or WordPress admin and could not have (its
  outbound egress to `bonafidenitro.com` remains blocked, and it has no
  WordPress admin or cPanel/WHM credentials).
- **Live site:** not modified. No request from this session to
  `bonafidenitro.com` reached the live domain. No hosting configuration, SSH
  key, WordPress plugin, setting, or content was created, imported, authorized,
  enabled, disabled, deleted, or otherwise changed by this Block or by the
  operator evidence capture it relies on.
- **Repository scope:** this Block only edits
  `docs/migration/06-stage1-pre-build-blockers-resolved.md`. No other file was
  changed.
- **Credentials/secrets/permissions/production/DNS/redirect/Search
  Console/WordPress/hosting actions:** none taken, none requested to be taken by
  this Block. Creating/authorizing the D1 SSH deploy key and any future D5
  BookingPress removal each remain separate, explicitly-gated actions for a
  later Block.

## Recommended next action (all open items, consolidated)

Stage 1 (D1, I1, D5, D11) is now resolved. What remains is deferred, gated
follow-up work for later Blocks, not open Stage 1 items:

1. **D1:** a later Block creates and authorizes a dedicated SSH deploy key
   (e.g. `bonafide-git-deploy`), subject to its own explicit Žaneta
   credential/permission approval, before the static build is first deployed
   into `/public_html` via SSH/SFTP (or File Manager, if SSH is not enabled by
   then).
2. **I1:** fold the confirmed redirect behavior — 17 legacy URL variants to the
   HTTP homepage, and the confirmed external 301 for
   `/collections-nitro-coffee/` — into the migration redirect manifest in
   `04-wordpress-to-static-migration-master-plan.md` §7.7 during Stage 2+
   planning, preserving the current behavior deliberately unless a separate,
   explicitly-approved SEO/optimization decision changes it. Confirm the one
   remaining checklist URL
   (`/healthy-benefits-drinking-nitro-coffee-nitro-coffee-health-benefits/`)
   individually before finalizing that manifest.
3. **D5:** preserve/reimplement Calendly as the scheduling integration in the
   later integrations stage; BookingPress is not recreated in the static site
   and its removal from WordPress is deferred to the authorized forensic
   preservation/security-remediation stage, not before.

No further action is authorized under this Block beyond recording these
resolutions. Stage 2 dispatch is a separate Block decision, not authorized here.
