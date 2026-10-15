# Owner local preview (Block 54)

A way for Žaneta to **see the current Astro website** on her own Mac. It is not a deployment:
nothing is published, no URL exists on the internet, WordPress and `bonafidenitro.com` are untouched,
and canonical URLs, `noindex` state and page content are exactly what the build produces.
**It is not production QA clearance** — strict migration QA keeps its 40 open findings.

## Why a launcher is needed
Pages use root-absolute links and assets (`/products/`, `/wp-content/...`). Opened via `file://`
(double-clicking `index.html`) styles/images/links break. The package therefore includes a one-click
launcher that serves the files at `http://127.0.0.1:8765/`, reachable only from that Mac.

## Get it (click path)
1. GitHub → repository **Actions** → **Owner local preview package** → pick the latest run
   (it runs on every PR and can be started with **Run workflow**). Check the run is green and
   that the run's commit is the one you want to look at.
2. Scroll to **Artifacts** → click `bonafide-local-preview-<commit>` (downloads a zip; sign-in to GitHub required).
3. Double-click the downloaded zip (Safari/Finder unzips it), then double-click the inner
   `bonafide-preview.zip`. You get a folder `bonafide-preview`.
4. Open it and double-click **Open-Preview.command**. First time: right-click → **Open** → **Open**
   (macOS warns about downloaded files). Terminal opens and your browser shows the site.
5. Close the Terminal window to stop. Artifacts expire after 14 days; re-run the workflow for a fresh one.

The same steps are in `READ-ME-FIRST.txt` inside the package.

## Command line alternative (developers)
```
npm ci && npm run build && npm run package:preview   # -> preview-out/bonafide-preview.zip
# or simply: npm run build && npm run preview
```

## Safety properties (verified by `tests/foundation/block54-local-preview.test.mjs`)
- Packaging refuses a `dist/` that fails the `check:artifact` preflight.
- Launcher binds `127.0.0.1` only; no network upload, no credentials, no secrets.
- Workflow has a read-only token, no environment, no hosting step.

## If a hosted private preview is wanted instead
Not provided. A private hosted/staging URL (e.g. password-protected Vercel/Cloudflare/GoDaddy staging)
would be a new external service and needs a **separate explicit Žaneta approval recorded on GitHub**
naming the provider, the (sub)domain, access control and noindex handling. Nothing here pre-approves it.

## Untested assumption
The launcher was verified here on Linux (Python server and packaging). It was not run on macOS;
it relies on tools shipped with macOS (Python 3 via Apple developer tools, else system Ruby, else Node).
