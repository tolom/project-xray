# Contributing

Thanks for taking the time to improve Project X-Ray.

## Development

Install dependencies and start the local server:

```bash
npm install
npm run dev
```

Before opening a pull request, run:

```bash
npm run lint
npm run build
```

## Pull Requests

- Keep changes focused and reviewable.
- Preserve existing public APIs and UI behavior unless the change requires otherwise.
- Prefer small, explicit fixes over broad rewrites.
- Do not commit secrets, local environment files, build output, or generated archives.
- Document user-facing behavior changes in the pull request description.

## Code Style

- Comments and documentation should be written in English.
- Keep comments meaningful and avoid restating obvious code.
- Use existing project patterns before adding new abstractions.
- Add dependencies only when they are clearly justified.
