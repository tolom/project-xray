"use client";

import { useState } from "react";
import Link from "next/link";
import { GitBranch, ShieldCheck } from "lucide-react";

import ProjectXRayScanner from "@/components/ProjectXRayScanner";

export function ProjectXRayHome() {
  const [scannerActive, setScannerActive] = useState(false);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050607] text-white">
      {!scannerActive && (
        <header className="relative z-10 border-b border-white/8 bg-[#050607]/82 backdrop-blur-xl">
          <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-6" aria-label="Main navigation">
            <Link href="/" className="flex items-center gap-2" aria-label="Project X-Ray home">
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white text-black">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-white/45">PX</span>
            </Link>

            <a
              href="https://github.com/tolom/project-xray"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 text-sm text-white/62 transition-colors hover:text-white sm:flex"
            >
              <GitBranch className="h-4 w-4" aria-hidden="true" />
              GitHub
            </a>
          </nav>
        </header>
      )}

      <section className={scannerActive ? "min-h-screen bg-[#0a0a0a]" : "relative min-h-[calc(100vh-3.5rem)]"}>
        {!scannerActive && (
          <>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(34,211,238,0.12),transparent_28%),linear-gradient(180deg,rgba(5,6,7,0.1),#050607_78%)]" />
          </>
        )}
        <div className={scannerActive ? "relative" : "relative mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl flex-col items-center justify-center px-5 py-10 text-center sm:px-6"}>
          {!scannerActive && (
            <div className="mb-7">
              <div className="mb-4 font-mono text-xs uppercase tracking-[0.24em] text-cyan-200/70">
                Repository risk scanner
              </div>
              <h1 className="text-5xl font-semibold leading-none tracking-tight text-white sm:text-6xl lg:text-7xl">
                Project X-Ray
              </h1>
              <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-white/58 sm:text-lg">
                Find structural fragility in a GitHub repository before launch.
              </p>
            </div>
          )}
          <div className={scannerActive ? "w-full" : "w-full rounded-xl border border-white/10 bg-[#090b0f]/92 p-4 shadow-2xl shadow-black/40 sm:p-5"}>
            {!scannerActive && (
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/10 pb-3 text-left">
                <div>
                  <div className="text-sm font-medium text-white/90">Repository URL</div>
                  <div className="mt-0.5 text-xs text-white/38">Public repositories scan immediately.</div>
                </div>
                <div className="hidden rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-white/42 sm:block">
                  GitHub API
                </div>
              </div>
            )}
            <ProjectXRayScanner
              onActivityChange={setScannerActive}
              showInputIntro={false}
              showChrome={false}
              showExamples={false}
              resultHeaderTopClassName="top-0"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
