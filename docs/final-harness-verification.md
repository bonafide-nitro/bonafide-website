# Final harness verification

This file is a documentation-only final harness verification for the
Claude &lt;-&gt; Santiago/Codex harness described in `AGENTS.md`,
`docs/AGENT_WORKFLOW.md`, and `docs/HARNESS_GOLDEN_PATH.md`.

It exists to prove the automatic end-to-end loop defined in
[Issue #13](https://github.com/bonafide-nitro/bonafide-website/issues/13):

Issue opened → Claude starts automatically → `CONTEXT_RECEIPT` → one
branch/PR → `READY_FOR_SANTIAGO` → automatic Codex review → `VERIFIED`
→ automatic harness merge → `MERGED`.

This change has no production effect. It adds no code, changes no
configuration, and does not touch the live WordPress site, DNS,
redirects, Search Console, or any deployment. It is documentation only.
