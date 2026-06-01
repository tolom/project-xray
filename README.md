# Project X-Ray

Project X-Ray is a browser-first audit tool for finding fragile areas in AI-built products before launch.

The analyzer runs in the browser. Repository code is fetched through the GitHub API and is not stored by Project X-Ray.

## Features

- Client-side rule engine with deterministic structural checks.
- Health score with rule-level breakdown.
- Risk-zone view and visual X-Ray map.
- Markdown reports and repair-task exports.
- GitHub OAuth support for private repositories.
- Optional xAI/Grok prompt generation with deterministic fallback prompts.
- Local scan history stored in the browser.

## Requirements

- Node.js compatible with Next.js 16.
- npm.
- A GitHub OAuth App if you want private repository access.
- Optional xAI API key for generated repair prompts.

## Quick Start

```bash
npm install
npm run dev
```

Open the URL printed by Next.js, usually `http://localhost:3000`.

Public repositories can be scanned without signing in. Private repositories require GitHub OAuth.

## GitHub OAuth

If you run your own copy of Project X-Ray, create a GitHub OAuth App:

1. Open `https://github.com/settings/applications/new`.
2. Set the Homepage URL to the URL where Project X-Ray is running.
3. Set the Authorization callback URL to:

```text
http://localhost:3000/api/auth/callback/github
```

For production, replace `http://localhost:3000` with your deployed domain.

Then create `.env.local`:

```env
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
AUTH_SECRET=...
```

Project X-Ray requests the GitHub scopes `read:user repo` through Auth.js so it can read private repositories that the signed-in GitHub user can access.

## Optional xAI/Grok Setup

Prompt generation uses deterministic fallback text by default. To enable xAI/Grok prompt generation, add:

```env
XAI_API_KEY=...
```

## Architecture

- `app/page.tsx` contains the main scanner UI and orchestration.
- `lib/github.ts` wraps GitHub API calls and repository file selection.
- `lib/xray-analyzer.ts` contains the deterministic rule engine.
- `lib/scan-history.ts` stores scan history in browser localStorage.
- `components/` contains reusable result views and UI surfaces.

## Development

Run checks before opening a pull request:

```bash
npm run lint
npm run build
```

## Security Notes

This project intentionally exposes the GitHub access token to the browser session so the client can call GitHub directly. This preserves the zero-backend design, but it also means browser-side XSS would be high impact. For a production SaaS, consider moving GitHub API calls behind a server-side proxy.

## License

MIT. See [LICENSE](LICENSE).
