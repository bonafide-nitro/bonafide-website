# BONA FIDE — PRE-BUILD MIGRATION BLOCKERS RESOLVED

**Block:** Issue #19 (Stage 1 of `docs/migration/05-execution-plan.md`)
**Scope:** Read-only investigation only. The live WordPress site was not modified.
**Relationship to existing evidence:** This report does **not** re-audit or replace
`01-pre-migration-seo-baseline.md`, `02-seo-raw-data-appendix.md`,
`03-products-products-2-forensic-seo-preservation.md`, or
`04-wordpress-to-static-migration-master-plan.md`. Per the `ZANETA_DECISION` comment
on Issue #19 (2026-09-26), those four documents remain the authoritative SEO
baseline and are not repeated here. This report only adds the Stage 1
operational-blocker findings (D1, I1, D5, D11) layered on top of that evidence,
and keeps the still-unresolved access blockers below clearly separated from the
completed SEO analysis.

## Summary

| Item | Status | Notes |
| --- | --- | --- |
| D11 — static form approach | **RESOLVED** (already-approved decision, recorded) | No live check needed |
| D1 — hosting/deployment capability | **UNRESOLVED — blocked on access** | Partial operator-confirmed facts recorded; symlink/SSH/rsync/PHP-after-cutover capability not yet confirmed |
| I1 — 15 unknown redirect destinations | **UNRESOLVED — blocked on access** | Outbound network egress to `bonafidenitro.com` is blocked from this environment |
| D5 — BookingPress usage | **UNRESOLVED — blocked on access** | Requires WordPress admin access not available to this session |

Stage 1 is therefore **partially** complete: D11 is resolved; D1, I1, and D5 remain
open pending the access described below. This is a documentation-only deliverable,
consistent with option (b) offered in the prior `NEEDS_ZANETA` comment on Issue #19
and not contradicted by the subsequent `ZANETA_DECISION`.

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

## D1 — Hosting/deployment capability (UNRESOLVED — blocked on access)

### Facts observed (operator-confirmed, per Issue #19 body)
- `bonafidenitro.com` cPanel Document Root is `/public_html`.
- The active WordPress installation is in `/public_html`.
- A backup copy of the current root `.htaccess` has been created.

### Already-documented plan (not yet confirmed against actual hosting capability)
From `04-wordpress-to-static-migration-master-plan.md` §7.5/§18:
- **Model A (preferred):** symlink-based release switching — `public_html` (or the
  vhost document root) is a symlink to a `current` directory; cutover/rollback is
  an atomic symlink flip. Requires the cPanel plan to permit a symlinked
  `public_html`/custom document root and not have "symlink protection" enabled.
- **Model A′ (fallback):** `rsync --delete` deployment into a real `public_html`
  directory. Slower (minutes, not seconds) but universally supported on shared
  cPanel hosting.

### What remains unresolved
Whether this specific GoDaddy/cPanel plan actually supports:
- symlink-based release switching / a symlinked or custom document root,
- SSH/SFTP access,
- `rsync`,
- sibling release directories,
- continued PHP availability after the static site goes live (in case a hardened
  PHP mail handler or other PHP asset is still needed).

This determination requires either direct cPanel/WHM access, a GoDaddy
support-confirmed answer, or a human operator running the checks below. This
session was given no cPanel/WHM credentials and cannot obtain or safely
provision them itself.

### Recommended next action
A human with cPanel access (or a GoDaddy support ticket) should confirm and report:
1. Whether "symlink protection" is enabled/disabled for the account, and whether
   `public_html` (or the vhost document root) can be replaced with a symlink.
2. Whether SSH/SFTP access is available and what deploy method it permits.
3. Whether `rsync` is available over that SSH/SFTP access.
4. Whether sibling directories outside `public_html` (e.g. `/home/<user>/sites/`)
   are permitted and reachable by the same account.
5. Which PHP version(s) remain available post-cutover, in case Model A′ needs a
   fallback PHP mail handler.

Once reported (in this Issue or a follow-up), this Block or a follow-up Block can
record the model decision (A vs. A′) as resolved.

---

## I1 — Unknown redirect destinations (UNRESOLVED — blocked on access)

### The 15 items requiring live inspection
Per `04-wordpress-to-static-migration-master-plan.md` §7.7 (I1), corroborated by
the full cross-origin redirect list in
`03-products-products-2-forensic-seo-preservation.md:649`, blocking:
`/To`, `/roots/`, `/where-to-refill-your-`, `/blog-new/`, `/collections/`,
`/sustainability/`, `/copyright-notice/`, `/kegging-service/` (+ `http://` and
`www.` variants), `/best-coffee-creamers/`, `/best-nitro-cold-brew-coffee-maker/`,
`/author/raul/`, `/cold-brew-coffee-tap-future-serve/`, `/contact-email/`,
`/collections-nitro-coffee/`,
`/healthy-benefits-drinking-nitro-coffee-nitro-coffee-health-benefits/`.

