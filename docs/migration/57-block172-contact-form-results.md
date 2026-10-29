# Block 172: Brevo contact form (Issue #172)

Repository-only. No deployment, Vercel/GoDaddy change, DNS/SPF/DKIM change, real email, credential, sender or Brevo request. The form stays **disabled** in the default build.

## Implemented
- `/contact-bona-fide-nitro-coffee-and-tea/` form: name, validated email, optional category (consumer/retailer/distributor/co-packer), message, honeypot, privacy copy; inline accessible errors with a focusable summary, progress state, success and retry messages, text preserved on failure. URL, title, H1, canonical and indexability unchanged; scaffold marker kept.
- Build gating in `src/lib/contact-form.mjs`: disabled by default; `mock` (no network); `live` only with a same-origin path; never live when `VERCEL` is set.
- `deploy/contact/`: portable PHP handler, config template, no secrets. Validation, header-injection-safe plain-text email, origin check, honeypot + minimum-fill-time + link-stuffing drops, per-IP and global rate limits, bounded body/fields, JSON responses, 10 s timeout, safe errors, minimal logs. Brevo transactional API only.
- Operator guide: `docs/CONTACT_FORM_OPERATOR.md`.
- Tests: `tests/contact/contact-handler.test.mjs` (mock transport, PHP CLI), updated block11/block58/block6 build tests.

## Not done / needs owner
Brevo account values, verified sender, DNS authentication, GoDaddy upload, controlled live test and go-live approval. A thank-you page or CAPTCHA were not added.

Visual/behaviour was also checked with a headless browser against mock and stubbed-network live builds (validation, failure keeps text, success clears).
