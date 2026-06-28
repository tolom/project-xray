# Rule Packs

Project X-Ray should grow through focused rule packs rather than one large generic rule set.

A rule pack is a small group of deterministic checks for a specific framework, integration, or product surface.

## Why rule packs

AI-built products often fail in framework-specific ways. A generic scanner can catch broad fragility, but better value comes from rules that understand the shape of a stack.

Rule packs should be:

- deterministic by default;
- explainable;
- evidence-based;
- small enough to review;
- easy to disable or tune later;
- paired with example output.

## Candidate rule packs

### Next.js App Router

Focus:

- route boundaries;
- server/client component separation;
- server actions;
- route handlers;
- middleware/proxy usage;
- environment variable visibility;
- oversized page/layout files;
- repeated data-loading logic.

Useful checks:

- protected-looking routes without nearby access evidence;
- large `page.tsx` files mixing UI, data writes, and access checks;
- server-only logic imported into client components;
- route handlers missing explicit failure responses;
- repeated access checks across pages.

### Supabase

Focus:

- ownership boundaries;
- browser-side database access;
- RLS assumptions;
- service role usage;
- repeated policy logic in application code;
- auth and database coupling.

Useful checks:

- direct browser database writes in sensitive flows;
- update/delete operations without visible owner constraints;
- service-role-like values appearing near browser code;
- missing or unclear RLS documentation;
- duplicated user/organization filters.

### Stripe and subscriptions

Focus:

- payment event handling;
- subscription state;
- account plan transitions;
- post-payment navigation;
- retry and failure paths;
- coupling between billing and access checks.

Useful checks:

- payment event handlers without visible verification flow;
- plan changes handled too close to UI code;
- missing success/cancel/account-status pages;
- subscription state duplicated across client and server;
- billing utilities imported by many unrelated files.

### Firebase

Focus:

- client/server boundary;
- Firestore rules assumptions;
- Admin SDK placement;
- callable functions;
- auth-dependent writes;
- collection ownership model.

Useful checks:

- admin-like code near client bundles;
- direct writes without visible user or organization ownership;
- repeated collection path construction;
- missing error handling around cloud functions;
- oversized functions mixing auth, data, and notification logic.

### Auth providers

Focus:

- session checks;
- protected routes;
- user/account mapping;
- role and permission boundaries;
- callback handling;
- provider-specific assumptions.

Useful checks:

- protected-looking routes without visible session evidence;
- role or permission changes outside a server-controlled path;
- repeated `isAdmin` or plan checks;
- auth callbacks mixed with unrelated business logic;
- missing account-state pages.

## Rule pack file structure

Future rule packs can use this structure:

```text
rule-packs/
  nextjs-app-router/
    README.md
    rules.json
    examples/
  supabase/
    README.md
    rules.json
    examples/
  stripe-subscriptions/
    README.md
    rules.json
    examples/
```

## Rule schema draft

```json
{
  "id": "nextjs.large-mixed-page",
  "title": "Large page file mixes responsibilities",
  "severity": "high",
  "defaultConfidence": 0.75,
  "stack": ["nextjs"],
  "signals": [
    "page.tsx over line threshold",
    "contains UI plus data writes",
    "contains access checks"
  ],
  "impact": "Large route files are risky to edit with coding agents because unrelated concerns are coupled together.",
  "suggestedAction": "Split route UI, data loading, access checks, and mutations into separate modules."
}
```

## Prioritization

Recommended order:

1. Next.js App Router.
2. Supabase.
3. Stripe and subscriptions.
4. Firebase.
5. Auth providers.
6. AI-agent workflow rules, for example detecting code shaped by broad prompts or repeated agent patches.

## What to avoid

- Do not add vague rules that only complain about style.
- Do not add rules that require an LLM to work.
- Do not add rules that produce findings without useful evidence.
- Do not add rules that generate huge repair prompts.
- Do not combine too many frameworks into one rule pack.
