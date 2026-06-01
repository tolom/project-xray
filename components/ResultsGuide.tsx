"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

export function ResultsGuide({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`rounded-2xl border border-white/10 bg-zinc-950 ${className || ""}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors rounded-2xl"
      >
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-white/60" />
            <span className="text-sm font-medium text-white/90">
            How to read this report
            </span>
          </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-white/50" />
        ) : (
          <ChevronDown className="h-4 w-4 text-white/50" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-white/10 px-5 py-5 text-sm text-white/80 space-y-4">
          <div>
            <div className="font-medium text-white mb-1">Health Score</div>
            <p>
              A score from 0 to 100 that shows how easy and safe it will be to keep developing the project.
              A high score does not mean &quot;perfect code&quot;; it means there are fewer structural time bombs.
            </p>
          </div>

          <div>
            <div className="font-medium text-white mb-1">Risk colors</div>
            <ul className="space-y-1 pl-1">
              <li><span className="text-red-400">Red (Critical)</span> — may lead to financial loss or data leaks.</li>
              <li><span className="text-orange-400">Orange (High)</span> — should be fixed before active use of the product.</li>
              <li><span className="text-yellow-400">Yellow (Medium)</span> — make support and future edits harder.</li>
              <li><span className="text-zinc-400">Gray (Low)</span> — minor notes.</li>
            </ul>
          </div>

          <div>
            <div className="font-medium text-white mb-1">What to do next (simple loop)</div>
            <p className="text-white/70">
              1. Read the &quot;What to do next&quot; block → 2. Open the risk → 3. Copy the prompt → 4. Fix it in Cursor/Claude → 5. Click &quot;Re-scan&quot;.
            </p>
          </div>

          <div className="pt-2 text-[12px] text-white/50 border-t border-white/10">
            X-Ray does not replace tests or code review. It catches structural problems that often appear in AI-generated code.
          </div>
        </div>
      )}
    </div>
  );
}
