"use client";

import { useMemo, useState } from "react";
import type { AnalysisIssue, ScanResult } from "@/lib/xray-analyzer";
import { AlertTriangle, ArrowRight, ChevronDown, Layers3 } from "lucide-react";

interface RiskZonesProps {
  result: ScanResult;
  onOpenRisk: (issue: AnalysisIssue | null, file?: string) => void;
  onOpenZone: (zone: RiskZoneSummary) => void;
}

export interface RiskZoneSummary {
  name: string;
  label: string;
  issues: AnalysisIssue[];
  critical: number;
  high: number;
  medium: number;
  low: number;
  percent: number;
  score: number;
}

const ZONE_ORDER = [
  "Auth",
  "Billing",
  "Database",
  "Routes",
  "Components",
  "Config",
  "Utils",
  "Hooks",
  "Other",
];

const ZONE_LABELS: Record<string, string> = {
  Auth: "Authentication and sessions",
  Billing: "Payments and subscriptions",
  Database: "Database and data access",
  Routes: "API routes and server logic",
  Components: "UI components and pages",
  Config: "Configuration and environment",
  Utils: "Utilities and shared modules",
  Hooks: "Hooks",
  Other: "Other",
};

const SEVERITY_RANK: Record<AnalysisIssue["severity"], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const SEVERITY_COLOR: Record<AnalysisIssue["severity"], string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-zinc-500",
};

const ZONE_HINTS: Array<{ name: string; keywords: string[] }> = [
  { name: "Auth", keywords: ["auth", "clerk", "login", "session", "middleware", "proxy", "jwt"] },
  { name: "Billing", keywords: ["stripe", "billing", "subscription", "payment", "checkout", "invoice", "webhook"] },
  { name: "Database", keywords: ["prisma", "supabase", "drizzle", "db", "database", "sql", "schema", "model"] },
  { name: "Routes", keywords: ["api/", "route.ts", "route.js", "routes/", "server/", "action.ts", "action.js"] },
  { name: "Components", keywords: ["components/", "ui/", "pages/", "app/"] },
  { name: "Config", keywords: [".env", "package.json", "config", "next.config", "tailwind.config", "tsconfig"] },
  { name: "Hooks", keywords: ["hooks/", "use-"] },
  { name: "Utils", keywords: ["lib/", "utils/", "helpers/", "services/"] },
];

function getZoneFromPath(path?: string, fallback = "Other") {
  if (!path) return fallback;
  const normalized = path.toLowerCase();
  const match = ZONE_HINTS.find((zone) => zone.keywords.some((keyword) => normalized.includes(keyword)));
  return match?.name || fallback;
}

function sortIssues(issues: AnalysisIssue[]) {
  return [...issues].sort((a, b) => {
    const severityDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.confidence - a.confidence;
  });
}

function getZoneTone(zone: RiskZoneSummary) {
  if (zone.critical > 0) return "border-red-500/35 bg-red-950/15";
  if (zone.high > 0) return "border-orange-500/30 bg-orange-950/10";
  if (zone.medium > 0) return "border-yellow-500/25 bg-yellow-950/10";
  return "border-white/10 bg-zinc-950";
}

