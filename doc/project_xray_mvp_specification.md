# Project X-Ray MVP Specification

Project X-Ray is a browser-first repository scanner for detecting structural fragility in AI-built products before launch.

## Architecture

- Next.js App Router application.
- Client-side rule engine.
- GitHub API integration for repository tree and selected file contents.
- Optional serverless route for prompt generation.
- No database, queue, or long-running worker is required for the MVP.

## Core Principles

1. Repository code should not be stored by Project X-Ray.
2. The scanner fetches repository structure first and only loads selected high-signal files.
3. Deterministic rules should produce the primary findings.
4. LLMs are used only to generate bounded repair prompts, not to discover risks.
5. Results should be easy to understand for both engineers and product operators.

## Scanner Flow

1. Parse a GitHub repository URL.
2. Fetch repository metadata and the recursive Git tree.
3. Filter out dependencies, build artifacts, media files, and other non-source assets.
4. Select critical files for deep analysis.
5. Fetch selected file contents.
6. Run the deterministic rule engine.
7. Present health score, top risks, risk zones, and exportable repair tasks.

## Rule Engine

The MVP analyzer covers these risk categories:

- Auth route exposure or missing visible route protection.
- Auth and billing coupling.
- Stripe webhook fragility.
- Client-side trust of roles, prices, or access flags.
- Supabase RLS uncertainty.
- Environment variable exposure.
- Oversized critical files.
- Repeated business logic.
- Temporary fix markers.
- Too many responsibilities in one module.
- Dangerous direct database operations.
- Missing error handling in critical flows.
- Unclear launch path.
- Sensitive modules with high dependency count.
- Composite AI-chaos smell.

## UI Requirements

- Single-page dashboard experience.
- Dark visual theme.
- Clear repository input and scan status.
- Health score with readable explanation.
- Action-first result view.
- Risk grouping by product area.
- Details drawer for individual risks.
- Markdown exports for reports and repair tasks.

## MVP Constraints

- Do not store user repository code in a database.
- Do not automatically commit or open pull requests.
- Do not build an IDE or chat interface inside Project X-Ray.
- Do not expand scope into broad security, accessibility, SEO, or performance auditing.
- Keep the rule engine deterministic and explainable.
