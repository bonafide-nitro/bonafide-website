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
   then run `npm run check:private-preview -- <url1> <url2> <url3>`. It must print PASS for all of them (HTTP 401 or an https redirect to vercel.com's login/SSO endpoint). **Any FAIL or error: delete the deployment/project, do not share the link.**
5. Review while signed in to Vercel as an invited team member.

## Cleanup at cutover
Delete the Vercel project (removes all deployment URLs), disconnect the GitHub integration, remove any `PUBLIC_CONTACT_FORM_ENDPOINT` test value, and delete `vercel.json`. Real launch hosting is a separate, separately approved step.

## Making the contact form work
Superseded by Issue #172: the form no longer uses a hosted provider (Formspree is not used). The Vercel review copy can never send (a `VERCEL` build is forced to the disabled state) and must **not** be given `PUBLIC_CONTACT_FORM_*` values; set `PUBLIC_CONTACT_FORM_MODE=mock` only if you want to see the demo UI there. Live submissions run through the GoDaddy PHP + Brevo handler described in `docs/CONTACT_FORM_OPERATOR.md`.
