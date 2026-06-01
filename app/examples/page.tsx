import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Database, GitBranch, LockKeyhole, ShieldAlert, Webhook } from "lucide-react";

export const metadata: Metadata = {
  title: "Project X-Ray report examples",
  description:
    "Demo examples of Risk Zones and Health Score for Project X-Ray: auth, billing, and database risks in GitHub repositories.",
};

const examples = [
  {
    repo: "vercel/next.js",
    url: "https://github.com/vercel/next.js",
    score: 82,
    verdict: "Healthy baseline",
    summary: "A large production-grade repository shows how X-Ray separates structural signals from noise.",
    zones: [
      { name: "Auth", value: "low", icon: LockKeyhole },
      { name: "Database", value: "low", icon: Database },
      { name: "Client", value: "medium", icon: ShieldAlert },
    ],
  },
  {
    repo: "t3-oss/create-t3-app",
    url: "https://github.com/t3-oss/create-t3-app",
    score: 74,
    verdict: "Good starter, review integrations",
    summary: "A useful starter example: check env, auth boundaries, and server integrations.",
    zones: [
      { name: "Auth", value: "medium", icon: LockKeyhole },
      { name: "Billing", value: "sample only", icon: Webhook },
      { name: "Database", value: "medium", icon: Database },
    ],
  },
  {
    repo: "shadcn-ui/ui",
    url: "https://github.com/shadcn-ui/ui",
    score: 79,
    verdict: "UI-heavy repository",
    summary: "This example shows how the scanner behaves in a repository with many components and less backend surface.",
    zones: [
      { name: "Client", value: "medium", icon: ShieldAlert },
      { name: "Auth", value: "low", icon: LockKeyhole },
      { name: "Database", value: "not detected", icon: Database },
    ],
  },
];

export default function ExamplesPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/65 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Home
          </Link>
          <a
            href="https://github.com/tolom/project-xray"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-white/65 transition-colors hover:text-white"
          >
            <GitBranch className="h-4 w-4" aria-hidden="true" />
            GitHub
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6">
        <div className="max-w-3xl">
          <div className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-cyan-300/80">Examples</div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Ready-made scenarios for demonstrating Project X-Ray
          </h1>
          <p className="mt-5 text-lg leading-8 text-white/60">
            These examples make it easy to show Health Score, Risk Zones, and report format without preparing your own repository.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {examples.map((example) => (
            <article key={example.repo} className="flex min-h-[420px] flex-col rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-sm text-cyan-200">{example.repo}</div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight">{example.verdict}</h2>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-right">
                  <div className="text-xs text-white/40">Score</div>
                  <div className="font-mono text-2xl text-white">{example.score}</div>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-white/58">{example.summary}</p>

              <div className="mt-6 space-y-3">
                {example.zones.map((zone) => {
                  const Icon = zone.icon;
                  return (
                    <div key={`${example.repo}-${zone.name}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0f1117] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-amber-300" aria-hidden="true" />
                        <span className="text-sm font-medium">{zone.name}</span>
                      </div>
                      <span className="text-xs uppercase tracking-[0.14em] text-white/42">{zone.value}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto flex flex-col gap-2 pt-6">
                <Link
                  href={`/#scan`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-white/90"
                >
                  Open scanner
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href={example.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  Repository
                  <GitBranch className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
