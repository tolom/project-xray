"use client";


import { ScanResult, AnalysisIssue } from "@/lib/xray-analyzer";
import { ArrowRight, RefreshCw, Target, CheckCircle2, Circle } from "lucide-react";

interface NextStepsProps {
  result: ScanResult;
  resolvedIds: Set<string>;
  onToggleResolved: (id: string) => void;
  onOpenDrawer: (issue: AnalysisIssue | null, file?: string) => void;
  onReScan: () => void;
}

export function NextSteps({ result, resolvedIds, onToggleResolved, onOpenDrawer, onReScan }: NextStepsProps) {

  const criticalCount = result.issues.filter(i => i.severity === "critical").length;
  const highCount = result.issues.filter(i => i.severity === "high").length;
  const hasSeriousRisks = criticalCount > 0 || highCount > 0;

  // Show at most the three most serious risks.
  const topRisksToShow = [...result.topRisks]
    .sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    })
    .slice(0, 3);

  const getRiskId = (risk: AnalysisIssue) => `${risk.file || 'project'}-${risk.ruleId}`;

  const toggleResolved = (risk: AnalysisIssue) => {
    const id = getRiskId(risk);
    onToggleResolved(id);
  };

  const resolvedCount = topRisksToShow.filter(r => resolvedIds.has(getRiskId(r))).length;
  const totalToShow = topRisksToShow.length;
  const progress = totalToShow > 0 ? Math.round((resolvedCount / totalToShow) * 100) : 0;

  if (!hasSeriousRisks && result.healthScore >= 85) {
    return (
      <div className="max-w-3xl mx-auto rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-5">
        <div className="flex items-start gap-3">
          <Target className="mt-0.5 h-5 w-5 text-emerald-400" />
          <div>
            <div className="font-medium text-emerald-300">Good result</div>
            <p className="mt-1 text-sm text-emerald-400/90">
              The project looks healthy enough to launch, but it is worth re-running checks from time to time after major changes.
            </p>
            <button
              onClick={onReScan}
              className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-950/50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Check again later
            </button>
          </div>
        </div>
      </div>
    );
  }

  const borderColor = result.healthScore < 60 
    ? "border-red-500/30" 
    : result.healthScore < 75 
      ? "border-amber-500/30" 
      : "border-white/10";

  return (
    <div className={`max-w-3xl mx-auto rounded-2xl border ${borderColor} bg-zinc-950 p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className={`h-5 w-5 ${result.healthScore < 60 ? 'text-red-400' : result.healthScore < 75 ? 'text-amber-400' : 'text-white/70'}`} />
          <div className="font-semibold text-white text-lg tracking-tight">What to do next</div>
        </div>

        {totalToShow > 0 && (
          <div className="text-xs font-medium text-emerald-400 bg-emerald-950/30 px-2.5 py-0.5 rounded-full">
            {resolvedCount} / {totalToShow} resolved
          </div>
        )}
      </div>

      {/* Progress bar. */}
      {totalToShow > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-[11px] text-white/50 mb-1.5">
            <span>Fix progress</span>
            <span className="font-medium text-emerald-400">{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <p className="text-sm text-white/70 mb-4 leading-relaxed">
        {result.healthScore < 60 
          ? "There are serious issues. Focus on the critical and high risks first, because they carry the biggest threat."
          : result.healthScore < 75
            ? "The project has a medium risk level. Fixing the top risks will noticeably improve stability."
            : result.healthScore < 85
              ? "Good result, but there is still room to improve. Fixing the remaining high risks will make the product more reliable."
              : "Excellent result. The project looks healthy. Re-check it occasionally after major changes."}
      </p>

      {/* Checklist of the most important risks. */}
      {topRisksToShow.length > 0 && (
        <div className="space-y-2 mb-4">
          {topRisksToShow.map((risk, index) => {
            const riskId = getRiskId(risk);
            const isResolved = resolvedIds.has(riskId);

            return (
              <div
                key={index}
                className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                  isResolved 
                    ? 'border-emerald-500/40 bg-emerald-950/20' 
                    : 'border-white/10 bg-black/30 hover:border-white/25 hover:bg-white/5'
                }`}
              >
                <button
                  onClick={() => toggleResolved(risk)}
                  className="flex-shrink-0 text-white/60 hover:text-white transition"
                >
                  {isResolved ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>

                <button
                  onClick={() => onOpenDrawer(risk, risk.file)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/50">#{index + 1}</span>
                    <span className={`font-medium transition ${isResolved ? 'text-emerald-400 line-through' : 'text-white/90 group-hover:text-white'}`}>
                      {risk.ruleName}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-white/60">
                    {risk.businessImpact || risk.impact}
                  </p>
                </button>

                <ArrowRight 
                  onClick={() => onOpenDrawer(risk, risk.file)}
                  className="h-4 w-4 text-white/40 group-hover:text-white/70 transition cursor-pointer" 
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onReScan}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 active:bg-white/80"
        >
          <RefreshCw className="h-4 w-4" />
          Re-scan after fixes
        </button>

        <button
          onClick={() => onOpenDrawer(null)}
          className="flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
        >
          View all risks
        </button>
      </div>

      {resolvedCount === totalToShow && totalToShow > 0 && (
        <div className="mt-4 text-center text-xs text-emerald-400 bg-emerald-950/20 py-2 rounded-lg">
          Great. All top risks are marked as resolved. Re-scan the project to see the updated result.
        </div>
      )}

      <p className="mt-3 text-[11px] text-white/50">
        Mark resolved risks, then click &quot;Re-scan&quot;. You will see the Health Score rise.
      </p>
    </div>
  );
}
