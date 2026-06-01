"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ScanResult, AnalysisIssue } from "@/lib/xray-analyzer";
import { HealthScoreBreakdown } from "@/components/HealthScoreBreakdown";
import { Eye, EyeOff, RefreshCw } from "lucide-react";

interface BentoGridProps {
  result: ScanResult;           // visible / adjusted result (without muted)
  fullResult: ScanResult;       // original full result (for comparison)
  onOpenDrawer: (issue: AnalysisIssue | null, file?: string) => void;
  mutedFiles: Set<string>;
  onToggleMute: (file: string) => void;
  onReScanFile: (file: string) => void;
}

const SEVERITY_COLOR: Record<AnalysisIssue["severity"], string> = {
  low: "bg-zinc-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

export function BentoGrid({ result, fullResult, onOpenDrawer, mutedFiles, onToggleMute, onReScanFile }: BentoGridProps) {
  const mutedCount = mutedFiles.size;

  const modules = [
    { name: "Auth", color: "#22c55e" },
    { name: "Billing", color: "#eab308" },
    { name: "Database", color: "#3b82f6" },
    { name: "Components", color: "#a855f7" },
  ];

  const getSeverityRank = (severity: AnalysisIssue["severity"]) => {
    return { low: 1, medium: 2, high: 3, critical: 4 }[severity];
  };

  const getModuleFiles = (moduleName: string) => {
    return result.nodes
      .filter((node) => node.cluster === moduleName && !mutedFiles.has(node.path))
      .map((node) => {
        const issues = result.issues.filter((issue) => issue.file === node.path);
        const primaryIssue = issues
          .sort((a, b) => getSeverityRank(b.severity) - getSeverityRank(a.severity))[0] || null;

        return {
          path: node.path,
          fileName: node.path.split("/").pop() || node.path,
          issues,
          primaryIssue,
          status: primaryIssue?.severity || "clean",
        };
      })
      .sort((a, b) => {
        const rankA = a.primaryIssue ? getSeverityRank(a.primaryIssue.severity) : 0;
        const rankB = b.primaryIssue ? getSeverityRank(b.primaryIssue.severity) : 0;
        return rankB - rankA || a.path.localeCompare(b.path);
      });
  };

  const getStatusDot = (status: AnalysisIssue["severity"] | "clean") => {
    if (status === "clean") return "bg-emerald-500";
    return SEVERITY_COLOR[status];
  };

  return (
    <div className="space-y-6">
      {/* Muted files banner */}
      {mutedCount > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-950/20 px-5 py-3 text-sm">
          <div className="flex items-center gap-2 text-amber-300">
            <span>Muted files: <span className="font-semibold">{mutedCount}</span>. They are excluded from the Health Score and lists.</span>
          </div>
          <button
            onClick={() => mutedFiles.forEach(f => onToggleMute(f))}
            className="rounded-lg border border-amber-500/30 px-3 py-1 text-xs text-amber-300 hover:bg-amber-950/40 transition-colors"
          >
            Reset all
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Hero Card - Health Score */}
        <div className="lg:col-span-5 rounded-3xl border border-white/10 bg-zinc-950 p-8">
          <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-xs tracking-[2.5px] text-white/50">HEALTH SCORE</div>
                {mutedCount > 0 && (
                  <div className="text-[10px] text-amber-400 mt-0.5">Adjusted score (muted files excluded)</div>
                )}
              </div>
          </div>

          <div className="flex items-end gap-6">
            <div className="relative w-40 h-40 flex-shrink-0">
              <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#181818" strokeWidth="7" />
                <circle
                  cx="60" cy="60" r="54"
                  fill="none"
                  stroke={result.healthScore >= 85 ? "#22c55e" : result.healthScore >= 60 ? "#eab308" : "#f87171"}
                  strokeWidth="7"
                  strokeDasharray={340}
                  strokeDashoffset={340 - (340 * result.healthScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-7xl font-semibold tabular-nums tracking-[-4px]">{result.healthScore}</div>
                <div className="text-xs text-white/40 -mt-1 tracking-widest">/ 100</div>
              </div>
            </div>

            <div className="pb-2">
              <div className="text-3xl font-semibold tracking-tight mb-2">
                {result.verdictTitle}
              </div>
              <p className="max-w-[260px] text-[13px] text-white/70 leading-snug">{result.verdictDescription}</p>

              {mutedCount > 0 && fullResult && (
                <p className="mt-3 text-xs text-amber-400/80">
                  Original: {fullResult.healthScore} → Current (visible): {result.healthScore}
                </p>
              )}
            </div>
          </div>

          {/* Health Score breakdown directly below the main score. */}
          {result.scoreBreakdown && result.scoreBreakdown.items.length > 0 && (
            <div className="mt-6">
              <HealthScoreBreakdown
                breakdown={result.scoreBreakdown}
                currentScore={result.healthScore}
              />
            </div>
          )}
        </div>

        {/* Top Risks */}
        <div className="lg:col-span-7 rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-xs tracking-[2px] text-white/50">TOP RISKS</div>
            <div className="text-[10px] text-white/40">{result.topRisks.length} top risks</div>
          </div>

          {result.topRisks.length > 0 ? (
            <div className="space-y-2.5">
              {result.topRisks.slice(0, 3).map((risk, index) => (
                <div
                  key={index}
                  onClick={() => onOpenDrawer(risk, risk.file)}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-4 transition-all hover:border-white/20 active:scale-[0.985] cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${SEVERITY_COLOR[risk.severity]}`} />
                      <span className="font-medium text-[13px] tracking-tight">{risk.message}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/55 line-clamp-1 pr-4">
                      {risk.businessImpact || risk.impact}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 border border-white/10 text-xs group-hover:border-white/30 group-hover:bg-white group-hover:text-black"
                  >
                    Get AI Fix Prompt
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-white/50">No critical risks found</div>
              )}
        </div>

        <div className="lg:col-span-12 rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs tracking-[2px] text-white/50">LAUNCH DECISION</div>
              <div className="mt-1 text-xl font-semibold tracking-tight">{result.verdictTitle}</div>
            </div>
            <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">
              {result.criticalFilesFetched}/{result.scannedFiles} files deep-scanned
            </div>
          </div>
          <p className="max-w-3xl text-sm leading-relaxed text-white/70">{result.verdictDescription}</p>

          {result.topRisks.length > 0 && (
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {result.topRisks.map((risk, index) => (
                <button
                  key={`${risk.ruleId}-${index}`}
                  onClick={() => onOpenDrawer(risk, risk.file)}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4 text-left transition-colors hover:border-white/25"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-white/40">Risk {index + 1}</span>
                    <span className={`h-2 w-2 rounded-full ${SEVERITY_COLOR[risk.severity]}`} />
                  </div>
                  <div className="line-clamp-2 text-sm font-medium text-white/90">{risk.message}</div>
                  <div className="mt-2 line-clamp-3 text-xs leading-snug text-white/55">
                    {risk.suggestedAction}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Module Cards */}
        <div className="lg:col-span-12">
          <div className="mb-3 px-1 text-xs tracking-[2px] text-white/50">MODULE BREAKDOWN</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {modules.map(({ name, color }) => {
              const files = getModuleFiles(name);
              const issueCount = files.reduce((sum, file) => sum + file.issues.length, 0);
              const riskFiles = files.filter((file) => file.primaryIssue);

              return (
                <div key={name} className="rounded-3xl border border-white/10 bg-zinc-950 p-5 transition-colors hover:border-white/20">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="font-semibold tracking-tight">{name}</span>
                    </div>
                    <span className="text-xs text-white/50">{files.length} files · {issueCount} issues</span>
                  </div>

                  {issueCount > 0 ? (
                    <div className="space-y-1">
                      {riskFiles.slice(0, 6).map((file, idx) => {
                        const isMuted = mutedFiles.has(file.path);
                        return (
                          <div
                            key={idx}
                            onClick={() => onOpenDrawer(file.primaryIssue, file.path)}
                            className={`group flex items-center justify-between rounded-xl px-2.5 py-1.5 text-sm transition-all hover:bg-white/5 ${isMuted ? "opacity-50" : ""}`}
                            title={file.path}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${getStatusDot(file.status)}`} />
                              <span className="truncate text-white/85 text-[12.5px]">{file.fileName}</span>
                            </div>

                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                onClick={(e) => { e.stopPropagation(); onToggleMute(file.path); }}
                                className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white/80"
                                title={isMuted ? "Unmute" : "Mute"}
                              >
                                {isMuted ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onReScanFile(file.path); }}
                                className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white/80"
                                title="Re-scan this file"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {riskFiles.length > 6 && (
                        <div className="px-2.5 pt-1 text-[11px] text-white/40">
                          +{riskFiles.length - 6} risk files hidden
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => onOpenDrawer(null)}
                      className="w-full rounded-xl border border-emerald-500/10 bg-emerald-950/10 px-3 py-4 text-left transition-colors hover:border-emerald-500/25"
                    >
                      <div className="flex items-center gap-2 text-sm text-emerald-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Clean zone
                      </div>
                      <div className="mt-1 text-xs text-white/45">
                        {files.length} checked files · no risks found
                      </div>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
