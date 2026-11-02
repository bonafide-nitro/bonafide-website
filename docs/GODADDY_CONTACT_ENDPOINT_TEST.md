# Controlled contact-endpoint test — preparation only (Issue #183)

**Preparation only.** Nothing here has been run. No endpoint is deployed, no email is sent, no workflow is added or run, WordPress, `public_html`,
DNS, Astro and the verified private config (`~/bonafide-private/contact-config.php`, `mode = test`) are untouched.
Nobody (agent or workflow) reads, prints, stores or transmits the Brevo API key. The public form is not replaced.

## Why this plan has no new workflow
A workflow that uploads the endpoint would have to write somewhere reachable over HTTP, i.e. `public_html` or a new subdomain/DNS record.
That is exactly what this Block must not do. The safe checks (PHP lint and a handler smoke test) need no web exposure, so they run from a scratch
folder **in the server home**, started by the owner in cPanel Terminal. The only step that needs HTTP is Phase 3, behind one explicit owner approval.

## Phase 1 — lint and offline smoke (owner, cPanel Terminal; no approval beyond running it)
1. cPanel File Manager: create `~/bf-endpoint-test/` (**not** inside `public_html`). Upload `contact-submit.php`, `contact-lib.php`, `smoke-cli.php` from `deploy/contact/`.
2. `cd ~/bf-endpoint-test && chmod 700 . && chmod 600 *.php`
3. Lint: `for f in *.php; do php -l "$f"; done` — expect `No syntax errors detected` three times.
4. Smoke: `php smoke-cli.php` — expect eight `PASS` lines and `SMOKE OK (offline, no email, no network)`.
   It uses a synthetic config and a stub transport: it does **not** read the private config, open a socket, or send mail, and prints no request data.
5. Re-check the live private config without values: re-run the existing `godaddy-brevo-private-setup` workflow in `dry-run` (or `bash install-private-config.sh check`); confirm `mode` is `test`.
6. Remove `~/bf-endpoint-test/` when done (this is also the rollback for Phases 1–2).

Phases 1–2 never touch `public_html`, so no site visitor can reach these files.

## Phase 2 — read the plan, decide
Confirm in writing on the Issue that you want the HTTP test in Phase 3. If not, stop here; nothing remains on the server.

## Phase 3 — HTTP response test (the ONE owner approval point; not done by this PR)
**Approval required:** the owner explicitly approves, on GitHub, placing a temporary copy of the endpoint under `public_html`. This is the only step that changes `public_html`.

- Place `contact-submit.php` + `contact-lib.php` together in a new folder `public_html/bf-contact-test-<random 12 chars>/` (unguessable, not linked anywhere).
  Keep it for the shortest possible time. Do not overwrite or edit any existing file; WordPress is not modified.
- Origin check and rate limits stay on. `allowed_origins` is the real site origin, so test with `curl` run **on the server** in cPanel Terminal with `-H 'Origin: https://bonafidenitro.com'`.
- Response checks (synthetic data only, never real visitor data):
  - `GET` → `405`; wrong `Origin` → `403`; `Content-Type: text/plain` → `415`; invalid fields → `422`; honeypot filled → `200` and **no email**.
  - A request with a missing/placeholder config would return `503 not_configured`; the verified config should not.
- **One-message email verification (manual, never automatic):** send exactly **one** valid synthetic POST (name `Endpoint Test`, email you control, a message
  starting `ENDPOINT TEST #183`, `bf_hp` empty, `elapsed_ms` ≥ 3000). Because `mode = test`, it goes **only** to `test_recipient_email` with subject prefix `[TEST]`.
  Expect `{"ok":true}` and one email in the test inbox, `Reply-To` = the address you used, not in spam. Do not repeat the request. Any other outcome: stop, do not retry; check the category in the server error log.
  This is the only step that uses the Brevo key, and only inside the existing server-side handler.
- Immediately afterwards run the rollback below.

## Rollback (fast)
1. Delete `public_html/bf-contact-test-<random>/` (and `~/bf-endpoint-test/`). That removes the endpoint; the live site and WordPress were never changed.
2. Leave `~/bonafide-private/` as is (it holds the owner-entered key and rate-limit state). Rate-limit files hold only salted-hash timestamps and expire within an hour.
3. If the key may have been exposed, revoke it in Brevo and issue a new one (owner action).
4. Set nothing to `production`; going live is a separate later approval.

## No-logging-of-PII rules
- The handler logs only a failure category and HTTP status (`bf-contact: delivery failed (<category>, http <n>)`), never names, emails, messages, keys or provider bodies.
- Use synthetic content only. Never paste a request, response, config or key into GitHub, chat or the repo; do not add `-v` output or shell history containing values (use a file in `~/bf-endpoint-test/`, mode 600, delete it afterwards).
- No server config is copied out of the private directory.

## Not in this Block
Any workflow, deploy, public form replacement, Astro/WordPress/DNS/Vercel change, `mode = production`, real email, or Brevo contacts/lists API.
If a future Block wants an automated upload, it should reuse the pinned-host SSH pattern of `godaddy-brevo-private-setup.yml` (manual `workflow_dispatch`, `main` only,
protected Environment, fail-closed hash pins, scratch cleanup) and be approved separately.
