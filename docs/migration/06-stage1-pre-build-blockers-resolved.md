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
| D1 — hosting/deployment capability | **RESOLVED** (architecture decision recorded for all six `05-execution-plan.md:63-70` sub-items; two explicitly deferred by Žaneta) | Symlink, custom-primary-docroot, and cPanel Terminal are determined **not available/not assumed**; SSH/SFTP is determined **available**; rsync is **not assumed**. Static production deploys into existing `/public_html` via SSH/SFTP-or-File-Manager, with every deployment (initial and later redeploys) required to be deletion-aware, not just overlay-copy. Clean WordPress rollback copy kept isolated in a sibling, non-public location per master-plan §12.2. Sibling-directory creation and PHP version/post-cutover availability are the two remaining sub-items, **not yet operator-verified**; per Žaneta's decision, confirming both on this account is an explicit, gated prerequisite for the later deployment Block — a deliberate, recorded deferral of those two sub-items, not a Stage 1 blocker and not an unverified assumption presented as settled fact |
| I1 — 15 unknown redirect destinations | **RESOLVED** (operator curl evidence) | 17 tested legacy URL variants currently land on the HTTP homepage via the "404 to Start" behaviour (recorded as observed fact, not reproduced); `/collections-nitro-coffee/` is a confirmed external 301; no redirect loop; erroneous §7.4 URL removed from the I1 list |
| D5 — BookingPress usage | **RESOLVED** (operator dashboard evidence + decision) | BookingPress is unused (0 appointments/customers/revenue); Calendly is the actual scheduling integration |

