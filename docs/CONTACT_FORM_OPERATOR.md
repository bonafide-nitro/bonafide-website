# Contact form: GoDaddy + Brevo operator guide (Issue #172)

Private operator instructions. **Nothing here has been done.** No deployment, DNS/SPF/DKIM change, Brevo request or real email was made while building this. Do not activate the form until you have the Brevo values below and approve a controlled live test.

## How it fits together
- The static Astro page shows the form. Its script POSTs JSON to a **same-origin path** (e.g. `/contact-submit.php`) on the GoDaddy host. The browser never sees a key and never calls Brevo.
- `deploy/contact/contact-submit.php` (+ `contact-lib.php`) runs on GoDaddy cPanel PHP, validates, rate-limits and sends **one transactional email** through Brevo's `POST /v3/smtp/email`. It never calls Brevo's contacts or lists APIs, so inquiries are never subscribed to marketing.
- The key and sender live in a private config file **outside the web root**. They are not in Git, the Astro build or CI.

## Private-config preparation over SSH (Issue #174, preparation only)
`deploy/contact/install-private-config.sh` prepares the private config on GoDaddy. It never touches `public_html`, WordPress, DNS, Brevo or email, makes no network request, and never prints a value. Claude has no GoDaddy access: nothing below has been run on the server.

1. On GoDaddy SSH, get the repo files to a scratch folder **outside** `public_html` (e.g. `~/bf-prep/deploy/contact/`: upload or `git clone`). Do not copy them into `public_html`.
2. Preview (default, changes nothing): `bash install-private-config.sh`
3. Apply: `bash install-private-config.sh apply`. It keeps your existing `bonafide-private/` and `ratelimit/`, tightens them to 700, copies the template to `bonafide-private/contact-config.php` **only if absent** (600, `storage_dir` filled in) and never overwrites an existing config.
4. Edit the config yourself in the cPanel File Manager editor or `nano ~/bonafide-private/contact-config.php`: `brevo_api_key`, `sender_email` (Brevo-verified), `test_recipient_email`, `ip_salt` (any long random string you make up in the editor), and `storage_dir` if your path differs. Keep `mode` on `test`. Never type these on a command line, in GitHub, or in chat.
5. Check without showing values: `bash install-private-config.sh check` lists each item as `[ok]`/`[todo]`.

Still to do afterwards, each needing a separate explicit approval: upload the endpoint to `public_html`, the live build, DNS/Brevo sender authentication, and the controlled test above.

## Build modes (public values only)
| `PUBLIC_CONTACT_FORM_MODE` | Result |
| --- | --- |
| unset (default) | Form disabled, page says it is not available and shows the email/phone. Nothing can be sent. |
| `mock` | Demo: the browser simulates success (type `MOCK_FAIL` in the message to see the failure state). No network request at all. Safe on Vercel and locally. |
| `live` + `PUBLIC_CONTACT_FORM_ENDPOINT=/contact-submit.php` | Form POSTs to that same-origin path. Only a plain path is accepted (a full URL, `//host`, `..` or query is ignored and the form stays disabled). |

A build with `VERCEL` set (the Vercel review project) is **never** live, even if both variables are set, so the review copy cannot reach the GoDaddy handler. Do not set the live variables in Vercel.

## GoDaddy setup (when approved)
1. In Brevo: create a transactional API key for this purpose only; add and **verify the sender domain** (below) and a verified sender address. Do not paste these anywhere but the server file.
2. Upload `deploy/contact/contact-submit.php` and `contact-lib.php` to the web root (e.g. `public_html/`). `contact-lib.php` refuses direct requests.
3. Create a private directory **above** `public_html`, e.g. `~/bonafide-private/` with `ratelimit/` inside (writable). Copy `contact-config.example.php` to `~/bonafide-private/contact-config.php`, fill in the values, `chmod 600`. Or set the server environment variable `BF_CONTACT_CONFIG` to another private path. Until the file exists and all values are real, the endpoint answers `503 not_configured` and the form shows a failure message.
4. `allowed_origins` must be exactly the site origin (`https://bonafidenitro.com`). Requests from any other origin get 403.
5. Build the release with `PUBLIC_CONTACT_FORM_MODE=live PUBLIC_CONTACT_FORM_ENDPOINT=/contact-submit.php` and upload the static files as usual (separate approved release step).

## Brevo sender authentication (owner action, DNS: not done here)
Add the DNS records Brevo shows under *Senders, domains & dedicated IPs → Domains* for `bonafidenitro.com`: the Brevo code (TXT), DKIM record(s), and a DMARC record. If SPF already exists, **merge** Brevo's include into the single SPF record (only one SPF TXT record may exist). Wait for Brevo to show the domain as authenticated before any test. Record changes need separate approval.

## Variables in the private config
`mode` (`test` or `production`), `brevo_api_key`, `sender_email`, `sender_name`, `recipient_email` (production: contact@bonafidenitro.com), `test_recipient_email`, `allowed_origins`, `storage_dir`, `ip_salt`, `rate_per_ip_hour` (default 5), `rate_global_hour` (default 60), `rate_max_clients` (default 5000), `min_fill_ms` (default 3000). Placeholder values starting `SET_` are treated as unconfigured.

## Controlled test, then go-live
1. Config `mode: test`: every message goes only to `test_recipient_email`, subject prefixed `[TEST]`.
2. Submit one message from the live page. Confirm: success message shown, one email arrives in the test inbox with Reply-To set to the visitor, and it is not in spam.
3. Failure checks: blank fields (inline errors), a very short message, rapid repeat sends until the limit message appears, and a submission with the honeypot filled (appears to succeed, no email). Temporarily use a wrong key to confirm the visitor sees the generic failure and their text stays.
4. Owner approves, then set `mode: production`. Send one real message to contact@bonafidenitro.com.

## Privacy and retention
- Nothing is stored on the site or in Git/CI. The only server files are rate-limit counters holding timestamps keyed by a salted hash of the visitor IP (about one hour of data: files untouched for an hour are deleted on the next submission, and the number of tracked clients is capped by `rate_max_clients`, default 5000; delete the folder contents any time).
- The server log records only a failure category and HTTP status, never names, emails, messages, keys or provider responses.
- Message content lives in the Brevo transactional log and in the receiving mailbox; set Brevo's transactional log retention to the minimum and delete old inquiry emails per your own policy. Contacts are not created in Brevo.

## Rollback
Fastest: delete or rename `contact-submit.php` (the form then shows its failure message; email/phone remain on the page), or rebuild without the live variables to restore the disabled form. Revoke the Brevo API key if it may have leaked.
