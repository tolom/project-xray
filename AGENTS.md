# AGENTS.md

This file gives coding agents a small amount of repository-specific context. Keep it concise. Do not turn it into a duplicate README.

<!-- BEGIN:nextjs-agent-rules -->
## Next.js note

This project uses a modern Next.js version. APIs, conventions, and file structure may differ from older training examples. Check the installed Next.js docs and existing project patterns before changing framework-level code.
<!-- END:nextjs-agent-rules -->

## Product intent

Project X-Ray is a browser-first launch-readiness scanner for AI-built products.

It helps users find fragile zones before launch: unclear access boundaries, brittle billing flows, database ownership uncertainty, oversized files, mixed responsibilities, repeated business rules, and high-risk coupling.

## Important constraints

- Do not position Project X-Ray as a full security audit.
- Do not claim the health score guarantees production safety.
- Keep findings evidence-based and include confidence when the scanner is heuristic.
- Keep repair prompts small and file-scoped.
- Do not introduce broad rewrites unless explicitly requested.
- Preserve the browser-first privacy model unless a task explicitly asks for server-side proxy mode.

## Architecture map

- `app/page.tsx` — landing/scanner page entry.
- `components/ProjectXRayHome.tsx` — main product UI.
- `components/` — result views and reusable UI surfaces.
- `lib/github.ts` — GitHub API calls and repository file selection.
- `lib/xray-analyzer.ts` — deterministic rule engine.
- `lib/scan-history.ts` — browser localStorage scan history.
- `skills/ai-project-xray/SKILL.md` — portable LLM skill workflow.
- `docs/` — scoring, launch, and public-facing docs.
- `examples/` — example report artifacts.

## Development commands

```bash
npm install
npm run lint
npm run build
npm run dev
```

Run `npm run lint` and `npm run build` before proposing a completed change.

## Change policy

When modifying scanner behavior:

1. Keep deterministic rules deterministic.
2. Prefer explicit rule IDs and clear user-facing copy.
3. Preserve severity and confidence separation.
4. Add or update example report text when output format changes.
5. Avoid introducing an LLM dependency into the core scan path.

When modifying docs:

1. Keep the main promise sharp: fragile zones in AI-built apps before launch.
2. Prefer practical language over hype.
3. Mention limitations clearly.
4. Link to `docs/scoring-model.md` when explaining score semantics.

When modifying UI:

1. Keep the scan result understandable for non-specialist founders.
2. Show technical evidence without hiding business impact.
3. Make export and repair-task flows easy to find.

## Agent workflow

For larger tasks:

1. Inspect the relevant files first.
2. State the narrow plan.
3. Change the smallest safe surface.
4. Run or recommend lint/build verification.
5. Summarize exactly what changed and what remains.

Avoid unrelated cleanup in the same change.
