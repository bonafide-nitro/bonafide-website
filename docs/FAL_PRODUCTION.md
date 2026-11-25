# fal.ai production — Bona Fide team only (Issue #226)

Workflow: `.github/workflows/fal-production.yml` ("fal.ai production (manual, Bona Fide team only)").

## What it is

A manual-only GitHub Actions entry point for running fal.ai jobs under the **Bona Fide fal team**. It uses only the `fal-production` GitHub environment of this repository. It never uses MOLOSOC's fal key, billing, files or workflows. It does not touch the website, CI or deploy workflows.

| Guard | How |
| --- | --- |
| Manual only | Only `workflow_dispatch`: no push, PR, schedule or `@claude` trigger. |
| `main` only | Both jobs require `github.ref == 'refs/heads/main'`, so no other branch can reach the secret. |
| Minimal permissions | `permissions: {}`. No checkout and no repository write. |
| Secret handling | `FAL_KEY` is read from the `fal-production` environment and written only to a private (mode 600) header file. It is never echoed, put on a command line, or traced (`set +x`). |
| Identity | Every run calls fal's read-only Platform API `GET https://api.fal.ai/v1/account/billing`. The `username` it returns must equal `FAL_EXPECTED_ACCOUNT`. |
| MOLOSOC isolation | A run fails closed if either the expected account or the key's actual account contains `molosoc`. |
| Paid gate | The `generate` job runs only if (1) `mode = generate`, (2) `paid_confirmation` is exactly `I APPROVE A PAID FAL.AI GENERATION FOR BONA FIDE` (case-sensitive: checked in shell in both jobs, because the Actions `==` operator in `if:` ignores case), (3) this run's preflight verified the account, and (4) the `fal-production` environment approval is granted for that job. |

## Modes

### `preflight` (default, free)

1. Checks `FAL_KEY` is present. Prints only "present", never the value.
2. Checks `FAL_EXPECTED_ACCOUNT` is set.
3. Calls `GET https://api.fal.ai/v1/account/billing` with `Authorization: Key …`. This reads account data only. It is not a model call and creates no generation, upload or spend.
4. Compares the returned `username` with `FAL_EXPECTED_ACCOUNT` (ignoring case).

**Fails closed with "Identity verification incomplete"** on any of these: a missing variable, a network error, HTTP 401/403 (the key is invalid or lacks billing-read scope, i.e. fal's `BILLING`, `READONLY` or `FULL` key presets), any other non-200 response, or a response without `username`. In those cases the paid job never runs.

### `generate` (PAID)

Submits **one** job to `https://queue.fal.run/<model_endpoint>` with `input_json` as the body. It polls until `COMPLETED` (up to about 25 minutes), then fetches the result. It sends the key only to `queue.fal.run` URLs and refuses any other status/response URL. The result is saved as the run artifact `fal-result-<run id>`, which contains:

- `result.json`: fal's response, including the media URLs that fal hosts under the Bona Fide team account, and
- `request.json`: the request id and the endpoint.

The artifact is kept for 30 days.

## One-time human setup (Žaneta)

These are human-gated. No agent creates or changes them.

1. `fal-production` environment → **Variables**: add `FAL_EXPECTED_ACCOUNT` = the Bona Fide fal team username (non-secret).
2. `fal-production` environment → **Secrets**: `FAL_KEY` must be a key issued from the **Bona Fide fal team**, never the MOLOSOC team. For preflight to work, it needs billing-read scope (`BILLING`, `READONLY` or `FULL`), or a key that can both read billing and run models.
3. `fal-production` environment → **Deployment protection rules**: add required reviewers, so every job (including the paid one) waits for approval. Optionally limit deployment branches to `main`.
4. Merge this PR. The workflow can only be dispatched after it is on `main`.

## Launching a job

1. Actions → **fal.ai production (manual, Bona Fide team only)** → **Run workflow** on `main`.
2. Run `preflight` first and confirm it passes.
3. For a paid job, choose `generate`, then set:
   - `model_endpoint`, e.g. `fal-ai/flux/dev`
   - `input_json`, e.g. `{"prompt": "…"}` (must be a JSON object)
   - `paid_confirmation`: exactly `I APPROVE A PAID FAL.AI GENERATION FOR BONA FIDE`
4. Approve the `fal-production` environment for the `generate` job when asked.
5. Download the `fal-result-<run id>` artifact from the run page.

## Where results live

- **fal side:** generated media and request history stay in the Bona Fide fal team, because they are produced by the Bona Fide team's key. Fal hosts the media URLs and shows them in the Bona Fide team dashboard. Nothing is sent to MOLOSOC.
- **GitHub side:** the result JSON is a run artifact of this repository only. To keep an asset long-term (for example on the website), add it to the repo or site through a separate, approved Block.

## Not in scope for Issue #226

- No paid generation or upload was run while building this workflow.
- No site deploy, and no change to the existing CI/deploy workflows.
- No secret was created, changed or printed.
