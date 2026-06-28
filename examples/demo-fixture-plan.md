# Demo Fixture Plan

Project X-Ray needs a small intentionally-fragile demo repository or fixture set.

The goal is to let users understand the product without scanning a private or complex real project.

## Demo fixture goals

The fixture should show:

- a realistic AI-built product shape;
- several visible fragility patterns;
- a clear before/after improvement path;
- safe, non-sensitive example code;
- useful report output for screenshots and demos.

## Recommended demo product

Use a small SaaS-style dashboard:

```text
AI Invoice Assistant
```

Product concept:

- user signs in;
- uploads invoices;
- sees dashboard;
- has free and paid plans;
- can upgrade;
- admin can view accounts;
- app stores invoice records.

This shape naturally exercises the most important Project X-Ray checks without requiring a large fixture.

## Fixture structure

```text
examples/fragile-ai-saas/
  README.md
  app/
    dashboard/page.tsx
    admin/page.tsx
    api/billing/events/route.ts
    api/invoices/route.ts
    success/page.tsx
  components/
    BillingPanel.tsx
  lib/
    auth.ts
    billing.ts
    db.ts
    plans.ts
  package.json
```

## Intentional fragility patterns

Include examples of:

1. Large dashboard file mixing UI, data loading, account checks, and mutations.
2. Repeated plan/access checks across several files.
3. Payment event route with incomplete verification flow.
4. Database writes without an obvious ownership model.
5. Admin-looking route without nearby access evidence.
6. TODO/FIXME markers in critical product flow.
7. Shared billing module imported by many unrelated files.

Keep all examples fictional. Do not include real secrets, real credentials, real customer data, or production API keys.

## Expected scan output

The demo should produce a report similar to:

```text
Health score: 55-65
Verdict: High Risk or Caution
Top risks:
- Payment event handling needs verification review
- Large mixed-responsibility dashboard file
- Repeated plan/access logic
```

## Before/after story

The demo should support a simple narrative:

1. Scan fragile fixture.
2. Export repair tasks.
3. Apply 2-3 small improvements.
4. Re-scan.
5. Show score improvement and fewer top risks.

## Screenshots to produce

- Landing page.
- Scan input state.
- Health score result.
- Top risks panel.
- Risk-zone map.
- Exported repair prompts.

## What not to include

- Real integrations.
- Real tokens.
- Real payment setup.
- Large generated codebase.
- Overly obvious toy examples.
- Anything that distracts from the launch-readiness story.
