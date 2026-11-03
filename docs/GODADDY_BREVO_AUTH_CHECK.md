# Read-only Brevo API authentication check (Issue #187)

Source-only. Nothing connects to GoDaddy or Brevo until the owner runs the workflow and approves its Environment. No agent runs it.

## What it does
Workflow `godaddy-brevo-auth-check.yml` (manual, `main` only, protected Environment `godaddy-brevo-auth-check`, same pinned-host-key SSH and `GODADDY_SSH_*` secrets as the other GoDaddy workflows)
streams the audited script `deploy/contact/brevo-auth-check.sh` (SHA-256 pinned; nothing is uploaded or left on the server). The script makes **one** `GET https://api.brevo.com/v3/account`
with the key already in `~/bonafide-private/contact-config.php` (strict HTTPS/TLS verification, no redirects, 5 s connect / 10 s total timeout).

Output is only a numeric HTTP status and a fixed classification. The response body, key, config values, PHP errors and ssh stderr are never printed.

| Result | Meaning | Run status |
| --- | --- | --- |
| `http_status=200 authenticated` | The API key authenticates. **This does NOT verify the sender address/domain or transactional-send permission.** | success |
| `401 unauthorized` / `403 forbidden` + `detail=<word>` | Brevo denied the call. `detail` is chosen in memory from Brevo's error body (never printed); see the table below. | failed |
| other / `transport_error` | Investigate (network, TLS, Brevo outage, unexpected status). | failed |
| `REFUSED` | Fail-closed before any request: config missing/symlink/not an array, `mode` not `test`, key missing/placeholder/malformed, PHP curl missing. | failed |

A failed run is deliberate so the result is visible; it never means anything was sent or changed. No email is sent, nothing is written, no key is moved, printed, created or revoked.

## Reading `detail=` (Issue #189)
Brevo returns 401 both for an unknown key and for a call from an IP that is not on the account's Authorized IPs list, so a rotated key cannot fix the latter. The body (and any IP in it) is never printed.

| `detail=` | Meaning | Owner action in the Brevo dashboard |
| --- | --- | --- |
| `ip_not_authorized` | The key is fine but the server's outbound IP is not allowed. | Security → Authorised IPs: deactivate IP blocking, or add the GoDaddy server's outbound IP. Do not rotate keys. |
| `key_not_recognised` | Brevo does not know this key. | Confirm the file holds an API v3 key from the same account (not a deleted/other-account key); re-save it in the private config. |
| `account_restricted` | Account not activated, suspended or lacks permission. | Complete account activation / contact Brevo support. |
| `unauthorized_unclassified` | Denied, but the body matched no known pattern. | Report this exact line; do not rotate keys blindly. |

## How the owner runs it
1. One-time: Settings → Environments → new `godaddy-brevo-auth-check`, required reviewer = owner, deployment branch = `main`. Merging the PR does nothing by itself.
2. Actions → "GoDaddy Brevo auth check" → Run workflow (branch `main`) → `confirm` = `VERIFY_BREVO_AUTH`.
3. Approve the Environment. Read the single `RESULT:` line. Paste nothing else anywhere.

If 200: only API auth is proven; a real send may still fail on sender validation, so any later send test needs its own separate approval. If 401: the file does not hold a valid key; re-save the new key in the private config and rerun. The old key stays active until the owner decides otherwise.

## Temporary public test folder (documentation only)
`public_html/bf-contact-test-syDS0pTcdO8q/` still exists. After the known PHP files were removed, inspect run 41619389077 showed it contains only **`error_log` (85 bytes)**, an unknown-to-the-cleanup occupant, which is why `cleanup` fails closed on `rmdir`.
This PR does **not** read, delete or move it and does not remove the folder. Simple follow-up options, each needing separate explicit owner approval: owner deletes `error_log` and the empty folder in cPanel File Manager, or a new Block names that exact file for removal.
The folder is publicly reachable by path but holds no PHP endpoint; the contact form remains inactive.

## Not in this PR
No email send, no contact-form activation, no WordPress/`public_html`/DNS change, no touching either Brevo key, no log read/delete, no migration work.

## Rollback
Disable the workflow or delete the Environment. The script only reads one local file and issues one GET.
