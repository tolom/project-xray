# Agent Repair Workflow

Project X-Ray is designed to work with AI coding agents, not compete with them.

The scanner should produce narrow repair tasks that can be safely handed to Claude Code, Codex, Cursor, Grok, or another coding agent. The goal is not to ask an agent to rewrite the whole project. The goal is to reduce one verified fragility risk at a time.

## The loop

```text
Scan repository
   ↓
Review top risks manually
   ↓
Pick one launch-critical issue
   ↓
Generate a narrow repair prompt
   ↓
Run the coding agent
   ↓
Run lint, build, tests, or manual verification
   ↓
Re-scan
```

## Repair priority

Use this order unless the report clearly indicates a more urgent project-specific risk:

1. Secrets, auth, access boundaries, database ownership, and payment verification.
2. Broken or unclear launch-critical user paths.
3. Coupling between auth, billing, database, and UI.
4. Oversized files and mixed responsibilities.
5. TODO/FIXME/HACK cleanup and readability improvements.

## Good repair prompts

Good prompts are narrow, evidence-based, and verifiable.

### Payment webhook verification

```text
Review `app/api/stripe/webhook/route.ts` and improve payment event verification.

Scope:
- Do not change unrelated billing logic.
- Verify Stripe signatures before trusting events.
- Return clear error responses for invalid signatures.
- Explicitly handle successful checkout and cancellation/subscription deletion events if they already exist in the flow.

After the change:
- Run `npm run lint`.
- Run `npm run build`.
- Summarize what changed and what was intentionally left unchanged.
```

### Server-side ownership check

```text
Review the database update/delete logic in `<file>`.

Scope:
- Add or strengthen ownership checks before mutating data.
- Keep the existing UI behavior unchanged.
- Do not introduce a new auth system.
- Keep the patch limited to the mutation path and the smallest required helper code.

After the change:
- Run `npm run lint`.
- Run `npm run build`.
- Add a short manual verification checklist showing how a regular user is prevented from modifying another user's data.
```

### Split a mixed-responsibility file

```text
Refactor `<large-file>` without changing behavior.

Scope:
- Extract presentational UI into components.
- Extract data-loading and access-check logic into focused utilities.
- Do not redesign the UI.
- Do not change route behavior.
- Do not introduce new features.

After the change:
- Run `npm run lint`.
- Run `npm run build`.
- List the new files and explain which responsibility each one owns.
```

## Bad repair prompts

Avoid broad repair instructions that invite large, risky rewrites.

```text
Fix the architecture.
```

```text
Refactor the whole app and make it production-ready.
```

```text
Improve all security issues and clean up the codebase.
```

These prompts are too vague. They often create new fragility while trying to remove old fragility.

## Verification checklist

After every repair, verify at least one of the following:

- `npm run lint`
- `npm run build`
- existing test suite
- manual auth/access check
- manual billing/payment flow check
- manual database ownership check
- before/after Project X-Ray scan comparison

## Report language

Project X-Ray should avoid false certainty.

Good wording:

> X-Ray did not find an obvious ownership check near this mutation path. If ownership is enforced by shared middleware or a database policy, mark this item as verified.

Bad wording:

> This code is definitely insecure.

The scanner should show evidence, confidence, and verification steps. The developer or reviewer decides whether the issue is a real launch blocker.
