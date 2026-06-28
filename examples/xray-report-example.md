# Example Project X-Ray Report

This is an illustrative report format for Project X-Ray. The findings below are examples and do not describe a real repository.

## Verdict

- Health score: `58 / 100`
- Verdict: `High Risk`
- Summary: The project has promising product structure, but several launch-critical flows are fragile: authentication, payment handling, and database ownership checks need review before production launch.

## Top Risks

### 1. Payment webhook can be forged

- Severity: Critical
- Confidence: High
- Evidence: `app/api/stripe/webhook/route.ts`
- What can break: The application may accept fake payment events if Stripe signature verification is missing.
- Business impact: Users could receive paid access without paying, or cancellations may not deactivate access correctly.
- Recommended action: Verify webhook signatures with `stripe.webhooks.constructEvent` and explicitly handle successful payment and subscription cancellation events.

### 2. Client-side role mutation

- Severity: Critical
- Confidence: Medium
- Evidence: `components/AdminPanel.tsx`, `lib/users.ts`
- What can break: User roles or permissions may be changed from browser-controlled code.
- Business impact: A user may grant themselves access to admin or paid features.
- Recommended action: Move all role and permission mutations to server-side code. Validate the current user and ownership before applying changes.

### 3. Large mixed-responsibility dashboard file

- Severity: High
- Confidence: High
- Evidence: `app/dashboard/page.tsx`
- What can break: One file controls UI, state, billing checks, and database updates. Small AI edits can accidentally break unrelated flows.
- Business impact: Changes become slow and risky. Regression probability increases with every feature request.
- Recommended action: Split the file into smaller modules: data loading, access checks, UI components, and mutation handlers.

## Risk Zones

| Zone | Files | Why it matters |
|---|---|---|
| Auth | `middleware.ts`, `lib/auth.ts`, `app/dashboard/page.tsx` | Protected sections must be consistently guarded. |
| Billing | `app/api/stripe/webhook/route.ts`, `lib/billing.ts` | Payment state must be verified server-side. |
| Database | `lib/db.ts`, `app/api/projects/route.ts` | Ownership checks protect user data. |
| UI orchestration | `app/dashboard/page.tsx` | Large UI files often hide business logic and side effects. |

## Repair Plan

### Phase 1 — Launch blockers

- [ ] Add Stripe webhook signature verification.
- [ ] Check every database update/delete for ownership validation.
- [ ] Move role, plan, and price mutation to server-side logic.
- [ ] Verify protected routes manually.

### Phase 2 — Stabilization

- [ ] Split dashboard orchestration into smaller components and server utilities.
- [ ] Create shared access-policy helpers.
- [ ] Add clear success, cancel, and account-status pages after payment.

### Phase 3 — Cleanup

- [ ] Remove temporary TODO/FIXME/HACK markers from critical flows.
- [ ] Add tests or manual verification scripts for auth and billing.
- [ ] Document critical flows in `docs/architecture.md`.

## Agent Repair Prompts

### Prompt 1 — Stripe webhook verification

```text
Review `app/api/stripe/webhook/route.ts` and add Stripe signature verification using `stripe.webhooks.constructEvent`. Do not change unrelated billing logic. Explicitly handle `checkout.session.completed` and `customer.subscription.deleted`. Return a clear 400 response for invalid signatures. After the change, run `npm run lint` and `npm run build`.
```

### Prompt 2 — Move role mutation server-side

```text
Find where user roles, plans, or feature access are changed in `components/AdminPanel.tsx`. Move the mutation into a server-side route or server action. Validate the current user before applying the change. Do not modify UI layout except where required to call the new server-side mutation. After the change, run `npm run lint` and manually verify that a regular user cannot grant themselves admin access.
```

### Prompt 3 — Split dashboard file safely

```text
Refactor `app/dashboard/page.tsx` without changing behavior. Extract presentational UI into components under `components/dashboard/`. Extract data-loading and access-check logic into `lib/dashboard/`. Keep the public route behavior identical. Do not introduce new features. After the change, run `npm run lint` and `npm run build`.
```