Stage 1 is therefore **complete**: D11, D1, I1, and D5 are all resolved, using the
operator-supplied evidence recorded on Issue #19 on 2026-09-27, the deployment
decision recorded in the `CHANGES_REQUESTED` review on this PR (comment
[5853644604](https://github.com/bonafide-nitro/bonafide-website/pull/20#issuecomment-5853644604)),
confirmed by the follow-up `ZANETA_DECISION`
([5853694950](https://github.com/bonafide-nitro/bonafide-website/pull/20#issuecomment-5853694950)),
and the further `ZANETA_DECISION — RESOLVE CODEX ARCHITECTURE / I1 CONFLICT`
([5853949746](https://github.com/bonafide-nitro/bonafide-website/pull/20#issuecomment-5853949746)),
which revised the D1 rollback-isolation architecture and the I1 item scope in
response to a subsequent Codex review.
This supersedes the prior partial/documentation-only version of this report (option
(b) from the original `NEEDS_ZANETA` on Issue #19), which recorded D1/I1/D5 as
blocked on access this session did not have.

A subsequent Codex review on this PR (P1 finding, comment
[discussion_r4114574984](https://github.com/bonafide-nitro/bonafide-website/pull/20#discussion_r4114574984))
correctly noted that the D1 section stated the sibling-directory and PHP
capabilities as if verified, when neither has operator evidence behind it yet.
The D1 section below now states explicitly that sibling-directory creation and
PHP version/post-cutover availability are unverified and deferred to the later
deployment Block — the same "unverified, non-required capability" treatment
this report already applies to symlink/custom-primary-docroot/`rsync` — rather
than implying the account's support for them is established. This does not
change the chosen architecture or reopen D1's resolved status.

A further Codex review on this PR (P2 finding, comment
[discussion_r4114601599](https://github.com/bonafide-nitro/bonafide-website/pull/20#discussion_r4114601599))
correctly noted that the D5 section's citation of master-plan line 1079 as
"confirmed" selected the wrong §7.4 branch: since Calendly (not BookingPress)
is the actual, surviving scheduling workflow, the booking *function* survives
even though BookingPress itself does not, so §7.4 line 421's "booking
survives" outcome applies — a 200 `/book-appointment/` page with an embedded
scheduler and the other five URLs 301 to it — not the "retire; 301 all six to
the contact page" outcome. The D5 section and the consolidated recommended
next action below now state this explicitly. This does not change D5's
resolved status or the underlying operator evidence/decision.

A further Codex review on this PR (P1 finding, comment
[discussion_r4114666407](https://github.com/bonafide-nitro/bonafide-website/pull/20#discussion_r4114666407))
noted that `docs/migration/05-execution-plan.md:63-70` lists sibling release
directories and PHP/runtime constraints among the sub-items D1 must
determine, and that neither has operator evidence yet, so declaring D1
resolved could read as advancing past a blocking unknown. The Summary table
and D1 section below now state explicitly which of D1's six
`05-execution-plan.md:63-70` sub-items are determined now (symlink,
custom-primary-docroot, cPanel Terminal: not available/not assumed; SSH/SFTP:
available; rsync: not assumed) and which two remain intentionally deferred by
Žaneta's own decision (sibling-directory creation, PHP version/post-cutover
availability) rather than silently assumed — the same deferral Žaneta already
applied to symlink/rsync verification on this PR. This does not reopen D1's
resolved status.

A further Codex review on this PR (P2 finding, comment
[discussion_r4114666417](https://github.com/bonafide-nitro/bonafide-website/pull/20#discussion_r4114666417))
correctly noted that the report required a deletion-aware copy mechanism only
for the WordPress rollback restore (step 4 below), not for the static
production deployment itself (step 1) or later redeploys — so a redeploy that
removes or renames a page could leave the old file reachable in `/public_html`
and defeat its intended redirect/404. Step 1 and the consolidated recommended
next action below now require every static deployment, not only the
rollback restore, to be deletion-aware.

A further `CHANGES_REQUESTED` review on this PR
([5870170625](https://github.com/bonafide-nitro/bonafide-website/pull/20#issuecomment-5870170625))
recorded two live Codex findings on the current head. P1
([discussion_r4121817204](https://github.com/bonafide-nitro/bonafide-website/pull/20#discussion_r4121817204))
correctly noted that the consolidated D1 rehearsal instruction, if followed
literally before cutover, would clear the live production `/public_html`
(still running WordPress at that point) rather than rehearsing safely on
staging, as the master plan's own procedure requires
(`04-wordpress-to-static-migration-master-plan.md:786`, "Must be rehearsed
and timed on staging before cutover"). The detailed D1 step 4 and the
consolidated D1 action now state explicitly that rehearsal happens only
against a non-public staging or disposable test target, never against live
production, and that clearing/altering production is reserved for an
explicitly approved real cutover/rollback action. P2
([discussion_r4121817208](https://github.com/bonafide-nitro/bonafide-website/pull/20#issuecomment-5870170625))
correctly noted that the curl evidence alone cannot distinguish the "404 to
Start" plugin from an explicit `.htaccess` or redirect-plugin rule, so
classifying all 17 homepage-landing URLs as that plugin's behavior needed
support beyond the curl hops. The I1 classification below now cites the
combined existing read-only evidence — the verified `Simple 301 Redirects`
and `Yoast SEO Redirects` configurations and the operator's `.htaccess`
inspection, alongside the master plan's own I1/SEO-12 entries — and
attributes the classification to elimination from that combined evidence,
not to curl alone. Neither correction changes D1's or I1's resolved status
or the underlying architecture/evidence.

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

### Deployment decision (recorded per the `CHANGES_REQUESTED` review on this PR and the follow-up `ZANETA_DECISION`, not independently derived by this session)
`docs/migration/05-execution-plan.md:63-70` lists six sub-items D1 must
determine: symlink-based release switching, custom document root, SSH/SFTP,
rsync, sibling release directories, and PHP/runtime constraints. Per comment
[5853644604](https://github.com/bonafide-nitro/bonafide-website/pull/20#issuecomment-5853644604):
current GoDaddy Web Hosting (cPanel) documentation states SSH is supported and
the primary-domain document root is `/public_html`; GoDaddy documents custom
document-root changes for addon/subdomains, not the primary domain. Combined
with the operator evidence above (no confirmed symlink/custom-primary-docroot
capability, cPanel Terminal unavailable), the migration does **not** assume
**Model A** (symlink-based release switching) from
`04-wordpress-to-static-migration-master-plan.md` §7.5/§18, nor does it assume
`rsync` availability. Symlink support, custom-primary-docroot support, and
`rsync` are all treated as **unverified, non-required capabilities**.

A subsequent Codex review on this PR (P1 finding, comment
[discussion_r4114477912](https://github.com/bonafide-nitro/bonafide-website/pull/20#discussion_r4114477912))
correctly identified that the prior version of this section, which retained
WordPress underneath the same `/public_html` docroot as the static production
build, conflicted with the isolation requirement the master plan already
states in
`04-wordpress-to-static-migration-master-plan.md` §12.2 (line 766): *"Static
and WordPress live in sibling directories. WordPress has no write access to
the static docroot and vice versa."* Per the
`ZANETA_DECISION — RESOLVE CODEX ARCHITECTURE / I1 CONFLICT`
([5853949746](https://github.com/bonafide-nitro/bonafide-website/pull/20#issuecomment-5853949746)),
D1 is revised to satisfy that isolation requirement **without** assuming the
unverified symlink/`rsync`/Terminal capabilities:

**Chosen safe-fallback architecture:**
1. Static production continues to deploy into the existing, confirmed primary
   docroot `/public_html`, via SSH/SFTP once a dedicated, authorized deploy
   key (e.g. `bonafide-git-deploy`, following the proven pattern above) has
   been created — creating/authorizing that key is a credential/permission
   action requiring its own separate, explicit Žaneta approval per
   `AGENTS.md` and is **not** authorized by this Block. If SSH is not
   enabled/authorized by the time of deployment, fall back to the cPanel File
   Manager for the static-file upload. **Every static deployment — the
   initial one and every later redeploy — must clear/delete any
   destination-only file in `/public_html` that is not part of the new build
   (e.g. `rsync --delete`, or an equivalent explicit delete-then-copy step for
   SFTP/File Manager), not just overlay-copy.** Without this, a page removed
   or renamed in a later build can remain reachable at its old URL and defeat
   the redirect or 404 the migration intends for it — the same risk step 4
   below addresses for the WordPress rollback restore, applied here to
   routine static deployments.
2. The clean WordPress rollback copy is prepared and preserved **outside**
   `/public_html`, in a sibling/non-public location (e.g. the pattern in
   `04-wordpress-to-static-migration-master-plan.md:753`,
   `/home/<user>/sites/wp-clean/`, or the closest equivalent structure the
   account allows) — **not** co-located under the public static docroot. This
   satisfies the §12.2 isolation requirement without depending on symlink or
   `rsync` availability, because the rollback copy itself is what moves, not
   a live symlink target. **This session has not independently verified that
   such a sibling/non-public directory can actually be created and is
   inaccessible from the public web on this account** — no cPanel/WHM access
   and no operator evidence for it exist yet, the same evidentiary position
   this report already applies to symlink/custom-primary-docroot/`rsync`
   above. That verification is an explicit, gated prerequisite for the later
   deployment Block (see "What remains for a later Block" below), not an
   assumed fact of this decision.
3. After cutover, the current live WordPress installation's executable,
   plugin, and theme files must **not** remain publicly reachable in
   `/public_html` — retiring the live installation from `/public_html` (once
   the sibling clean copy exists) is separate, later, explicitly-approved
   work, not this Block's.
4. Rollback, if needed, is restoration of the clean sibling WordPress copy
   back into `/public_html`, using whichever supported copy mechanism is
   available at that time (SSH/SFTP or File Manager fallback — the same
   mechanisms as (1), not `rsync`, since `rsync` availability is unverified
   on this account). The authoritative Model A′ procedure
   (`04-wordpress-to-static-migration-master-plan.md:782`) performs this
   restoration with `rsync -a --delete`, whose `--delete` flag removes any
   destination-only file — meaning a route-level static file (e.g. an
   `index.html` left over from the static production build) is removed, not
   just overwritten. A copy-only SSH/SFTP-or-File-Manager restore does
   **not** do this: it can leave such static-only files in place, where they
   would continue to be served instead of the restored WordPress
   installation for that path, leaving rollback serving a mixture of both
   applications. Whichever copy mechanism is actually available at rollback
   time must therefore **first clear `/public_html` of the static
   production's files** (delete-then-copy, not overlay-copy) before copying
   the clean WordPress files in — an equivalent to `--delete` is required
   even when `rsync` itself is not. **This clearing step must never be
   rehearsed against the live production `/public_html`** — clearing or
   altering live production is reserved for an explicitly approved real
   cutover/rollback action, not a rehearsal. Before cutover, the exact
   procedure — including this clearing step — must instead be rehearsed and
   timed against a non-public staging or disposable test target, per
   `04-wordpress-to-static-migration-master-plan.md:786` ("Must be rehearsed
   and timed on staging before cutover"). The later cutover/rollback Block
   must name that staging target, rehearse and record the result/timing
   there, and only then separately seek gated approval before ever
   executing the clear-then-copy step against production.
5. PHP must remain available on the hosting account after cutover, per
   `04-wordpress-to-static-migration-master-plan.md:764` — static production
   itself has no PHP dependency; PHP is retained only because the sibling
   clean WordPress copy may need it if restored, regardless of Model A vs.
   A′ or the D11 hosted-form decision. **This session has not independently
   confirmed the PHP version currently installed on the account, nor that it
   (or a compatible version) remains enabled after cutover** — no cPanel/WHM
   access and no operator evidence for either fact exist yet. That
   confirmation is an explicit, gated prerequisite for the later deployment
   Block, not an assumed fact of this decision.

### What remains for a later Block (not a Stage 1 blocker)
Creating and authorizing the actual SSH deploy key; **confirming the sibling
clean-WordPress rollback location can be created and is inaccessible from the
public web**; **confirming the current PHP version and its continued
availability after cutover**; preparing the sibling clean-WordPress rollback
copy; retiring the live WordPress installation from `/public_html`; and
executing/rehearsing the first deployment and rollback — are all separate,
explicitly-gated actions for a future Block. They do not block recording this
architecture decision now, the same way the D11 hosted-form decision is
recorded as resolved without yet purchasing a provider. No hosting
configuration, SSH key, WordPress file, or `.htaccess` setting was created,
imported, moved, authorized, enabled, or otherwise changed by this Block.

---

## I1 — Unknown redirect destinations (RESOLVED)

### The 15 items requiring live inspection
Per `04-wordpress-to-static-migration-master-plan.md` §7.7 (I1) line 449,
corroborated by the full cross-origin redirect list in
`03-products-products-2-forensic-seo-preservation.md:649`:
`/To`, `/roots/`, `/where-to-refill-your-`, `/blog-new/`, `/collections/`,
`/sustainability/`, `/copyright-notice/`, `/kegging-service/` (+ `http://` and
`www.` variants), `/best-coffee-creamers/`, `/best-nitro-cold-brew-coffee-maker/`,
`/author/raul/`, `/cold-brew-coffee-tap-future-serve/`, `/contact-email/`,
`/collections-nitro-coffee/`.

**Correction (per the `ZANETA_DECISION — RESOLVE CODEX ARCHITECTURE / I1
CONFLICT`,
[5853949746](https://github.com/bonafide-nitro/bonafide-website/pull/20#issuecomment-5853949746)):**
a prior correction round erroneously added
`/healthy-benefits-drinking-nitro-coffee-nitro-coffee-health-benefits/` to
this I1 list. That URL is not one of I1's 15 items — the master plan's own
§7.7 I1 entry (line 449) does not name it. It belongs to §7.4 line 417
instead, which already gives it an explicit initial-migration destination:
`/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/` ("near-miss
slug, 2 impr"). It has been removed from I1 and needs no additional curl
evidence to close I1; its §7.4 mapping is unaffected by this Block.

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

### Classification and Stage 1 conclusion
- `/collections-nitro-coffee/` is a confirmed intentional external redirect and
  must be represented explicitly in the migration redirect manifest.
- The remaining 17 tested legacy URL variants currently land on
  `http://bonafidenitro.com/` (200), consistently and reproducibly, with no
  redirect loop. The curl evidence alone establishes only that destination
  and hop count — it cannot by itself distinguish the `404 to Start` plugin
  from an explicit `.htaccess` rule or another redirect plugin. The source
  classification instead rests on the combined existing read-only evidence:
  the verified `Simple 301 Redirects` configuration, which contains only 11
  clean rules, all `/services/*` plus `/collections-nitro-coffee/` →
  `nitrocoffee.store` (`04-wordpress-to-static-migration-master-plan.md`
  line 95); `Yoast SEO Redirects`, documented empty (line 96); operator
  inspection of the live root `.htaccess`, which found only the normal
  WordPress rewrite sections plus WP-Optimize gzip rules, with no explicit
  legacy-path redirect rule for any of these 17 URLs (recorded in the
  `CHANGES_REQUESTED` review,
  [5870170625](https://github.com/bonafide-nitro/bonafide-website/pull/20#issuecomment-5870170625));
  and the master plan's own I1 entry (§7.7 line 449: *"Several may be going
  to the homepage via the '404 to Start' plugin — if so, they are not real
  redirects and each needs a deliberate destination"*) and SEO-12 (§6.2 line
  329: *"The '404 to Start' homepage-redirect behaviour is not
  reproduced"*). None of the other documented redirect sources
  (`Simple 301 Redirects`, Yoast, `.htaccess`) accounts for these 17 paths,
  so by elimination from that combined evidence the `404 to Start` plugin is
  the only remaining documented mechanism that explains the observed
  homepage landings — not a set of intentional redirects. **Record it here
  as observed current behavior, classified by elimination from the recorded
  redirect sources rather than from the curl evidence alone — it is not the
  target migration architecture and must not be reproduced as-is.**
- Per §7.5 (line 425-426), the migration's actual protocol/host
  canonicalisation rule is: `http://` → apex `https://` in a single hop, and
  `www.` → apex `https://` in a single hop. For these 17 legacy paths, the
  final redirect register (built in Stage 2+ planning, not this Block) must
  therefore choose a deliberate final destination for each — reachable from
  apex HTTPS in the required single hop — rather than preserving today's
  HTTPS→HTTP homepage downgrade. The evidence above (which destination each
  path currently reaches) is exactly the input that final mapping decision
  needs; it does not by itself decide the destination.
- I1 is resolved: the previously-unknown current destinations are now known
  and evidenced. Resolving I1 does not mean the final migration mapping
  reproduces today's behavior verbatim — that is a separate §7.5/SEO-12
  mapping decision for Stage 2+. No redirects, WordPress settings,
  `.htaccess` rules, or production files were changed by this check.

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
- §7.4 line 421 states the same fork explicitly for the six booking URLs
  (`/book-appointment/`, `/my-bookings/`, `/cancel-appointment/`,
  `/cancel-payment/`, `/appointment-cancellation-confirmation/`,
  `/thank-you/`): "If booking is retired → 301 all six to
  `/contact-bona-fide-nitro-coffee-and-tea/`. If booking survives → a single
  static `/book-appointment/` at 200 with an embedded scheduler, and the other
  five 301 to it."
- Line 1079 (§18, D5/I5), "Is BookingPress appointment booking still used? —
  Business — §7.4, Part G — Retire; 301 the six URLs," is only a *provisional*
  shorthand recommendation made before the operator evidence below existed. The
  operator evidence and decision below confirm BookingPress-the-plugin is
  unused and is not recreated, but the booking *function* survives via
  Calendly — so the applicable outcome is §7.4 line 421's "booking survives"
  branch, not the "booking is retired" branch line 1079 shorthand-names. The
  six-URL 301-to-contact-page treatment does **not** apply.

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
  enabled, disabled, deleted, moved, or otherwise changed by this Block or by
  the operator evidence capture it relies on.
- **Repository scope:** this Block only edits
  `docs/migration/06-stage1-pre-build-blockers-resolved.md`. No other file was
  changed.
- **Credentials/secrets/permissions/production/DNS/redirect/Search
  Console/WordPress/hosting actions:** none taken, none requested to be taken by
  this Block. Creating/authorizing the D1 SSH deploy key, preparing the D1
  sibling clean-WordPress rollback copy, and any future D5 BookingPress
  removal each remain separate, explicitly-gated actions for a later Block.

## Recommended next action (all open items, consolidated)

Stage 1 (D1, I1, D5, D11) is now resolved. What remains is deferred, gated
follow-up work for later Blocks, not open Stage 1 items:

1. **D1:** a later Block (a) creates and authorizes a dedicated SSH deploy key
   (e.g. `bonafide-git-deploy`), subject to its own explicit Žaneta
   credential/permission approval, (b) prepares the clean WordPress rollback
   copy in its sibling, non-public location and, **on a non-public staging
   or disposable test target — never against the live production
   `/public_html`** — rehearses and times the clear-then-copy
   SSH/SFTP-or-File-Manager restore procedure (first clearing the target of
   the static production's files, delete-then-copy, not overlay-copy,
   before copying the clean WordPress files in — the same effect
   `rsync --delete` gives Model A′), per
   `04-wordpress-to-static-migration-master-plan.md` §12.2/§12.3 (line 786:
   "Must be rehearsed and timed on staging before cutover"); clearing or
   altering live production `/public_html` is reserved for an explicitly
   approved real cutover/rollback action, and that later Block must name the
   staging target, record the rehearsal result/timing there, then
   separately gate any production execution, (c) once that sibling copy
   exists, retires the live
   WordPress installation's executable, plugin, and theme files from
   `/public_html` so they are no longer publicly reachable, per the detailed
   D1 architecture above, and only then (d) deploys the static build into
   `/public_html` via SSH/SFTP (or File Manager, if SSH is not enabled by
   then), clearing/deleting any destination-only file left over from the
   previous build (not just overlay-copy) — and repeats that same
   deletion-aware step on every later redeploy, not only at rollback.
2. **I1:** the final redirect register (Stage 2+ planning) must assign each of
   the 17 tested legacy URL variants a deliberate final destination reachable
   from apex HTTPS in a single hop, per §7.5/SEO-12 — not the observed
   HTTPS→HTTP homepage downgrade recorded above. Keep the confirmed external
   redirect for `/collections-nitro-coffee/` →
   `https://www.nitrocoffee.store/collections/nitro-coffee`. The
   `/healthy-benefits-...-health-benefits/` URL is out of I1's scope; its
   §7.4 destination (`/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/`)
   is unaffected and needs no further action here.
3. **D5:** preserve/reimplement Calendly as the scheduling integration in the
   later integrations stage; BookingPress is not recreated in the static site
   and its removal from WordPress is deferred to the authorized forensic
   preservation/security-remediation stage, not before. Because booking as a
   *function* survives (via Calendly), the redirect register (Stage 2+) must
   apply §7.4 line 421's "booking survives" branch to the six booking URLs:
   `/book-appointment/` remains a static 200 page with the embedded Calendly
   scheduler, and the other five (`/my-bookings/`, `/cancel-appointment/`,
   `/cancel-payment/`, `/appointment-cancellation-confirmation/`,
   `/thank-you/`) 301 to it — **not** the "retire; 301 all six to the contact
   page" branch, which applies only if booking itself were retired.

No further action is authorized under this Block beyond recording these
resolutions. Stage 2 dispatch is a separate Block decision, not authorized here.
