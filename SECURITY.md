# Security Policy

## Reporting a Vulnerability

If you find a security issue, please do not open a public issue with exploit details.

Send a private report to the repository owner with:

- Affected version or commit.
- Steps to reproduce.
- Impact assessment.
- Any suggested mitigation.

The maintainer should acknowledge the report and coordinate a fix before public disclosure.

## Security Notes

Project X-Ray is designed as a zero-backend scanner. GitHub repository data is fetched from the browser through the GitHub API.

For private repositories, Auth.js exposes the GitHub access token to the browser session so the client can call GitHub directly. This preserves the zero-backend architecture, but it also makes browser-side XSS high impact. For production SaaS usage, consider moving GitHub API calls behind a server-side proxy and keeping GitHub tokens server-side.