export function RiskZones({ result, onOpenRisk, onOpenZone }: RiskZonesProps) {
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());

  const zones = useMemo(() => {
    const issues = result.issues || [];
    const nodes = result.nodes || [];
    const fileToCluster = new Map<string, string>();

    nodes.forEach((node) => {
      fileToCluster.set(node.path, getZoneFromPath(node.path, node.cluster || "Other"));
    });

    const zonesMap = new Map<string, Omit<RiskZoneSummary, "label" | "percent" | "score">>();

    issues.forEach((issue) => {
      const zoneName = fileToCluster.get(issue.file || "") || getZoneFromPath(issue.file);

      if (!zonesMap.has(zoneName)) {
        zonesMap.set(zoneName, {
          name: zoneName,
          issues: [],
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        });
      }

      const zone = zonesMap.get(zoneName)!;
      zone.issues.push(issue);
      zone[issue.severity]++;
    });

    const totalRisks = Math.max(issues.length, 1);

    return Array.from(zonesMap.values())
      .map((zone) => ({
        ...zone,
        label: ZONE_LABELS[zone.name] || zone.name,
        percent: Math.round((zone.issues.length / totalRisks) * 100),
        score: zone.critical * 10 + zone.high * 5 + zone.medium * 2 + zone.low,
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return ZONE_ORDER.indexOf(a.name) - ZONE_ORDER.indexOf(b.name);
      });
  }, [result]);

  const totalRisks = result.issues?.length || 0;

  if (zones.length === 0) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-emerald-500/20 bg-emerald-950/10 px-6 py-10 text-center text-white/70">
        No risks were found, or the results could not be grouped into zones.
      </div>
    );
  }

  const toggleZone = (zoneName: string) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneName)) next.delete(zoneName);
      else next.add(zoneName);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs tracking-[2px] text-white/45">
            <Layers3 className="h-4 w-4" />
            RISKS BY ZONE
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">
            Zones are sorted by danger: critical and high risks are placed above ordinary notes.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/55">
          {totalRisks} risks total
        </div>
      </div>

      <div className="grid gap-4">
        {zones.map((zone) => {
          const total = zone.issues.length;
          const isExpanded = expandedZones.has(zone.name);
          const sortedIssues = sortIssues(zone.issues);
          const visibleIssues = isExpanded ? sortedIssues : sortedIssues.slice(0, 3);

          return (
            <section
              key={zone.name}
              className={`rounded-2xl border p-4 transition-colors hover:border-white/25 sm:p-5 ${getZoneTone(zone)}`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <button
                  type="button"
                  onClick={() => onOpenZone(zone)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold tracking-tight text-white">{zone.label}</div>
                    {(zone.critical > 0 || zone.high > 0) && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-200">
                        <AlertTriangle className="h-3 w-3" />
                        high priority
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-white/50">
                    {zone.name} • {total} risks • {zone.percent}% of all detected
                  </div>
                </button>

                <div className="min-w-[220px] space-y-2">
                  <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
                    {(["critical", "high", "medium", "low"] as const).map((severity) => {
                      const count = zone[severity];
                      if (count === 0) return null;
                      return (
                        <div
                          key={severity}
                          className={SEVERITY_COLOR[severity]}
                          style={{ width: `${(count / total) * 100}%` }}
                          title={`${count} ${severity}`}
                        />
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[11px] text-white/55">
                    <span className="text-red-300">{zone.critical} crit</span>
                    <span className="text-orange-300">{zone.high} high</span>
                    <span className="text-yellow-300">{zone.medium} med</span>
                    <span>{zone.low} low</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {visibleIssues.map((issue, index) => (
                  <button
                    key={`${issue.ruleId}-${issue.file || "unknown"}-${index}`}
                    type="button"
                    onClick={() => onOpenRisk(issue, issue.file)}
                    className="group flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-left transition-colors hover:border-white/25 hover:bg-white/5"
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${SEVERITY_COLOR[issue.severity]}`} />
                        <span className="truncate text-sm font-medium text-white/90">{issue.ruleName}</span>
                      </div>
                      <div className="mt-1 truncate text-xs text-white/55">
                        {issue.file || "file not specified"}
                        {issue.simpleExplanation ? ` · ${issue.simpleExplanation}` : ""}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-white/35 transition-colors group-hover:text-white/70" />
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => toggleZone(zone.name)}
                  className="inline-flex items-center gap-1 text-xs text-white/60 transition-colors hover:text-white"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  {isExpanded ? "Collapse compact list" : `Expand all ${total} risks`}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenZone(zone)}
                  className="text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
                >
                  Open the full zone in the panel
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
