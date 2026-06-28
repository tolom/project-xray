# Project X-Ray Public Launch Checklist

This checklist prepares Project X-Ray for a public GitHub / social / Product Hunt style launch.

## 1. Repository polish

- [ ] Replace the current README with a sharper public-facing README.
- [ ] Add screenshots or a short demo GIF.
- [ ] Add `docs/scoring-model.md`.
- [ ] Add `examples/xray-report-example.md`.
- [ ] Add `skills/ai-project-xray/SKILL.md`.
- [ ] Add `CONTRIBUTING.md`.
- [ ] Add `SECURITY.md`.
- [ ] Add topics: `ai`, `llm`, `vibe-coding`, `code-audit`, `nextjs`, `ai-agents`, `claude-code`, `codex`, `cursor`.
- [ ] Decide whether `package.json` should keep `"private": true` or become publishable.

## 2. Product message

Primary positioning:

> Project X-Ray finds fragile zones in AI-built apps before launch.

Alternative short hooks:

- You vibe-coded the app. Now scan what can break.
- Find AI debt before your users do.
- A launch-readiness scanner for AI-built products.
- Turn fragile AI-generated code into a repair plan.

## 3. Landing page

The first screen should answer:

1. What is this?
2. Who is it for?
3. What do I get after scanning?
4. Is my code stored?
5. Can I try it on a public repository?

Recommended hero copy:

```text
Project X-Ray
Find fragile zones in AI-built apps before launch.

Scan a GitHub repository for risky auth, billing, database, routing, and architecture patterns. Get a health score, top risks, and small repair prompts for your coding agent.
```

Primary CTA:

```text
Scan public repository
```

Secondary CTA:

```text
View example report
```

## 4. Demo flow

Create a clean demo path:

1. User enters a public GitHub repository URL.
2. Project X-Ray fetches relevant files.
3. User sees health score and verdict.
4. User opens top risks.
5. User exports repair tasks.
6. User copies agent prompts into Claude Code / Codex / Cursor.

## 5. Trust and safety copy

Add this visibly:

> Public repositories can be scanned without signing in. Private repository support uses GitHub OAuth. Project X-Ray does not store repository code.

Because the current browser-first design exposes the GitHub token to the browser session, keep the README security note and consider server-side proxy mode for a production SaaS.

## 6. Launch content

### GitHub tagline

```text
Find fragile zones in AI-built apps before launch.
```

### LinkedIn / X post

```text
I built Project X-Ray — a small scanner for AI-built apps.

The idea is simple:

You can build fast with Claude Code, Codex, Cursor, Grok, Lovable, Bolt, v0, etc.
But before launch, you still need to know what is fragile.

Project X-Ray scans a GitHub repo and looks for common AI-assisted development failure modes:

- auth gaps
- fragile billing/webhooks
- client-side trust issues
- database ownership risks
- oversized files
- mixed responsibilities
- repeated business logic
- TODO/HACK production smells

It returns a health score, top risks, and small repair prompts you can give back to your coding agent.
```

### Reddit / Hacker News angle

```text
I made a browser-first scanner for fragile AI-built apps
```

Keep the post technical and avoid over-selling.

## 7. Near-term roadmap

- [ ] Add server-side GitHub proxy mode.
- [ ] Add CLI mode.
- [ ] Add repo comparison mode: before/after AI edits.
- [ ] Add framework-specific rule packs: Next.js, Supabase, Stripe, Firebase.
- [ ] Add `AGENTS.md` / `CLAUDE.md` repair task export.
- [ ] Add false-positive verification workflow.
- [ ] Add sample intentionally-fragile repository for demos.

## 8. What not to do yet

- Do not overbuild team accounts before there is audience traction.
- Do not claim it is a full security scanner.
- Do not hide heuristic limitations.
- Do not make Grok/xAI required for core value.
- Do not position it as generic code quality analysis. The sharp category is AI-built product fragility.
