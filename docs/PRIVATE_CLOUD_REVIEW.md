# Private cloud review (Issue #170)

Goal: review the Astro site in a browser that updates after each merge to `main`, **visible only to logged-in people you allow**. `bonafidenitro.com` and WordPress are not touched. This repository change does **not** connect Vercel or deploy anything.

`robots.txt` / `noindex` (also sent as a header by `vercel.json`) are **not** access control. Only Vercel Authentication is.

## Owner setup (one time, about 10 minutes)
Order matters: protection first, code second.
1. Vercel: create a **new empty project** (do not import the repo yet). Name it e.g. `bonafide-review`. No custom domain.
2. Project **Settings → Deployment Protection → Vercel Authentication → "All Deployments"** (not "Standard Protection"). Save. Leave "Protection Bypass", "Shareable Links" and "Deployment Protection Exceptions" **off**.
3. Settings → Git: connect `bonafide-nitro/bonafide-website`, Production Branch `main`. The framework, build and output settings come from `vercel.json`. Add no environment variables yet (the contact form stays disabled).
4. After the first deployment, open **every** URL below in a private/incognito window and confirm a Vercel login wall:
   - the default `*.vercel.app` project URL
   - a preview (branch) URL
   - a per-commit URL
   then run `npm run check:private-preview -- <url1> <url2> <url3>`. It must print PASS for all of them (HTTP 401 or redirect to vercel.com). **Any FAIL or error: delete the deployment/project, do not share the link.**
5. Review while signed in to Vercel as an invited team member.

## Cleanup at cutover
Delete the Vercel project (removes all deployment URLs), disconnect the GitHub integration, remove any `PUBLIC_CONTACT_FORM_ENDPOINT` test value, and delete `vercel.json`. Real launch hosting is a separate, separately approved step.

## Making the contact form work
What the code needs: one public **https** form URL in `PUBLIC_CONTACT_FORM_ENDPOINT` at build time (`src/lib/contact-form.mjs`). The form POSTs `name`, `email`, `message` and a hidden honeypot `bf_hp`. Without the value it stays disabled (covered by `block58` tests). No endpoint is invented here.

Proposed provider (needs your approval): **Formspree**. Delivers each submission by email, has built-in spam filtering plus honeypot support, and has no secret in the page (the form URL is public). Create **two forms**:
| Form | Recipient | Vercel env var scope |
| --- | --- | --- |
| Bona Fide TEST | your own address | Preview (and Production while the review project is private) |
| Bona Fide PROD | contact@bonafidenitro.com | the real launch build only |
Setup per form: set the recipient, turn on spam filtering, set the honeypot field name to `bf_hp` (or allow us to rename it to Formspree's `_gotcha` in a follow-up), set the success redirect to a thank-you location.

Not done in this PR (each needs a decision): a thank-you / failure page (a new indexable-surface page, so it needs its own Block; with no JavaScript the provider's own confirmation page shows today), and any real submission test, which needs the endpoint, an approved TEST recipient and your go-ahead.

**Owner decision needed:** approve Formspree (or name another provider).
