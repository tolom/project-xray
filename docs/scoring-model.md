# Project X-Ray Scoring Model

Project X-Ray is a launch-readiness and fragility scanner for AI-built products.

The score is intentionally practical rather than academic. It answers one question:

> How risky is it to launch or keep editing this project with AI agents without first stabilizing the fragile areas?

## Health score

The health score ranges from `0` to `100`.

- `85-100` — Ready: no obvious launch-blocking fragility patterns were found.
- `60-84` — Caution: the project can move forward, but several areas should be reviewed before launch.
- `0-59` — High Risk: launch-critical or architecture-critical risks require repair before production use.

The score does not mean the project is bug-free. It means Project X-Ray did or did not find structural risk signals in the scanned files.

## Severity levels

### Critical

A critical issue can directly affect security, payments, private data, or core access boundaries.

Examples:

- browser-exposed secret keys;
- missing ownership checks around database updates/deletes;
- forged payment webhook risk;
- protected routes without visible access checks;
- client-side role, price, or permission mutation.

### High

A high issue can break a launch-critical flow or create expensive regressions.

Examples:

- auth and billing logic tightly coupled in one module;
- sensitive module imported across many files;
- critical external API calls without error handling;
- large AI-generated orchestration files used by core flows.

### Medium

A medium issue raises maintenance and regression risk.

Examples:

- repeated business rules;
- oversized files outside critical flows;
- mixed responsibilities in feature modules;
- unclear onboarding or post-payment paths.

### Low

A low issue is usually cleanup-oriented.

Examples:

- non-critical TODO/FIXME markers;
- unclear file boundaries;
- minor structural smells.

## Confidence

Project X-Ray distinguishes severity from confidence.

- `High confidence` — direct evidence exists in scanned code.
- `Medium confidence` — strong structural evidence exists, but manual verification is required.
- `Low confidence` — mostly path/name/pattern heuristic.

A medium-confidence critical issue should not be ignored. It means the pattern is serious enough to verify manually.

## Risk weight

Issues are weighted by:

1. Severity.
2. Confidence.
3. Critical-flow proximity.
4. Number of affected files.
5. Whether the issue appears in auth, billing, database, routes, or configuration.
6. Whether the same file triggers multiple rules.

## Top risks

Top risks are selected by combining severity and confidence.

A project with many medium issues may score worse than a project with one isolated high issue. This is intentional: AI-built projects often fail because of accumulated fragility, not a single obvious bug.

## False positives

Project X-Ray is heuristic-based. It should show evidence and recommended verification steps, not claim certainty when the scanner only sees structural signals.

Good report language:

> X-Ray did not find an obvious access check near these protected routes. If protection exists in middleware or a shared layout, mark this as verified.

Bad report language:

> Your app is definitely insecure.

## Repair priority

Recommended repair order:

1. Secrets, auth, database ownership, and payment verification.
2. Broken or unclear launch-critical user paths.
3. Coupling between auth, billing, database, and UI.
4. Oversized files and mixed responsibilities.
5. TODO/FIXME cleanup and readability improvements.

## What the score is not

The score is not:

- a full security audit;
- a substitute for tests;
- a guarantee of production safety;
- a replacement for manual architecture review;
- a benchmark of code style or developer skill.

It is a practical early-warning system for AI-assisted product development.
