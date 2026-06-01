"use client";

import { signIn } from "next-auth/react";
import { AlertCircle, ExternalLink, RefreshCw } from "lucide-react";

interface GitHubAuthHelpProps {
  errorType?: "no_token" | "insufficient_scope" | "not_found" | "generic";
  onClose?: () => void;
}

const ERROR_COPY: Record<NonNullable<GitHubAuthHelpProps["errorType"]>, string> = {
  no_token: "You signed in with GitHub, but Project X-Ray did not receive a GitHub access token.",
  insufficient_scope: "A GitHub token exists, but it may not have enough permissions for private repositories.",
  not_found: "The repository was not found, or the current GitHub token does not have access to it.",
  generic: "Private repositories require a GitHub token with the repo scope.",
};

export function GitHubAuthHelp({ errorType = "generic", onClose }: GitHubAuthHelpProps) {
  return (
    <div className="flex max-h-[min(90vh,760px)] w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 font-sans text-white shadow-2xl">
      <div className="shrink-0 border-b border-white/10 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <div className="text-lg font-semibold tracking-tight">Access to private repositories</div>
            <div className="mt-1 text-sm leading-relaxed text-white/60">
              {ERROR_COPY[errorType]}
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg px-2 py-1 text-xl leading-none text-white/45 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            x
          </button>
        )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-white/75 sm:px-6">
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4">
          <div className="font-medium text-white">If you are just scanning a repository</div>
          <p className="mt-1">
            You do not need to configure anything in <code className="rounded bg-black/40 px-1 font-mono">.env</code>.
            Click &quot;Reconnect GitHub&quot; and confirm access on the GitHub page. After that, Project X-Ray can
            read the private repositories your GitHub account can access.
          </p>
          <p className="mt-2 text-white/60">
            If GitHub does not show a permission prompt, or the private repository still does not open,
            the problem is usually in the OAuth app configuration on the Project X-Ray side.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="font-medium text-white">If you are running your own copy of Project X-Ray</div>
          <p className="mt-1 text-white/65">
            This applies only to a self-hosted setup: you cloned the project, run it locally, or deployed it on your own domain.
            In that case, create a GitHub OAuth App and add its keys to the environment for your deployment.
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-xs uppercase tracking-[1px] text-white/45">Homepage URL</div>
              <code className="mt-1 block overflow-x-auto rounded bg-black/50 px-2 py-1.5 font-mono text-xs text-white/85">
                The URL where your Project X-Ray instance is running
              </code>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[1px] text-white/45">Authorization callback URL</div>
              <code className="mt-1 block overflow-x-auto rounded bg-black/50 px-2 py-1.5 font-mono text-xs text-white/85">
                https://your-domain.example/api/auth/callback/github
              </code>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[1px] text-white/45">Environment variables</div>
              <pre className="mt-1 overflow-x-auto rounded bg-black/50 p-3 font-mono text-xs text-white/85">
{`AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
AUTH_SECRET=...`}
              </pre>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/50">
            The <code className="rounded bg-black/40 px-1 font-mono">repo</code> scope is requested by Auth.js when a user
            signs in with GitHub. Without it, private repositories cannot be read.
          </p>
        </section>
      </div>

      <div className="shrink-0 border-t border-white/10 px-5 py-4 sm:px-6">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <a
          href="https://github.com/settings/applications/new"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-white/55 transition-colors hover:text-white"
        >
          GitHub OAuth Apps <ExternalLink className="h-3.5 w-3.5" />
        </a>

        <div className="flex gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-white/15 px-4 py-2 text-sm text-white/75 transition-colors hover:bg-white/5 hover:text-white"
            >
              Close
            </button>
          )}
          <button
            onClick={() => {
              signIn("github");
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90"
          >
            <RefreshCw className="h-4 w-4" />
            Reconnect GitHub
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
