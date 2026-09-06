# 13 — GTM & Positioning Review

**Reviewer:** Marketing / Growth Agent  
**Date:** 2026-08-11  
**Scope:** Positioning, messaging, launch strategy, pricing, content, community

## Verdict: APPROVED with one critical timing issue

### What works

- **Positioning is differentiated and defensible.** "Work OS" vs "AI Studio" vs "chat client" — the three-way comparison is clear. The "calm work environment" brand is distinctive.
- **Target personas are specific and realistic.** Sarah (analyst), Marcus (dev-writer), Dr. Osei (researcher) represent actual professional AI users.
- **Pricing tiers** (Free/Pro/Team/Enterprise) follow standard SaaS conventions while keeping Dusk's standalone identity.
- **Content strategy** is comprehensive — 14 blog topics, demo video plan, comparison pages.

### Critical concern

**1. Launch timeline is aggressive and misses legal prerequisites.**

The GTM plan targets Product Hunt launch in Week 7. But the legal review (Review 03) flags that privacy policy, terms of service, and CLA workflow are not complete. You cannot legally ship a product to users without these.

**Recommendation:** Push public launch to Week 9-10 (2-3 weeks later). Use the extra time for:
- Week 7-8: Complete privacy policy, ToS, CLA, security policy
- Week 8: Internal alpha with 5-10 trusted users (not public beta)
- Week 9-10: Public beta (50-100 users), then Product Hunt launch

This delay is worth it. A premature launch with missing legal docs creates real liability.

### Medium concerns

- **Comparison pages are listed in the site structure but not in the launch scope.** The site plan includes `/compare/dusk-studio`, `/compare/open-webui`, `/compare/cursor` — but the GTM launch timeline doesn't allocate time to write these. They're important for SEO and conversion.

**Recommendation:** Write at least the Dusk Studio comparison page before launch. It's the highest-intent comparison (users searching for Dusk alternatives). Add it to the Week 8-9 content sprint.

- **HN/Reddit launch strategy is risky without comparison content.** If you post "Show HN: Dusk — desktop AI Work OS" without explaining how it differs from Dusk, the top comments will be "Is this just a Dusk fork?" Have the comparison content ready to address this.

- **No PRD or feature announcement template.** When you ship updates, you'll need release notes that match the brand voice. Create a template now.

### Minor concerns

- **Discord server creation is Week 4, but the GTM plan doesn't mention moderation.** A public Discord needs at least 2-3 moderators from day one. Plan this.
- **Twitter/X account:** Create the @dusk handle and start posting about the build process now (Week 1-2). Building in public creates anticipation.
- **Analytics:** PostHog is recommended. Ensure it's configured with privacy mode (no PII collection) from day one, not added later.
