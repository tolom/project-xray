"use client";

import { ScanResult } from "@/lib/xray-analyzer";
import { compareWithPrevious } from "@/lib/scan-history";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ScanHistoryComparisonProps {
  result: ScanResult;
  repo?: { owner: string; repo: string; branch: string };
}

export function ScanHistoryComparison({ result, repo }: ScanHistoryComparisonProps) {
  const comparison = compareWithPrevious(result, repo);

  if (!comparison.hasPrevious || !comparison.previous) {
    return null;
  }

  const { delta, previous } = comparison;

  const isImproved = delta > 0;
  const isWorse = delta < 0;
  const isSame = delta === 0;

  return (
    <div className="max-w-3xl mx-auto mb-4">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm">
        <div className="flex items-center gap-2 text-white/80">
          <span>Compared with the previous scan:</span>
        </div>

        <div className={`flex items-center gap-1.5 font-medium ${
          isImproved ? 'text-emerald-400' : isWorse ? 'text-red-400' : 'text-white/70'
        }`}>
          {isImproved && <TrendingUp className="h-4 w-4" />}
          {isWorse && <TrendingDown className="h-4 w-4" />}
          {isSame && <Minus className="h-4 w-4" />}

          <span>
            {isImproved ? '+' : ''}{delta} points
          </span>
        </div>

        <div className="text-white/50 text-xs">
          (was {previous.healthScore})
        </div>
      </div>
    </div>
  );
}
