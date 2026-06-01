"use client";

import React, { useEffect, useRef } from "react";
import { Copy } from "lucide-react";

interface TerminalLogProps {
  logs: string[];
  isScanning: boolean;
  className?: string;
  compact?: boolean;
  showHeader?: boolean;
}

export function TerminalLog({
  logs,
  isScanning,
  className,
  compact = false,
  showHeader = true,
}: TerminalLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest log line visible.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const copyLogs = () => {
    if (logs.length === 0) return;
    navigator.clipboard.writeText(logs.join("\n"));
  };

  // Hide the terminal when there are no logs and no scan is running.
  if (logs.length === 0 && !isScanning) {
    return null;
  }

  return (
    <div
      className={`relative flex flex-col rounded-xl border border-white/10 bg-zinc-950 font-mono text-[12px] overflow-hidden ${className || ""}`}
    >
      {showHeader && (
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 bg-black/30">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] tracking-[1.5px] text-white/50">ANALYSIS LOG</span>
          </div>
          {logs.length > 0 && (
            <button
              onClick={copyLogs}
              className="flex items-center gap-1 text-white/40 hover:text-white transition-colors p-1"
              title="Copy logs"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        className={`overflow-y-auto p-3 text-white/75 space-y-[1px] leading-snug ${
          compact ? "max-h-[110px]" : "max-h-[170px]"
        }`}
      >
        {logs.length === 0 ? (
          <div className="text-white/40 py-1">Initializing scan...</div>
        ) : (
          logs.map((line, index) => (
            <div key={index} className="whitespace-pre-wrap break-words">
              {line}
            </div>
          ))
        )}
      </div>

      {isScanning && logs.length > 0 && (
        <div className="border-t border-white/10 px-3 py-1 text-[10px] text-white/40 bg-black/20">
          Scan in progress...
        </div>
      )}
    </div>
  );
}
