# Block 11 — Provider-agnostic contact form (Issue #40, Stage 7)

Repository-only. No provider chosen, purchased or configured; no endpoint, key or secret committed; no submission sent; no deployment or production/WordPress/DNS/GSC action.

## Implemented
- `/contact-bona-fide-nitro-coffee-and-tea/` now has a semantic `<form method="post">` with labelled **Name**, **Email** (`type="email"`), **Message** (all `required`) and a vendor-neutral honeypot (`bf_hp`, visually hidden, `aria-hidden`, `tabindex="-1"`, `autocomplete="off"`). It works without client-side JavaScript; no script of any kind was added.
- URL, title, H1, canonical, indexability and Organization/WebSite/WebPage/BreadcrumbList schema are unchanged. The page keeps the scaffold marker (meta description still outstanding).
- Fields: the historical CF7 field names/required-ness are not evidenced in the repository (only inquiry categories, ZIP, referral source and market as text), so per the Issue only the minimal name/email/message set is used. The former text list/ZIP sentence was replaced by a single line asking visitors to say which kind of inquiry (consumer, distributor, retailer, co-packer) they have. No consent wording, legal claims, marketing opt-ins, CAPTCHA, cookies or tracking.
- Endpoint is supplied only through the public build-time variable `PUBLIC_CONTACT_FORM_ENDPOINT`, read in `src/lib/contact-form.mjs` (`resolveContactEndpoint`).

## How a provider endpoint is supplied later
1. A human chooses/configures a hosted form provider (separate, human-gated action; not part of this Block).
2. Set `PUBLIC_CONTACT_FORM_ENDPOINT` to the provider's public **https** form URL in the build environment (e.g. `PUBLIC_CONTACT_FORM_ENDPOINT=https://… npm run build`). Public form URLs are not secrets, but nothing is committed; never put an API secret in this variable.
3. Rebuild. The form's `action` becomes that URL. If the provider needs a differently named honeypot or extra hidden field, that is a small follow-up change.
4. Remove the page's scaffold marker only after the meta description is preserved and a real end-to-end submission test (execution plan T14/step 15) is separately approved.

## Failure-safe behaviour
If the variable is unset, empty, not a valid URL, not `https:`, or contains credentials, the form renders with **no `action`**, inside a `disabled` fieldset (controls and submit are inert, so it cannot send or fall back to GET), with a `role="status"` notice pointing to the email/phone below. The build does not fail and nothing posts to an invented destination.

## Tests
`tests/foundation/block11-contact-form.test.mjs` (endpoint resolver, POST/labels/fields, disabled-without-endpoint, no scripts, SEO contracts, no committed endpoint/secret); `block6-pages.test.mjs` updated (the "no form before Stage 7" assertion became "any form is POST"; vocabulary check now case-insensitive and no longer requires the removed ZIP/market text). Verified also by building with a dummy `https://forms.example.test/...` endpoint (action present, fieldset enabled) and with an `http://` value (action absent).

## Results
`npm run build` OK; `npm run check:dist` clean; `npm test` 228/228; Python isolation suite OK; foundation QA PASS, 0 invariants, 44 migration-remaining (unchanged); strict still FAIL as before.
