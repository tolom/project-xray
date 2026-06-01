"use client";

import { useState } from "react";
import { SavedScan, loadScanHistory, deleteScanFromHistory } from "@/lib/scan-history";
import { Trash2, Clock, TrendingUp, TrendingDown, Minus, Eye } from "lucide-react";

interface ScanHistoryListProps {
  repo?: { owner: string; repo: string; branch?: string };
  onHistoryUpdate?: (history: SavedScan[]) => void;
  onOpenHistorical?: (scan: SavedScan) => void;
}

export function ScanHistoryList({ repo, onHistoryUpdate, onOpenHistorical }: ScanHistoryListProps) {
  const [history, setHistory] = useState<SavedScan[]>(() => loadScanHistory(repo));

  const handleDelete = (id: string) => {
    const updated = deleteScanFromHistory(id, repo);
    setHistory(updated);
    onHistoryUpdate?.(updated);
  };

  if (history.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center text-sm text-white/50 py-4">
        Scan history is empty for now. After a few scans, a change chart will appear here.
      </div>
    );
  }

  // Use the last eight records for the chart.
  const chartData = [...history].reverse().slice(-8);

  const minScore = Math.min(...chartData.map(s => s.healthScore));
  const maxScore = Math.max(...chartData.map(s => s.healthScore));
  const range = Math.max(maxScore - minScore, 10);

  return (
    <div className="max-w-3xl mx-auto mt-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-white/60" />
          <div className="font-medium text-sm text-white/80">Scan history</div>
        </div>
        <div className="text-xs text-white/50">
          Last {history.length} scans
        </div>
      </div>

      {/* Chart. */}
      <div className="mb-4 rounded-2xl border border-white/10 bg-zinc-950 p-4">
        <div className="text-xs text-white/50 mb-2">Health Score trend</div>
        
        <div className="relative h-28 flex items-end gap-1.5">
          {chartData.map((scan, index) => {
            const heightPercent = ((scan.healthScore - minScore) / range) * 100;
            const isLast = index === chartData.length - 1;
            
            return (
              <div key={scan.id} className="flex-1 flex flex-col items-center justify-end group">
                <div 
                  className={`w-full rounded-t transition-all ${isLast ? 'bg-emerald-500' : 'bg-white/30 group-hover:bg-white/50'}`}
                  style={{ height: `${Math.max(heightPercent, 8)}%` }}
                  title={`${scan.healthScore} (${new Date(scan.timestamp).toLocaleDateString()})`}
                />
                <div className="text-[9px] text-white/40 mt-1 truncate w-full text-center">
                  {new Date(scan.timestamp).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Records list. */}
      <div className="space-y-1.5">
        {history.slice(0, 6).map((scan, index) => {
          const prev = history[index + 1];
          const delta = prev ? scan.healthScore - prev.healthScore : 0;

          return (
            <div 
              key={scan.id} 
              className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="font-medium tabular-nums text-white/90 w-8">
                  {scan.healthScore}
                </div>
                
                <div className="text-white/60 text-xs">
                  {new Date(scan.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>

                {delta !== 0 && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    delta > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {delta > 0 ? '+' : ''}{delta}
                  </div>
                )}
                {delta === 0 && (
                  <div className="flex items-center gap-1 text-xs text-white/40">
                    <Minus className="h-3 w-3" /> 0
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                <div className="text-xs text-white/50 hidden sm:block mr-2">
                  {scan.criticalCount} crit • {scan.highCount} high
                </div>

                {scan.fullResult && onOpenHistorical && (
                  <button
                    onClick={() => onOpenHistorical(scan)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded transition-all"
                    title="Open this result"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                )}

                <button
                  onClick={() => handleDelete(scan.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-white/40 hover:text-red-400 hover:bg-white/10 rounded transition-all"
                  title="Delete record"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {history.length > 6 && (
        <div className="text-center text-xs text-white/40 mt-2">
          + {history.length - 6} more entries
        </div>
      )}
    </div>
  );
}
