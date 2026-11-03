# One controlled contact-form test email (Issue #192)

Source-only. Nothing connects to GoDaddy or Brevo until the owner runs the workflow and approves its Environment. No agent runs it.

## What it does
Workflow `godaddy-contact-test-send.yml` (manual, `main` only, protected Environment `godaddy-contact-test-send`, same pinned-host-key SSH and `GODADDY_SSH_*` secrets as the auth check)
streams the audited script `deploy/contact/contact-test-send.sh` and `deploy/contact/contact-lib.php` (both SHA-256 pinned; the workflow stops before connecting if either pin differs).
The library travels base64 on the same SSH stdin and lives only in a private `0700` temp dir in the server home for the run; it is removed on exit. **Nothing is placed in `public_html`.**

The script sends **one** synthetic message through the real handler (`bf_handle`) using the existing `~/bonafide-private/contact-config.php`:
- It refuses unless `mode` is `test`, so the handler can only deliver to `test_recipient_email`, with a `[TEST]` subject.
- Sender data is synthetic ("Synthetic Test"); reply-to is the test inbox. Rate-limit files go to the temp dir, not the real storage dir.
- The transport is hard-capped at one Brevo call (strict HTTPS/TLS, no redirects, 5 s connect / 10 s total timeout). The response body is discarded unread.

## One-shot guard
`~/bonafide-private/contact-test-send.done` is created exclusively **before** the send. If it exists (or is a symlink) the script refuses with no request. A failed attempt also leaves the marker, so there is no retry path.
Allowing another send requires the owner to delete that one file deliberately (a separate decision).

## Output
One fixed line, e.g. `RESULT: handler_status=200 brevo_status=201 reason=sent (...)`. Reason words: `sent | provider_rejected | provider_rate_limited | provider_error | network | not_sent`.
Never printed: key, config values, addresses, message text, Brevo response body or message id, PHP errors, ssh stderr.

| Exit | Meaning |
| --- | --- |
| 0 | Brevo accepted one request. Delivery to the inbox is still for the owner to confirm by looking. |
| 2 | Refused before any request: missing/symlinked config, mode not `test`, placeholder/malformed values, marker exists, php/curl/library problem. |
| 4 | The one request was made and Brevo did not accept it (see `reason=`; the 401 causes are in `GODADDY_BREVO_AUTH_CHECK.md`). |
| 5 | Handler declined before calling Brevo, or unexpected result. |

## How the owner runs it (after merge; separate approval)
1. One-time: Settings → Environments → new `godaddy-contact-test-send`, required reviewer = owner, deployment branch = `main`. Merging the PR does nothing by itself.
2. Actions → "GoDaddy contact test send" → Run workflow (branch `main`) → `confirm` = `SEND_ONE_TEST_EMAIL`.
3. Approve the Environment. Read the single `RESULT:` line, then check the test inbox once.

## Not covered
No `public_html` change, WordPress, DNS, production mode, form activation, credential or Brevo setting change.
