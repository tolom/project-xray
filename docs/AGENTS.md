# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project purpose

Project X-Ray is a launch-readiness and fragility scanner for AI-built or AI-assisted applications.

It should help users find structural risks before launch, especially around auth, billing, database ownership, protected routes, oversized files, repeated business logic, temporary AI patches, and high-risk coupling.

## Product principle

Project X-Ray is not a generic code-quality dashboard.

It should answer one practical question:

> What deserves review before real users depend on this AI-built product?

## Development rules

When modifying this repository:

1. Keep changes narrow and evidence-based.
2. Do not turn the scanner into a broad static-analysis platform without explicit product direction.
3. Prefer clear rule output over clever but opaque scoring.
4. Preserve the distinction between severity and confidence.
5. Avoid false certainty in user-facing report text.
6. Keep repair recommendations small enough to hand to another coding agent.
7. Run lint and build after meaningful code changes.

## Report language

Use careful language when a finding is heuristic.

Good:

> X-Ray did not find an obvious access check near these protected routes. If protection exists in middleware or a shared layout, mark this as verified.

Bad:

> Your app is definitely insecure.

## Repair prompt style

Good repair prompts should include:

- exact file or subsystem;
- narrow scope;
- what not to change;
- verification command;
- expected summary from the agent.

Avoid prompts like:

```text
Refactor the whole app and fix everything.
```

## Important files

- `app/page.tsx` — main scanner UI and orchestration.
- `lib/github.ts` — GitHub API calls and repository file selection.
- `lib/xray-analyzer.ts` — deterministic rule engine.
- `lib/scan-history.ts` — browser localStorage scan history.
- `components/` — reusable result views and UI surfaces.
- `skills/ai-project-xray/` — portable LLM skill workflow.
- `docs/scoring-model.md` — score, severity, confidence, and false-positive model.
- `docs/agent-repair-workflow.md` — recommended repair loop.
- `examples/xray-report-example.md` — sample report structure.

## Validation

Before proposing code changes as complete, run where applicable:

```bash
npm run lint
npm run build
```

If commands cannot be run, state that clearly and explain what was changed without claiming verification.
