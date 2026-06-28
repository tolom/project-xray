# Project X-Ray Roadmap

Project X-Ray should evolve from a browser-first scanner into a practical operating layer for AI-assisted product development.

The product direction is:

> Scan fragile zones, explain impact, create small repair tasks, verify improvements, repeat.

## Phase 1 — Public launch foundation

Goal: make the repository understandable, trustworthy, and easy to share.

- [x] Public-facing README.
- [x] AI Project X-Ray skill.
- [x] Scoring model documentation.
- [x] Example report.
- [x] Public launch checklist.
- [x] AGENTS.md guidance.
- [x] Security policy.
- [x] Contribution guidelines.
- [x] GitHub issue and PR templates.
- [ ] Screenshots or demo GIF.
- [ ] Public demo URL in README.
- [ ] Repository topics.

## Phase 2 — Better scanner credibility

Goal: make findings easier to verify and reduce false positives.

- [ ] Add a false-positive verification state to findings.
- [ ] Show evidence snippets or safer evidence summaries.
- [ ] Add per-rule documentation.
- [ ] Add rule pack metadata.
- [ ] Add confidence explanations for each top risk.
- [ ] Add example repositories or fixtures.
- [ ] Add before/after report examples.

## Phase 3 — Agent repair workflow

Goal: make Project X-Ray useful inside real coding-agent loops.

- [ ] Export repair tasks to Markdown.
- [ ] Export repair tasks to GitHub issue format.
- [ ] Export repair tasks to `AGENTS.md` / `CLAUDE.md` style guidance.
- [ ] Generate small scoped repair prompts.
- [ ] Add re-scan comparison after fixes.
- [ ] Add task status: open, verified, accepted risk, false positive.

## Phase 4 — Stack-specific rule packs

Goal: move beyond generic fragility checks.

Priority rule packs:

1. Next.js App Router.
2. Supabase.
3. Stripe and subscriptions.
4. Firebase.
5. Auth providers.
6. AI-agent workflow smells.

See [rule-packs.md](rule-packs.md).

## Phase 5 — CLI and automation

Goal: make Project X-Ray useful outside the browser.

- [ ] CLI scanner for local repositories.
- [ ] JSON report output.
- [ ] Markdown report output.
- [ ] CI mode with configurable thresholds.
- [ ] Pull request scan mode.
- [ ] Before/after scan comparison in CI.

## Phase 6 — Production SaaS hardening

Goal: make hosted Project X-Ray safer and more scalable.

- [ ] Server-side GitHub proxy mode.
- [ ] Token handling improvements.
- [ ] Team workspaces.
- [ ] Scan history synced to user account.
- [ ] Private report sharing.
- [ ] Rule pack settings.
- [ ] Organization-level policies.

## Phase 7 — Advanced AI-agent workflows

Goal: become the quality layer for AI-built products.

- [ ] Detect risky AI-edit patterns across commits.
- [ ] Compare agent-generated changes before and after repair.
- [ ] Generate safer multi-step repair plans.
- [ ] Add project-specific rule memory.
- [ ] Add integration recipes for Claude Code, Codex, Cursor, and other coding agents.
- [ ] Add skill bundles for common audit tasks.

## Non-goals

Project X-Ray should not become:

- a generic linter;
- a broad static analysis suite;
- a full security audit platform;
- a code-style gatekeeper;
- an autonomous refactoring bot;
- a tool that requires an LLM for baseline value.

The sharp category remains:

> Launch-readiness and fragility scanning for AI-built products.