The master plan specifies the exact method: run `curl -I` against each URL from a
shell and record the real `Location` header, hop count, final destination, and
whether it is internal or external — noting that several may resolve to the
homepage via the "404 to Start" plugin, in which case they are not real redirects
and each needs a deliberate destination decided later.

### What was attempted, and why it could not be completed
This session attempted the required check twice, independently of the prior
session's attempt:
```
$ curl -sS -m 10 -o /dev/null -w "HTTP_STATUS:%{http_code}\n" https://bonafidenitro.com/
curl: (56) CONNECT tunnel failed, response 403
HTTP_STATUS:000
```
The environment's outbound-proxy status endpoint independently confirms this is a
network-policy denial, not a DNS or site-side failure:
```
"recentRelayFailures": [{
  "kind": "connect_rejected",
  "detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)",
  "host": "bonafidenitro.com:443"
}]
```
This is an environment/sandbox egress restriction on the Claude Cloud session, not
a fact about `bonafidenitro.com` or WordPress — the 403 occurs at the proxy before
any request reaches the live domain, so it says nothing about the redirects
themselves.

### Recommended next action
Run `curl -I` (or equivalent) against each of the 15 URLs and variants above from
a machine/session with outbound access to `bonafidenitro.com` — e.g. a human
operator's own shell, or a Claude Cloud session/environment configured with
egress allowed to this one domain — and record, per URL: HTTP status, `Location`
header(s), full hop chain, final destination, internal/external classification,
and whether the behavior looks intentional or suspicious (e.g. everything routing
through the "404 to Start" plugin). Paste the raw results into this Issue (or a
follow-up Block) so I1 can be closed out and folded into the redirect register in
`04-wordpress-to-static-migration-master-plan.md` §7.7.

---

## D5 — BookingPress usage (UNRESOLVED — blocked on access)

### Already documented (not a live check, cited for context only)
- `04-wordpress-to-static-migration-master-plan.md` line 228: "BookingPress
  generates 6 pages and parameter URLs — Decision gate — see §11."
- Line 682: BookingPress is listed among the plugin-driven integrations
  configured via the Head & Footer Code plugin.
- Line 734: if booking is retired, 301 the six URLs and eliminate the
  `?bpa_page=` parameter URLs; if required, embed a hosted scheduler instead.
- Line 1079 (§18, D5/I5): "Is BookingPress appointment booking still used? —
  Business — §7.4, Part G — Retire; 301 the six URLs" (a *provisional*
  recommendation pending confirmation, not a confirmed usage fact).

### What remains unresolved
Whether BookingPress is **actually in current use** — configured services,
existing appointments, recent or future bookings, and which pages/forms embed
it — can only be determined from WordPress admin access (the BookingPress plugin
screens: Services, Appointments/Bookings, and page/form usage). This session has
no WordPress admin credentials and no other read-only path to that data (the
public site itself is unreachable per the I1 finding above).

### Recommended next action
A human with WordPress admin access (or a time-boxed, explicitly-approved
read-only credential grant to a session) should check, inside `wp-admin`:
1. BookingPress → Services: are any services currently configured/active?
2. BookingPress → Appointments/Bookings: any bookings in the recent past or
   scheduled in the future?
3. Which pages/posts/forms embed the BookingPress shortcode or block?

Report the findings in this Issue (or a follow-up Block) so D5 can be resolved
and the retire-vs-replace decision in §7.4/§11 can be finalized.

---

## Consequence class and confirmation

- **Consequence class:** read-only external investigation plus reversible
  internal repository documentation, per Issue #19.
- **Live site:** not modified. No request to `bonafidenitro.com` reached the live
  domain — every attempt was rejected by this environment's own egress proxy
  before leaving the sandbox.
- **Repository scope:** this Block adds exactly one new file,
  `docs/migration/06-stage1-pre-build-blockers-resolved.md`. No other file was
  changed.
- **Credentials/secrets/permissions/production/DNS/redirect/Search
  Console/WordPress/hosting actions:** none taken, none requested to be taken by
  this Block.

## Recommended next action (all open items, consolidated)

1. **D1, D5:** a human operator with cPanel and WordPress-admin access answers
   the specific checks listed above and posts the results on Issue #19.
2. **I1:** a human operator (or a session/environment with egress allowed to
   `bonafidenitro.com`) runs the specified `curl -I` checks and posts the raw
   results on Issue #19.
3. Once D1/I1/D5 are answered, a follow-up Block updates this report (or opens
   Block 2) to record them as resolved, and only then does Stage 1 fully close
   ahead of Stage 2 (forensic preservation).

No further action is authorized under this Block beyond producing this report.
