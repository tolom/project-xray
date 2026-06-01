"use client";

import { ScoreBreakdown, AnalysisIssue } from "@/lib/xray-analyzer";

interface HealthScoreBreakdownProps {
  breakdown: ScoreBreakdown;
  currentScore: number;
  className?: string;
}

const SEVERITY_COLOR: Record<AnalysisIssue["severity"], string> = {
  low: "bg-zinc-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

export function HealthScoreBreakdown({ breakdown, currentScore, className }: HealthScoreBreakdownProps) {
  if (!breakdown || breakdown.items.length === 0) {
    return null;
  }

  const potentialScore = Math.min(100, currentScore + breakdown.potentialGain);

  return (
    <div className={`rounded-2xl border border-white/10 bg-zinc-950 p-5 ${className || ""}`}>
      <div className="mb-4">
        <div className="text-xs tracking-[2px] text-white/50">WHICH ISSUES MOST LOWERED THE SCORE?</div>
        <div className="mt-1 text-sm text-white/70">
          This shows which risks reduced the Health Score the most. The higher the penalty, the more important it is to fix.
        </div>
      </div>

      <div className="space-y-2">
        {breakdown.items.slice(0, 6).map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-3 rounded-xl bg-black/40 px-3 py-2.5 text-sm"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className={`h-2 w-2 flex-shrink-0 rounded-full ${SEVERITY_COLOR[item.severity]}`} />
              <span className="truncate text-white/85">{item.ruleName}</span>
              <span className="text-[10px] text-white/40">×{item.count}</span>
            </div>
            <div className="flex-shrink-0 font-medium text-white/90 tabular-nums">
              -{item.totalPenalty}
            </div>
          </div>
        ))}

        {breakdown.items.length > 6 && (
          <div className="px-1 pt-1 text-[11px] text-white/40">
            + {breakdown.items.length - 6} more rules with smaller impact
          </div>
        )}
      </div>

      {breakdown.potentialGain > 5 && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 px-3 py-2.5 text-sm">
          <div className="flex items-center justify-between text-emerald-300">
            <span>If the most serious risks are fixed</span>
            <span className="font-medium tabular-nums">+{breakdown.potentialGain}</span>
          </div>
          <div className="mt-0.5 text-xs text-emerald-400/70">
            Estimated Health Score after fixes: <span className="font-medium">{potentialScore}/100</span>
          </div>
        </div>
      )}
    </div>
  );
}
