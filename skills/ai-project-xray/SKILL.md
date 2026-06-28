---
name: ai-project-xray
description: Audit AI-built web applications for architectural fragility, launch-readiness risks, AI debt, unsafe coupling, missing access boundaries, and high-risk files. Use this skill when reviewing repositories created or heavily modified with LLM coding agents such as Claude Code, Codex, Cursor, Grok, Lovable, Bolt, v0, or similar tools.
---

# AI Project X-Ray Skill

## Purpose

Use this skill to inspect an AI-built or AI-assisted software project and produce a practical fragility report before launch.

The goal is not to perform a generic code review. The goal is to identify places where AI-assisted development commonly creates brittle systems:

- hidden access-control gaps;
- oversized files with too many responsibilities;
- auth, billing, database, and UI logic coupled together;
- client-side trust of sensitive values;
- unsafe payment or webhook handling;
- missing error boundaries around critical flows;
- repeated business rules that can drift apart;
- unclear onboarding, payment, and post-payment paths;
- high-risk modules imported across too many places;
- temporary patches that became production behavior.

## When to use

Use this skill when the user asks to:

- audit a repository before launch;
- check whether an AI-generated project is fragile;
- find risky areas after vibe coding;
- review a Claude Code / Codex / Cursor / Grok-built app;
- prepare a repair plan for an unstable project;
- explain technical risks in business language;
- convert scan findings into small repair tasks for an AI coding agent.

## Inputs

Prefer these inputs when available:

1. Repository URL or uploaded source archive.
2. Product type and launch status.
3. Tech stack.
4. Critical flows, for example sign-in, checkout, onboarding, admin area, file upload, CRM, lead capture, or billing.
5. Known symptoms: broken auth, weird state, payment bugs, regressions after AI edits, unclear architecture, slow changes.

If the repository is not available, ask for a folder tree, key files, or architecture summary.

## Audit procedure

### 1. Build a product map

Identify:

- app entry points;
- routes and protected pages;
- auth/session logic;
- billing/payment logic;
- database access;
- API routes/server actions;
- environment/config files;
- shared utilities;
- large components and orchestration files.

Do not start with style issues. Start with launch-critical flows.

### 2. Identify risk clusters

Group files into clusters:

- Auth;
- Billing;
- Database;
- API routes;
- UI/components;
- State management;
- Config/environment;
- Integrations;
- Other.

Pay special attention to files that belong to more than one cluster.

### 3. Run the fragility checks

Look for these risk patterns:

1. Protected route exposure.
2. Auth and billing coupling.
3. Fragile payment webhook handling.
4. Client-side mutation of roles, prices, permissions, or access.
5. Database access without obvious ownership/RLS boundary.
6. Secret or server-only value exposure to browser code.
7. Oversized files.
8. Repeated business/access logic.
9. TODO/FIXME/HACK markers in critical flows.
10. Mixed responsibilities in one module.
11. Dangerous update/delete operations without ownership checks.
12. Missing error handling around auth, payment, database, or external APIs.
13. Missing success/cancel/onboarding paths.
14. Sensitive modules with too many dependents.
15. Composite AI-chaos smell: large file + temporary fixes + mixed responsibilities + critical flow.

### 4. Score severity

Use this severity model:

- Critical: can expose data, bypass payment, leak secrets, or break core access control.
- High: can break launch-critical user flows or cause expensive production incidents.
- Medium: increases maintenance risk or regression probability.
- Low: mostly cleanup, clarity, or long-term maintainability.

Confidence levels:

- High confidence: direct code evidence.
- Medium confidence: strong structural evidence, but needs manual verification.
- Low confidence: naming/path-based heuristic only.

### 5. Produce the report

Return the report in this structure:

```markdown
# Project X-Ray Report

## Verdict

- Health score: 0-100
- Verdict: Ready / Caution / High Risk
- One-sentence summary

## Top Risks

### 1. <Risk name>
- Severity:
- Confidence:
- Evidence:
- What can break:
- Business impact:
- Recommended action:

## Risk Zones

| Zone | Files | Why it matters |
|---|---|---|

## Repair Plan

### Phase 1 — Launch blockers
- [ ] Task

### Phase 2 — Stabilization
- [ ] Task

### Phase 3 — Cleanup
- [ ] Task

## Agent Repair Prompts

Provide small, isolated prompts that can be given to a coding agent. Each prompt should touch a narrow set of files and include a verification step.
```

## Repair prompt rules

When generating prompts for a coding agent:

- keep each prompt small;
- avoid broad rewrites;
- name exact files when possible;
- include acceptance criteria;
- include commands to run after the change;
- warn when manual verification is required;
- separate auth, billing, database, and UI changes into different prompts.

Bad prompt:

```text
Refactor the whole app and fix all security issues.
```

Good prompt:

```text
Review `app/api/stripe/webhook/route.ts` and add Stripe signature verification using `stripe.webhooks.constructEvent`. Do not change unrelated billing logic. Add explicit handling for `checkout.session.completed` and `customer.subscription.deleted`. Return clear 400 responses for invalid signatures. After the change, run `npm run lint` and `npm run build`.
```

## Output tone

Be direct and practical. Avoid vague advice. Explain risks in both technical and business terms. When evidence is heuristic rather than certain, say so clearly.

## Boundaries

This skill does not replace a full security audit. It is a launch-readiness and fragility audit focused on common AI-assisted development failure modes.
