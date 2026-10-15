# Block 58 — Contact and booking release-safety (Issue #133)

Repository-only. No provider chosen, no endpoint or Calendly URL invented, no credential, no external request, no deployment, no WordPress/hosting/DNS/redirect/GSC action, no SEO metadata change. Source code was inspected and **no defect was found**, so only regression coverage and this checklist were added.

## Gap found
Existing tests (Blocks 11, 12) proved the resolvers and the **unconfigured** built HTML only. Nothing built the site with a value set, so these were untested in built output: a valid value yielding exactly the expected action/link, invalid values (http, `javascript:`, credentials, lookalike hosts, bare `calendly.com/`) producing no destination in HTML, and one route's setting never enabling the other.

## Added: `tests/foundation/block58-contact-booking-release-safety.test.mjs`
Builds into a temp dir (own `--outDir`, `dist/` untouched) with controlled `PUBLIC_*` values and asserts on built HTML. Fixtures are synthetic (`forms.example.test`, `calendly.com/example-team/synthetic-intro`); no network.
- **Unset:** form has no `action`, fieldset `disabled`, status notice, mailto/tel usable; booking has no Calendly reference, no external link, `aria-disabled` label plus contact link.
- **Invalid (5 pairs):** same disabled output, no credential or destination text emitted.
- **Valid synthetic:** exactly one POST `action` equal to the fixture, form enabled, no `formaction`, unavailable notice gone, mailto/tel still present; booking has exactly one plain external link (`rel="noopener noreferrer"`), no script/iframe.
- **Isolation:** setting one variable never enables the other route.
- **Route contracts in every case:** booking stays `noindex`, self-canonical and out of the sitemap; contact stays indexable and self-canonical.

## Open release dependencies (NOT certified by this Block)
Build correctness is not end-to-end delivery. These remain open and strict QA blockers are untouched:
1. **Contact delivery:** no provider endpoint is approved; submission, spam handling and email arrival are unverified. The exact legacy form description and meta description are unrecovered.
2. **Booking:** no approved Calendly URL; a real booking and confirmation are unverified.
3. Redirect sources `/thank-you/`, `/my-bookings/` etc. point at `/book-appointment/`; their post-submit/booking experience is not exercised.

## Owner configuration and verification checklist (human-gated)
1. Choose and approve a form provider; obtain its public HTTPS endpoint. Do not use a secret in the variable.
2. Set `PUBLIC_CONTACT_FORM_ENDPOINT=<https endpoint>` for the release build only. An `http:`, credentialed or relative value silently builds a disabled form.
3. Set `PUBLIC_CALENDLY_URL=https://calendly.com/<account>/<event>` for the release build. Only `calendly.com` hosts with a path are accepted.
4. Build, then confirm in `dist/`: contact form has the expected `action` and no `disabled` fieldset; `/book-appointment/` has the expected link; booking is still `noindex` and absent from the sitemap.
5. Controlled live test, by a human, after approval: submit one real message and confirm email arrival and honeypot handling; make one real test booking and cancel it.
6. Only then, in a separate approved Block, may the booking scaffold marker be removed and its `qa/qa.config.json` blocker updated. The contact scaffold marker and blocker must stay until the unrecovered contact meta description is also recovered from evidence; configuring and live-testing the provider alone does not clear it.

## Results
See the READY_FOR_SANTIAGO comment on the PR.
