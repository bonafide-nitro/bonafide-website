# One controlled contact-form test email (Issue #192)

Source-only until merged. Nothing connects to GoDaddy or Brevo until the owner runs the workflow and approves its Environment.

## Why this way
Brevo authentication is proven (auth-check run 41727712767: `http_status=200`). The remaining check is a real send through the real handler.
Earlier plans needed a temporary copy of the endpoint in `public_html` plus cPanel Terminal commands. This workflow avoids both: it runs the same
handler (`deploy/contact/contact-lib.php`, `bf_handle`) **on the server, from the command line**, over the same pinned-host SSH as the other GoDaddy workflows.
Nothing is placed in `public_html`, WordPress is untouched, and no visitor can reach anything.

## What it does
Workflow `godaddy-contact-test-send.yml` (manual, `main` only, protected Environment `godaddy-contact-test-send`, confirm `SEND_ONE_TEST_EMAIL`):
1. Verifies the SHA-256 pins of `contact-test-send.sh` and `contact-lib.php`, and the server's pinned host key.
2. Streams both over SSH. They run from a private temp dir in the server home (mode 700) that is deleted when the run ends.
3. The script refuses, **before any request**, unless the private config is a readable plain file, `mode` is `test`, values are not placeholders,
   and no earlier attempt marker exists.
4. Writes the one-shot marker `~/bonafide-private/contact-test-send.attempted` (a timestamp only), **then** sends exactly one synthetic message:
   name `Endpoint Test`, message starting `ENDPOINT TEST #192`, subject `[TEST] Website inquiry (consumer) from Endpoint Test`,
   to `test_recipient_email` only, with reply-to set to that same test inbox. Real rate-limit state is not touched.
5. Prints one line. Never the key, config values, addresses, message text, Brevo's reply or message ID.

| Result | Meaning | Owner action |
| --- | --- | --- |
| `outcome=sent` (exit 0) | Brevo accepted exactly one email. | Check the test inbox (and spam). Confirm subject `[TEST]…` and that Reply-To is the test inbox. |
| `reason=sender_not_valid` | Brevo refused the sender address. | Brevo → Settings → Senders, domains, IPs: the `sender_email` in the private config must be a verified sender on `bonafidenitro.com`. |
| `reason=ip_not_authorized` | Server IP blocked again (for example GoDaddy moved the site). | Brevo → Settings → Security → Authorized IPs → Unauthorized tab → approve the GoDaddy IP. |
| `reason=key_not_recognised` / `account_restricted` | See `docs/GODADDY_BREVO_AUTH_CHECK.md`. | As described there. |
| `reason=payload_rejected` / `unclassified` / `transport_error` | Unexpected. | Report the RESULT line only. |
| `REFUSED` | A precondition failed; no request was made. | Read the reason in the line. |

Every failure is final for this run: the marker is already written, so **nothing is retried**. A second run prints
`REFUSED: ... one-shot guard`. Allowing another attempt is a separate owner decision (remove the marker in cPanel File Manager, or a follow-up Block).

## How the owner runs it
1. Merge happens through the normal harness after review. Merging sends nothing.
2. Actions → "GoDaddy contact test send" → Run workflow (branch `main`) → `confirm` = `SEND_ONE_TEST_EMAIL`.
3. Approve the `godaddy-contact-test-send` Environment if prompted (recommended once: Settings → Environments → required reviewer = owner, branch = `main`).
4. Read the single `RESULT:` line, then check the test inbox.

## Not in this Block
No `public_html`, WordPress, DNS, `mode = production`, public form activation, credential or Brevo setting change, and no repeat sends.
Going live (switching the form on the real site, `mode = production`) is a separate later approval.

## Rollback
Disable the workflow or delete the Environment. The run leaves only the marker file (a timestamp) in `~/bonafide-private/`.
