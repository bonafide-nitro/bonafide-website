# Temporary contact-test cleanup and Brevo 502 diagnosis (Issue #185)

Source-only. Nothing connects to GoDaddy or Brevo until the owner runs the workflow and approves its Environment. No agent runs it.

## Situation (facts only)
The temporary endpoint folder `public_html/bf-contact-test-syDS0pTcdO8q/` could not be `rmdir`ed ("Directory not empty") after the two PHP files were removed.
One synthetic POST returned `502 {"ok":false,"error":"delivery_failed"}`. In `deploy/contact/contact-lib.php` a 502 means the handler classed the Brevo
response as `provider_rejected` (a non-2xx status below 500, other than 429, and no transport error). The exact reason is **not known**; this PR does not assume one.
PHP often writes an `error_log` into the folder of the script that logged, which *may* be what blocks `rmdir` and *may* hold the handler's status line. That is a hypothesis, to be checked by `inspect`.

## A. Cleanup — workflow `godaddy-contact-test-cleanup.yml`
`workflow_dispatch` only, `main` only, protected Environment `godaddy-contact-test-cleanup`, same pinned-host-key SSH and the same six `GODADDY_SSH_*` secrets as
`godaddy-brevo-private-setup.yml`. The remote logic is `deploy/contact/test-path-cleanup.sh` (SHA-256 pinned in the workflow, streamed over SSH, nothing uploaded or left behind).
The folder name is a hard-coded constant, not an input.

| `action` (confirm) | Effect |
| --- | --- |
| `inspect` (default; none) | Read-only. Lists the folder's **direct** occupants: sanitized name, type, mode, size, known/unknown. No contents, no descent, no webroot listing. |
| `cleanup` (`REMOVE_TEMP_TEST_FILES`) | Removes only `contact-submit.php` and `contact-lib.php` (plain files, never symlinks), then `rmdir` **only if empty**. Any other occupant → **fail closed** (exit 3), nothing else deleted, concise owner decision printed. |
| `log-status` (`APPROVE_LOG_STATUS_READ`) | See B. |

Refusals (exit 2, nothing changed): `public_html` or the folder is a symlink, or the folder does not resolve to the exact expected path. A missing folder is a clean no-op.
Never: recursive delete, other `public_html` content, WordPress, DNS, deploy, private config, network requests, email.

Setup (owner, once): Settings → Environments → new `godaddy-contact-test-cleanup`, required reviewer = owner, branch = `main`. Merging this PR does nothing by itself.

Suggested order: run `inspect` → decide → (`log-status` if you want the diagnosis, **before** any step that deletes the folder) → `cleanup`.
If `inspect` shows unknown occupants (for example `error_log`), the workflow will not delete them. Your choices: delete them yourself in cPanel File Manager after looking, or approve a follow-up Block that names them.

## B. Diagnosis of the 502
1. **Safe status from existing logs (implemented, extra approval).** `log-status` reads only `error_log` inside the test folder (a plain file, last 1 MiB) and prints
   counts of lines matching exactly `bf-contact: delivery failed (<category>, http <n>)`. `grep -o` discards every other byte, so no PII, key, body or path can be output.
   It needs `confirm=APPROVE_LOG_STATUS_READ` as well as Environment approval — that is the separate owner approval for touching a server log. If no such file exists it says so and reads nothing else.
   It cannot tell *why* Brevo refused; it gives the numeric status (for example 401/403 point to key or permission, 400 to payload/sender — to be read as hints, not conclusions).
2. **Server-side dry-run validation (proposed, NOT implemented).** A read-only `GET https://api.brevo.com/v3/account` from the server, using the key already in the private config, sends no email and
   returns only a status code. It still is a real call with the key, so it needs a separate Block, a reviewed script that prints only the numeric status, and an explicit owner approval. Not part of this PR.
3. **Owner-only fallback, no tooling.** In the Brevo dashboard check: the API key is active and not IP-restricted away from the server; the sender address/domain is validated in Senders & IP;
   the account is not suspended or awaiting transactional-email activation; recent transactional logs for the rejected attempt. Do not paste keys or message content anywhere.

No retry, no further email and no contact-form activation without separate explicit owner approval.

## Rollback
Disable the workflow or delete the Environment. The workflow only ever removes the two known files and an empty folder.
