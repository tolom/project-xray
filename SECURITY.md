# Security Policy

Project X-Ray is a launch-readiness scanner for AI-built products. It is not a full security audit tool.

This document explains how to report security concerns related to Project X-Ray itself.

## Supported versions

Project X-Ray is currently pre-1.0. Security fixes are applied to the `main` branch.

## Reporting a concern

If you find a security concern in Project X-Ray, please do not open a public issue with sensitive details.

Instead, report it privately to the maintainer through a direct channel listed on the repository owner's GitHub profile or website.

Please include:

- affected file or feature;
- short description;
- impact;
- minimal reproduction steps;
- suggested fix, if known.

Do not include secrets, private repository contents, customer data, or third-party credentials in the report.

## Scope

In scope:

- Project X-Ray application code;
- GitHub OAuth handling;
- browser-side scan flow;
- report export behavior;
- local scan history behavior;
- documentation that could misrepresent privacy or safety guarantees.

Out of scope:

- vulnerabilities in scanned third-party repositories;
- issues in GitHub, Auth.js, Next.js, React, or other dependencies unless Project X-Ray misuses them;
- social engineering;
- automated high-volume testing against deployed demos;
- reports that require access to private repositories without authorization.

## Privacy and repository code

Project X-Ray is designed as a browser-first scanner.

- Public repositories can be scanned without signing in.
- Private repository access requires GitHub OAuth.
- Repository code is fetched through the GitHub API.
- Project X-Ray does not intentionally store repository code.
- Local scan history is stored in the browser.

The current browser-first design means the GitHub access token is available to the browser session so the client can call GitHub directly. This is an explicit architecture tradeoff. For production SaaS deployments, a server-side GitHub proxy mode is recommended.

## Responsible testing

When testing Project X-Ray:

- use repositories you own or are authorized to inspect;
- avoid destructive actions;
- do not attempt to access other users' private repositories;
- do not publish sensitive repository contents;
- keep reproduction steps minimal and safe.

## Disclosure expectations

The maintainer will try to acknowledge valid reports and prioritize fixes based on impact and exploitability. Because this is an early-stage open-source project, response times may vary.
