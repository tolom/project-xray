# Contributing to Project X-Ray

Thanks for considering a contribution.

Project X-Ray is a launch-readiness scanner for AI-built products. The project focuses on practical fragility signals, not generic code style criticism.

## Product principles

1. **Launch-readiness over abstract code quality**

   A rule should help users understand whether a product is safer to launch, hand off, or continue editing with AI agents.

2. **Evidence over certainty**

   Many findings are heuristic. A good finding shows evidence, severity, confidence, and a verification path.

3. **Small repairs over broad rewrites**

   Project X-Ray should produce repair tasks that coding agents can execute safely in narrow steps.

4. **Deterministic core first**

   The core scan path should work without an LLM API key. Optional AI-generated text may enhance the output, but it should not be required for the baseline scan.

5. **Founder-readable output**

   Reports should explain both technical risk and product impact. The user may be technical, non-technical, or somewhere in between.

## Good contribution areas

- New deterministic rules for common AI-built app fragility patterns.
- Better evidence extraction for existing rules.
- Framework-specific rule packs.
- Better report output.
- Safer repair prompt generation.
- Example reports and demo fixtures.
- UI improvements that make risks easier to understand.
- Documentation, diagrams, and launch examples.

## Rule design checklist

When adding or changing a rule, include:

- Rule name.
- Rule ID.
- Severity.
- Confidence strategy.
- Evidence files.
- Technical impact.
- Plain-language explanation.
- Product or business impact.
- Suggested action.
- Known false-positive cases.

A rule should avoid claiming certainty when it only has structural evidence.

## Severity guidance

Use these levels consistently:

- `critical` — can affect sensitive data, payments, private access, or core launch boundaries.
- `high` — can break a launch-critical flow or create expensive regressions.
- `medium` — increases maintenance risk or regression probability.
- `low` — mainly cleanup, clarity, or long-term maintainability.

## Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Before submitting changes:

```bash
npm run lint
npm run build
```

## Pull request expectations

A good PR should include:

- A short explanation of the user-facing value.
- The affected rule IDs or UI surfaces.
- Screenshots or example output when the report UI changes.
- Updated docs or examples when output semantics change.
- Notes about false positives if scanner behavior changes.

## Working with AI coding agents

AI-assisted contributions are welcome, but keep the workflow controlled:

1. Ask the agent to inspect relevant files first.
2. Give it one narrow task.
3. Avoid broad rewrites.
4. Run lint/build after the change.
5. Review user-facing copy manually.
6. Re-scan or test with example projects when possible.

Bad agent task:

```text
Refactor the whole scanner and improve all rules.
```

Good agent task:

```text
Update Rule 7 copy in `lib/xray-analyzer.ts` to clarify that oversized files are a maintainability and regression risk. Do not change scoring. Run lint and build after the change.
```

## Documentation style

Use direct, practical language.

Prefer:

```text
This file mixes route UI, access checks, and data writes. Split it before launch.
```

Avoid:

```text
This code may represent a potentially suboptimal software engineering concern.
```

## Scope boundaries

Project X-Ray is not a full security audit, a style checker, or a replacement for tests. Keep the project focused on practical fragility detection for AI-assisted product development.
