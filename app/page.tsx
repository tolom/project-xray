"use client";

import { useCallback, useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { signIn, signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import { 
  Play, Shield, RefreshCw,
  GitBranch, Copy, LogOut 
} from "lucide-react";

import { parseGitHubUrl, fetchRepoInfo, fetchRepoTree, fetchFileContent, filterSourceTree, selectDeepAnalysisFiles } from "@/lib/github";
import { XRayAnalyzer, type ScanResult, type AnalysisIssue } from "@/lib/xray-analyzer";
import { BentoGrid } from "@/components/BentoGrid";
import { TerminalLog } from "@/components/TerminalLog";
import { HealthScoreBreakdown } from "@/components/HealthScoreBreakdown";
import { ResultsGuide } from "@/components/ResultsGuide";
import { GitHubAuthHelp } from "@/components/GitHubAuthHelp";
import { RiskZones, type RiskZoneSummary } from "@/components/RiskZones";
import { NextSteps } from "@/components/NextSteps";
import { ScanHistoryComparison } from "@/components/ScanHistoryComparison";
import { ScanHistoryList } from "@/components/ScanHistoryList";
import { saveScan, SavedScan } from "@/lib/scan-history";

// ==================== Constants ====================
const EXAMPLE_REPOS = [
  "https://github.com/vercel/next.js",
  "https://github.com/t3-oss/create-t3-app",
  "https://github.com/shadcn-ui/ui",
];

const SEVERITY_COLOR: Record<AnalysisIssue["severity"], string> = {
  low: "bg-zinc-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const SEVERITY_RANK: Record<AnalysisIssue["severity"], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const SEVERITY_LABEL: Record<AnalysisIssue["severity"], string> = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};

function loadMutedFiles() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const saved = localStorage.getItem("xray-muted-files");
    if (!saved) return new Set<string>();

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? new Set<string>(parsed.filter((item): item is string => typeof item === "string")) : new Set<string>();
  } catch {
    localStorage.removeItem("xray-muted-files");
    return new Set<string>();
  }
}

// ==================== Main Component ====================
export default function ProjectXRay() {
  const { data: session } = useSession();
  const isSignedIn = !!session;
  const githubToken = session?.accessToken as string | undefined;

  const [repoUrl, setRepoUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [terminalLog, setTerminalLog] = useState<string[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);

  const [selectedIssue, setSelectedIssue] = useState<AnalysisIssue | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<RiskZoneSummary | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [showGitHubHelp, setShowGitHubHelp] = useState(false);

  const [resolvedRiskIds, setResolvedRiskIds] = useState<Set<string>>(new Set());

  const [historicalScan, setHistoricalScan] = useState<SavedScan | null>(null);

  type ResultsTab = 'actions' | 'visual' | 'details';
  const [resultsTab, setResultsTab] = useState<ResultsTab>('actions');

  const [lastScannedRepo, setLastScannedRepo] = useState<{ owner: string; repo: string; branch: string } | null>(null);
  const [currentFiles, setCurrentFiles] = useState<Array<{ path: string; content?: string }>>([]);

  const [mutedFiles, setMutedFiles] = useState<Set<string>>(() => loadMutedFiles());

  const toggleMuteFile = (file: string) => {
    setMutedFiles(prev => {
      const next = new Set(prev);
      if (next.has(file)) {
        next.delete(file);
      } else {
        next.add(file);
      }
      localStorage.setItem('xray-muted-files', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const handleReScanFile = async (filePath: string) => {
    if (!lastScannedRepo) {
      toast.error("Run a full scan first");
      return;
    }

    const toastId = toast.loading(`Re-scanning ${filePath}...`);

    try {
      const updatedContent = await fetchFileContent(
        lastScannedRepo.owner,
        lastScannedRepo.repo,
        filePath,
        githubToken || undefined
      );

      const updatedFiles = currentFiles.map(f =>
        f.path === filePath ? { ...f, content: updatedContent.content } : f
      );

      setCurrentFiles(updatedFiles);

      const newResult = new XRayAnalyzer(updatedFiles).analyze();
      setResult(newResult);

      toast.success(`File ${filePath} updated`, { id: toastId });
    } catch {
      toast.error("Could not re-scan the file", { id: toastId });
    }
  };

  const visibleFiles = useMemo(() => {
    return currentFiles.filter(f => !mutedFiles.has(f.path));
  }, [currentFiles, mutedFiles]);

  const visibleResult = useMemo(() => {
    if (!result) return null;
    if (visibleFiles.length === 0) return result;
    return new XRayAnalyzer(visibleFiles).analyze();
  }, [visibleFiles, result]);

  const log = useCallback((message: string, delay = 60) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setTerminalLog((prev) => [...prev.slice(-18), message]);
        resolve();
      }, delay);
    });
  }, []);

  const clearLog = () => setTerminalLog([]);

  // ==================== CORE: Run Real X-Ray Scan ====================
  const runScan = async () => {
    const trimmed = repoUrl.trim();
    if (!trimmed) {
      toast.error("Enter a GitHub repository URL");
      return;
    }

    const parsed = parseGitHubUrl(trimmed);
    if (!parsed) {
      toast.error("Invalid GitHub URL. Example: https://github.com/owner/repo");
      return;
    }

    setIsScanning(true);
    setResult(null);
    clearLog();
    setScanProgress(5);

    let ghToken: string | null = null;

    try {
      // Step 1: Get GitHub token (directly from GitHub OAuth via Auth.js)
      await log("• Connecting to the GitHub API...");
      ghToken = githubToken || null;

      if (ghToken) {
        await log("• ✅ GitHub access token received directly via GitHub OAuth");

        // Quick validation: check if the token works at all
        try {
          const testRes = await fetch("https://api.github.com/user", {
            headers: {
              Authorization: `Bearer ${ghToken}`,
              Accept: "application/vnd.github+json",
            },
          });
          if (testRes.ok) {
            await log("• ✅ Token is valid (basic GitHub access works)");
          } else {
            await log(`• ⚠️ Token is valid, but GitHub returned ${testRes.status} on /user`);
          }
        } catch {
          await log("• Could not verify the token");
        }

        await log("• Fetching repository data...");
      } else if (isSignedIn) {
        await log("• ⚠️ You are signed in, but no GitHub access token was returned");
        await log("• Make sure the GitHub OAuth App requests the scopes: read:user, repo");
      } else {
        await log("• Anonymous access (60 requests/hour limit)");
      }

      setScanProgress(18);

      // Step 2: Repo metadata
      await log(`• Loading metadata for ${parsed.owner}/${parsed.repo}...`);

      // Extra guard
      if (isSignedIn && !ghToken) {
        await log("• Warning: you are authenticated, but no GitHub token is available.");
      }

      const repo = await fetchRepoInfo(parsed.owner, parsed.repo, ghToken || undefined);
      await log(`• Default branch: ${repo.default_branch} ${repo.private ? "(private)" : ""}`);
      setScanProgress(32);

      // Step 3: Full tree
      await log("• Fetching the file tree (git/trees recursive)...");
      const rawTree = await fetchRepoTree(parsed.owner, parsed.repo, repo.default_branch, ghToken || undefined);
      const filtered = filterSourceTree(rawTree);
      await log(`• Filtered ${filtered.length} relevant source files`);
      setScanProgress(48);

      // Step 4: Fetch content of critical and representative files (smart, not the whole repo)
      await log("• Selecting files for deep analysis...");
      const deepAnalysisLimit = ghToken ? 70 : 35;
      const criticalPaths = selectDeepAnalysisFiles(filtered, deepAnalysisLimit);
      await log(`• Deep analysis sample: ${criticalPaths.length} files`);

      const filesWithContent: Array<{ path: string; content?: string; size?: number }> = [];

      // Add all paths first (structure only)
      filtered.forEach((f) => {
        filesWithContent.push({ path: f.path, size: f.size });
      });

      let fetched = 0;
      let completed = 0;
      const skippedFiles: string[] = [];
      const concurrency = 5;

      for (let start = 0; start < criticalPaths.length; start += concurrency) {
        const batch = criticalPaths.slice(start, start + concurrency);

        await Promise.all(batch.map(async (item) => {
          try {
            await log(`  ↳ ${item.path}`, 35);
            const file = await fetchFileContent(parsed.owner, parsed.repo, item.path, ghToken || undefined);
            const idx = filesWithContent.findIndex((x) => x.path === item.path);
            if (idx !== -1) filesWithContent[idx].content = file.content;
            fetched++;
          } catch {
            skippedFiles.push(item.path);
          } finally {
            completed++;
            setScanProgress(48 + Math.floor((completed / Math.max(criticalPaths.length, 1)) * 22));
          }
        }));
      }

      await log(`• Loaded content for ${fetched} critical files`);
      if (skippedFiles.length > 0) {
        await log(`• Could not load ${skippedFiles.length} files; they will be considered by path only`);
      }
      setScanProgress(72);

      // Step 5: Run the rule engine
      await log("• Running the rule engine (15 MVP rules)...");
      await new Promise(r => setTimeout(r, 180));

      const analyzer = new XRayAnalyzer(filesWithContent);
      const analysis = analyzer.analyze();

      await log(`• Found ${analysis.issues.length} issues of varying severity`);
      await log(`• Health Score: ${analysis.healthScore}/100 — ${analysis.verdict.toUpperCase()}`);
      setScanProgress(92);

      // Simulate scanning beam animation timing
      await new Promise(r => setTimeout(r, 260));

      setResult(analysis);
      setResultsTab('actions');

      // Save scan to repository-specific local history.
      const currentRepoInfo = parsed && repo ? {
        owner: parsed.owner,
        repo: parsed.repo,
        branch: repo.default_branch,
      } : undefined;

      if (currentRepoInfo) {
        saveScan(analysis, currentRepoInfo);
      }

      // Save context for per-file re-scans (Bento Grid feature)
      setLastScannedRepo({
        owner: parsed.owner,
        repo: parsed.repo,
        branch: repo.default_branch,
      });
      setCurrentFiles(filesWithContent);

      // Reset resolved-risk markers when a new repository is scanned.
      setResolvedRiskIds(new Set());

      setScanProgress(100);

      await log("• Scan complete. Ready for analysis.");

      // Removed automatic drawer opening after scan (user feedback)

      toast.success(`Scan complete. Health Score: ${analysis.healthScore}`, {
        description: analysis.verdict === "ready" ? "The project looks healthy" : "Risk areas were found",
      });

    } catch (err: unknown) {
      console.error(err);
      const rawMsg = err instanceof Error ? err.message : "Unknown scan error";

      let friendlyMsg = rawMsg;
      let shouldShowGitHubGuide = false;

      // Private repositories: the token exists but lacks access.
      if (isSignedIn && ghToken && (rawMsg.includes("401") || rawMsg.toLowerCase().includes("rejected token") || rawMsg.toLowerCase().includes("insufficient permissions"))) {
        friendlyMsg = "GitHub token received, but it does not have enough permissions for private repositories.";
        shouldShowGitHubGuide = true;
      } 
      // The user is signed in, but Auth.js did not expose a GitHub token.
      else if (isSignedIn && !ghToken && (rawMsg.toLowerCase().includes("private") || rawMsg.includes("404") || rawMsg.toLowerCase().includes("not found"))) {
        friendlyMsg = "You signed in with GitHub, but no access token was returned. The required scope was probably not requested.";
        shouldShowGitHubGuide = true;
      } 
      // Generic private repository access problems.
      else if (rawMsg.toLowerCase().includes("private")) {
        friendlyMsg = rawMsg;
        shouldShowGitHubGuide = true;
      } 
      // Repository not found.
      else if (rawMsg.includes("404") || rawMsg.toLowerCase().includes("not found")) {
        friendlyMsg = "The repository was not found, or you do not have access to it. If it is private, GitHub OAuth must be configured correctly.";
        shouldShowGitHubGuide = true;
      }

      await log(`✕ Error: ${friendlyMsg}`);

      toast.error("Scan failed", {
        description: friendlyMsg,
        duration: 12000,
        action: shouldShowGitHubGuide ? {
          label: "Open guide",
          onClick: () => setShowGitHubHelp(true),
        } : undefined,
      });

      // Automatically show the troubleshooting guide for private repository access failures.
      if (shouldShowGitHubGuide) {
        setTimeout(() => {
          setShowGitHubHelp(true);
        }, 800);
      }
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanProgress(0), 900);
    }
  };

  // ==================== Safe Repair Prompt ====================
  function buildLocalPrompt(issue: AnalysisIssue) {
    const file = selectedFile || issue.file || "the specified file";
    return `Task: fix the risk "${issue.ruleName}" in the file ${file}.

Problem: ${issue.message}
${issue.details ? `Details: ${issue.details}\n` : ""}Product risk: ${issue.businessImpact || issue.impact}
Expected fix: ${issue.suggestedAction || "Fix the issue with the smallest possible change."}

Constraints:
- Read the file first and find the smallest possible area to change.
- Change only this file and only the code related to the specified risk.
- Do not change styles, UI components, database schema, migrations, config, or public APIs unless it is clearly necessary.
- Do not add new dependencies.
- Preserve the current code style and naming.

After the change:
- Run the available project checks or explain why they were not run.
- Briefly list the changed areas and the remaining risks.`;
  }

  const copyCurrentPrompt = () => {
    const promptToCopy = buildLocalPrompt(selectedIssue!);
    navigator.clipboard.writeText(promptToCopy);
    toast.success("Prompt copied", {
      description: "Ready-to-use task for an AI agent",
    });
  };

  // === Markdown report generation for export and clipboard actions ===
  const generateReportMarkdown = (): string | null => {
    if (!visibleResult || !lastScannedRepo) return null;

    const date = new Date().toISOString().split('T')[0];
    const repoName = `${lastScannedRepo.owner}/${lastScannedRepo.repo}`;

    let md = `# Project X-Ray Report\n\n`;
    md += `**Repository:** ${repoName}\n`;
    md += `**Date:** ${date}\n`;
    md += `**Health Score:** ${visibleResult.healthScore}/100\n`;
    md += `**Verdict:** ${visibleResult.verdictTitle}\n\n`;

    md += `## Summary\n\n${visibleResult.summary}\n\n`;

    if (visibleResult.topRisks.length > 0) {
      md += `## Top Risks\n\n`;
      visibleResult.topRisks.forEach((risk, i) => {
        md += `### ${i + 1}. ${risk.ruleName} (${risk.severity})\n\n`;
        if (risk.simpleExplanation) {
          md += `**In simple terms:** ${risk.simpleExplanation}\n\n`;
        }
        md += `**Business risk:** ${risk.businessImpact || risk.impact}\n\n`;
        md += `**What to do:** ${risk.suggestedAction}\n\n`;
        md += `---\n\n`;
      });
    }

    if (visibleResult.scoreBreakdown?.items.length) {
      md += `## Health Score Breakdown\n\n`;
      visibleResult.scoreBreakdown.items.forEach(item => {
        md += `- **${item.ruleName}** — ${item.count} matches, penalty: -${item.totalPenalty}\n`;
      });
      md += `\n`;
    }

    md += `## All Findings\n\n`;
    visibleResult.issues.forEach((issue, i) => {
      md += `${i + 1}. **${issue.ruleName}** (${issue.severity})\n`;
      if (issue.file) md += `   File: \`${issue.file}\`\n`;
      if (issue.simpleExplanation) md += `   ${issue.simpleExplanation}\n`;
      md += `\n`;
    });

    md += `\n---\n\n*Generated by Project X-Ray (zero-backend analysis)*\n`;
    return md;
  };

  const exportCurrentReportAsMarkdown = () => {
    const md = generateReportMarkdown();
    if (!md || !lastScannedRepo) {
      toast.error("No data to export");
      return;
    }

    const date = new Date().toISOString().split('T')[0];
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xray-${lastScannedRepo.owner}-${lastScannedRepo.repo}-${date}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Markdown report downloaded", {
      description: `xray-${lastScannedRepo.owner}-${lastScannedRepo.repo}.md`,
    });
  };

  const copyReportAsMarkdown = async () => {
    const md = generateReportMarkdown();
    if (!md) {
      toast.error("No data to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(md);
      toast.success("Markdown copied", {
        description: "You can paste it into Notion, Linear, Cursor, and similar tools.",
      });
    } catch {
      toast.error("Could not copy");
    }
  };

  const getSortedIssuesForAgent = () => {
    if (!visibleResult) return [];

    return [...visibleResult.issues].sort((a, b) => {
      const severityDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.confidence - a.confidence;
    });
  };

  const buildAgentIssueTask = (issue: AnalysisIssue, index: number) => {
    const file = issue.file || "project level";
    const evidence = issue.evidenceFiles?.length
      ? `\n**Files to review:** ${issue.evidenceFiles.map((path) => `\`${path}\``).join(", ")}\n`
      : "";
    const openInstruction = issue.file
      ? `Open \`${file}\` and find the smallest area that causes this risk.`
      : "Start with the files listed in the \"Files to review\" block and find the smallest area that causes this risk.";

    return `### ${index + 1}. ${issue.ruleName} (${SEVERITY_LABEL[issue.severity]})

**File:** \`${file}\`  
${evidence}
**Problem:** ${issue.message}  
${issue.simpleExplanation ? `**In simple terms:** ${issue.simpleExplanation}\n` : ""}**Product risk:** ${issue.businessImpact || issue.impact}  
**Expected fix:** ${issue.suggestedAction || "Fix it with the smallest possible change in the specified area."}

**Instructions for the AI agent:**
1. ${openInstruction}
2. Fix only this risk. Do not do any incidental refactoring.
3. Do not change other files unless it is required to complete the fix. If you need to change another file, explain why first.
4. After the change, run a relevant check or explain why it could not be run.
`;
  };

  const generateAgentTaskMarkdown = (): string | null => {
    if (!visibleResult || !lastScannedRepo) return null;

    const date = new Date().toISOString().split('T')[0];
    const repoName = `${lastScannedRepo.owner}/${lastScannedRepo.repo}`;
    const issues = getSortedIssuesForAgent();
    const topIssues = issues.slice(0, 10);

    let md = `# AI Repair Task: ${repoName}\n\n`;
    md += `Generated by Project X-Ray: ${date}.\n\n`;
    md += `## Goal\n\n`;
    md += `Reduce launch risk by fixing the highest-priority confirmed issues from the Project X-Ray report.\n\n`;
    md += `Health Score: **${visibleResult.healthScore}/100**  
Verdict: **${visibleResult.verdictTitle}**  
Deep-scanned files: **${visibleResult.criticalFilesFetched}/${visibleResult.scannedFiles}**\n\n`;

    md += `## Rules for the AI agent\n\n`;
    md += `- Work from the highest risk down to lower risk.\n`;
    md += `- Make small changes that are easy to verify in review. Do not rewrite the architecture unless the task explicitly requires it.\n`;
    md += `- Preserve public APIs, UI behavior, names, and code style where possible.\n`;
    md += `- Do not add dependencies unless you explain why it is not safe to fix it without them.\n`;
    md += `- Do not touch unrelated styles, copy, migrations, or configuration.\n`;
    md += `- After each fix, run the narrowest relevant check. At the end, run broader project checks if available.\n`;
    md += `- Stop and ask for review if the fix requires a product decision, auth-policy change, payment behavior change, or database schema change.\n\n`;

    md += `## Recommended Order\n\n`;
    if (topIssues.length === 0) {
      md += `No action-required risks were found.\n\n`;
    } else {
      topIssues.forEach((issue, index) => {
        md += buildAgentIssueTask(issue, index);
        md += `\n---\n\n`;
      });
    }

    md += `## Acceptance Criteria\n\n`;
    md += `- For each fixed issue, briefly explain what changed and why.\n`;
    md += `- Project checks pass, or failures are documented with exact commands and a short output summary.\n`;
    md += `- No unrelated files are changed.\n`;
    md += `- Every skipped risk is documented with the reason it was skipped.\n\n`;

    if (issues.length > topIssues.length) {
      md += `## Remaining Lower-Priority Risks\n\n`;
      issues.slice(topIssues.length).forEach((issue, index) => {
        md += `${index + 1}. **${issue.ruleName}** (${SEVERITY_LABEL[issue.severity]})`;
        if (issue.file) md += ` — \`${issue.file}\``;
        md += `\n`;
      });
      md += `\n`;
    }

    return md;
  };

  const exportAgentTaskAsMarkdown = () => {
    const md = generateAgentTaskMarkdown();
    if (!md || !lastScannedRepo) {
      toast.error("No data for the AI task");
      return;
    }

    const date = new Date().toISOString().split('T')[0];
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xray-ai-task-${lastScannedRepo.owner}-${lastScannedRepo.repo}-${date}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("AI task Markdown downloaded", {
      description: "Pass the file to Claude Code, Codex, or Cursor",
    });
  };

  const copyAgentTaskAsMarkdown = async () => {
    const md = generateAgentTaskMarkdown();
    if (!md) {
      toast.error("No data for the AI task");
      return;
    }

    try {
      await navigator.clipboard.writeText(md);
      toast.success("AI task copied", {
        description: "You can paste it into Claude Code, Codex, or Cursor",
      });
    } catch {
      toast.error("Could not copy the AI task");
    }
  };

  // ==================== Re-scan ====================
  const rescan = () => {
    if (repoUrl) runScan();
  };

  // ==================== Load Example ====================
  const loadExample = (url: string) => {
    setRepoUrl(url);
    // Auto scan after short delay for demo joy
    setTimeout(() => {
      // Don't auto-run expensive scans on example click in prod, user should press button
    }, 50);
  };

  // ==================== Render ====================
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-cyan-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-white flex items-center justify-center">
                <Shield className="w-4 h-4 text-black" />
              </div>
              <div>
                <span className="font-semibold tracking-[-1.2px] text-xl">Project X-Ray</span>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] border-white/20 text-white/60">MVP 3.1</Badge>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <a
              href="https://github.com/tolom/project-xray"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
            >
              <GitBranch className="w-4 h-4" />
              <span>GitHub</span>
            </a>
            <a href="#docs" className="text-white/60 hover:text-white transition-colors">Docs</a>

            <div className="w-px h-4 bg-white/20 mx-1" />

            {isSignedIn ? (
              <div className="flex items-center gap-2">
                {/* Clickable GitHub connection status. */}
                <button
                  onClick={() => setShowGitHubHelp(true)}
                  className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                  title="Configure GitHub access"
                >
                  <div className={`h-1.5 w-1.5 rounded-full ${githubToken ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span>
                    {githubToken 
                      ? "Private repository access enabled" 
                      : "Public only (OAuth setup required)"}
                  </span>
                </button>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => signOut()}
                  className="gap-2 hover:bg-white/10 hover:text-white"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={rescan} 
                  disabled={!result || isScanning} 
                  className="gap-2 hover:bg-white/10 hover:text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-scan
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="gap-2 border-white/30 !hover:bg-white !hover:text-black font-medium transition-colors"
                onClick={() => signIn("github")}
              >
                <GitBranch className="w-4 h-4" /> Sign in with GitHub
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero / input zone, shown only before the first scan. */}
      {!result && (
        <div className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-xs tracking-[2px] mb-6 border border-white/10">
            ZERO-BACKEND • CLIENT-SIDE • 100% PRIVATE
          </div>

          <h1 className="text-6xl font-semibold tracking-[-3.6px] leading-none mb-4">
            Find the fragility<br />before users do
          </h1>
          <p className="text-xl text-white/60 max-w-md mx-auto mb-10 tracking-tight">
            Automated audits for AI-generated codebases. No code is sent to a server.
          </p>

          {/* Input */}
          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            <div className="flex gap-3">
              <Input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="flex-1 h-14 text-lg bg-zinc-950 border-white/15 focus:border-white/40 placeholder:text-white/30"
                disabled={isScanning}
                onKeyDown={(e) => e.key === "Enter" && !isScanning && runScan()}
              />
                <Button
                  onClick={runScan}
                  disabled={isScanning || !repoUrl.trim()}
                  size="lg"
                  className="h-14 px-9 text-base font-medium gap-2 bg-white text-black hover:bg-white/90 active:bg-white/80 disabled:bg-white/10 disabled:text-white/40"
                >
                  {isScanning ? (
                  <>Scanning...</>
                  ) : (
                  <>
                    <Play className="w-4 h-4" /> Start X-Ray Scan
                  </>
                )}
              </Button>
            </div>

            {/* Examples */}
            <div className="flex flex-wrap gap-2 justify-center text-xs text-white/50">
              Examples:
              {EXAMPLE_REPOS.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => loadExample(ex)}
                  className="hover:text-white underline-offset-2 hover:underline transition-colors"
                >
                  {ex.replace("https://github.com/", "")}
                </button>
              ))}
            </div>
          </div>

          {/* Private repository access banner. */}
          {isSignedIn && !githubToken && (
              <div 
              onClick={() => setShowGitHubHelp(true)}
              className="mt-6 max-w-2xl mx-auto cursor-pointer rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-300 hover:bg-amber-950/30 transition-colors"
            >
              You signed in with GitHub, but private repositories require an OAuth App configured by the tool owner. 
              <span className="underline ml-1">Learn more →</span>
            </div>
          )}
        </div>
      )}

      {/* Compact results header. */}
      {result && (
        <div className="border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-6 min-h-12 py-2 flex flex-col gap-2 text-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-white/50">Analysis:</span>
              <span className="font-mono text-white/90">
                {lastScannedRepo ? `${lastScannedRepo.owner}/${lastScannedRepo.repo}` : "repository"}
              </span>
              <span className="px-2 py-0.5 rounded bg-white/5 text-emerald-400 font-medium tabular-nums">
                {result.healthScore}/100
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportAgentTaskAsMarkdown}
                className="h-8 px-3 text-xs"
              >
                AI Task .md
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={copyAgentTaskAsMarkdown}
                className="h-8 px-3 text-xs text-white/70 hover:text-white"
              >
                Copy AI task
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={exportCurrentReportAsMarkdown}
                className="h-8 px-3 text-xs text-white/70 hover:text-white"
              >
                Report .md
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={copyReportAsMarkdown}
                className="h-8 px-3 text-xs text-white/70 hover:text-white"
              >
                Copy
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setResult(null);
                  setTerminalLog([]);
                  setHistoricalScan(null);
                  setResolvedRiskIds(new Set());
                  setResultsTab('actions');
                }}
                className="h-8 px-3 text-xs text-white/70 hover:text-white"
              >
                New analysis
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={rescan} 
                disabled={isScanning}
                className="h-8 px-3 text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-scan
              </Button>
            </div>
          </div>
        </div>
      )}

      {isScanning && (
        <div className="max-w-3xl mx-auto px-6 pb-8 space-y-3">
          <div className="rounded-xl border border-white/10 bg-zinc-950 p-5">
            <div className="flex items-center justify-between text-xs text-white/55 mb-3">
              <span className="tracking-[2px]">DEEP STRUCTURAL ANALYSIS</span>
              <span>{scanProgress}%</span>
            </div>
            <Progress value={scanProgress} className="h-1 bg-white/10" />
          </div>

          {/* Terminal log while scanning. */}
          <TerminalLog logs={terminalLog} isScanning={isScanning} compact />
        </div>
      )}

      {/* === Results area with tabs to keep the interface focused === */}
      {result && (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
          {/* Lightweight result tabs. */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg border border-white/15 bg-zinc-950 p-1">
              <button
                onClick={() => setResultsTab('actions')}
                className={`rounded-md px-5 py-1.5 text-sm transition-colors ${
                  resultsTab === 'actions'
                    ? 'bg-white text-black font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                Action
              </button>
              <button
                onClick={() => setResultsTab('visual')}
                className={`rounded-md px-5 py-1.5 text-sm transition-colors ${
                  resultsTab === 'visual'
                    ? 'bg-white text-black font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                By zone
              </button>
              <button
                onClick={() => setResultsTab('details')}
                className={`rounded-md px-5 py-1.5 text-sm transition-colors ${
                  resultsTab === 'details'
                    ? 'bg-white text-black font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                Details
              </button>
            </div>
          </div>

          {/* Actions tab: the shortest and most important view. */}
          {resultsTab === 'actions' && (
            <div className="max-w-3xl mx-auto space-y-4">
              {visibleResult && lastScannedRepo && (
                <ScanHistoryComparison 
                  result={visibleResult} 
                  repo={lastScannedRepo} 
                />
              )}

              {visibleResult && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-5">
                  <div className="text-xs tracking-[2px] text-emerald-300/80">NEXT STEP FOR THE AI AGENT</div>
                  <div className="mt-2 text-lg font-semibold tracking-tight">Collect all risks into one working file</div>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">
                    AI Task Markdown turns scan results into a step-by-step task for Claude Code, Codex, or Cursor:
                    priorities, constraints, acceptance criteria, and a change list without manually copying every risk.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={exportAgentTaskAsMarkdown} size="sm" className="bg-white text-black hover:bg-white/90">
                      Download AI Task .md
                    </Button>
                    <Button onClick={copyAgentTaskAsMarkdown} size="sm" variant="outline">
                      Copy AI task
                    </Button>
                  </div>
                </div>
              )}

              {visibleResult && (
                <NextSteps
                  result={visibleResult}
                  resolvedIds={resolvedRiskIds}
                  onToggleResolved={(id) => {
                    setResolvedRiskIds(prev => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    });
                  }}
                  onOpenDrawer={(issue, file) => {
                    setSelectedIssue(issue || null);
                    setSelectedFile(file || null);
                    setSelectedZone(null);
                    setDrawerOpen(true);
                  }}
                  onReScan={rescan}
                />
              )}
            </div>
          )}

          {/* Risk zones tab. */}
          {resultsTab === 'visual' && visibleResult && (
            <div className="space-y-6">
              <RiskZones
                result={visibleResult}
                onOpenRisk={(issue, file) => {
                  setSelectedIssue(issue || null);
                  setSelectedFile(file || null);
                  setSelectedZone(null);
                  setDrawerOpen(true);
                }}
                onOpenZone={(zone) => {
                  setSelectedZone(zone);
                  setSelectedIssue(null);
                  setSelectedFile(null);
                  setDrawerOpen(true);
                }}
              />

              {/* Keep the previous grid view available as an alternate view. */}
              <div className="pt-4 border-t border-white/10">
                <div className="text-xs text-white/50 mb-3 text-center">Alternate view</div>
                <BentoGrid
                  result={visibleResult}
                  fullResult={result}
                  onOpenDrawer={(issue, file) => {
                    setSelectedIssue(issue || null);
                    setSelectedFile(file || null);
                    setSelectedZone(null);
                    setDrawerOpen(true);
                  }}
                  mutedFiles={mutedFiles}
                  onToggleMute={toggleMuteFile}
                  onReScanFile={handleReScanFile}
                />
              </div>
            </div>
          )}

          {/* Details tab for heavier secondary information. */}
          {resultsTab === 'details' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <TerminalLog
                logs={terminalLog}
                isScanning={isScanning}
                compact
                showHeader={false}
              />

              {visibleResult?.scoreBreakdown && visibleResult.scoreBreakdown.items.length > 0 && (
                <HealthScoreBreakdown
                  breakdown={visibleResult.scoreBreakdown}
                  currentScore={visibleResult.healthScore}
                />
              )}

              <ScanHistoryList 
                repo={lastScannedRepo || undefined} 
                onOpenHistorical={(scan) => setHistoricalScan(scan)}
              />

              <ResultsGuide className="max-w-3xl" />
            </div>
          )}
        </div>
      )}

      {/* Footer hint */}
      <div className="text-center text-[11px] text-white/40 py-8 tracking-wider">
        100% client-side analysis • the GitHub token stays in your browser • source code never leaves the device
      </div>

      {/* ==================== RISK DETAIL SHEET (right side) + PROMPT MODAL ==================== */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent className="h-full w-full max-w-xl overflow-hidden border-l border-white/10 bg-zinc-950 font-sans text-white sm:max-w-lg lg:max-w-xl">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col">
            <DrawerHeader className="shrink-0 border-b border-white/10 px-6 py-5">
              <DrawerTitle className="flex items-center gap-3 text-xl tracking-tight text-white">
                {selectedIssue ? selectedIssue.ruleName : selectedZone ? selectedZone.label : "File without detected risks"}
                {selectedIssue && (
                  <Badge className={`${SEVERITY_COLOR[selectedIssue.severity]} text-black/90`}>{selectedIssue.severity}</Badge>
                )}
                {selectedZone && !selectedIssue && (
                  <Badge variant="outline" className="border-white/15 text-white/70">{selectedZone.issues.length} risks</Badge>
                )}
              </DrawerTitle>
                <div className="mt-1 text-xs leading-relaxed text-white/50">
                {selectedZone && !selectedIssue
                  ? "All risks in the selected zone are sorted by severity."
                  : "Ready-to-use prompt for Cursor / Claude Code / Windsurf. It fixes only this issue."}
              </div>
              <DrawerDescription className="pt-1 text-sm leading-relaxed text-white/60">
                {selectedFile && <span className="font-mono text-sm text-white/40">{selectedFile}</span>}
                {selectedZone && !selectedIssue && (
                  <span className="text-sm text-white/45">
                    {selectedZone.name} • {selectedZone.percent}% of all detected risks
                  </span>
                )}
              </DrawerDescription>
            </DrawerHeader>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
              {selectedIssue ? (
                <>
                  {/* Plain-language explanation for non-specialist users. */}
                  {selectedIssue.simpleExplanation && (
                    <div>
                      <div className="uppercase text-xs tracking-[1px] text-emerald-400 mb-2">IN SIMPLE TERMS</div>
                      <p className="text-base leading-relaxed text-white/90">
                        {selectedIssue.simpleExplanation}
                      </p>
                    </div>
                  )}

                  <div>
                    <div className="uppercase text-xs tracking-[1px] text-white/50 mb-2">WHY IT MATTERS</div>
                    <p className="text-base leading-relaxed text-white/90">{selectedIssue.details || selectedIssue.message}</p>
                  </div>

                  <div>
                    <div className="uppercase text-xs tracking-[1px] text-white/50 mb-2">WHAT CAN BREAK</div>
                    <p className="text-base leading-relaxed text-white/90">{selectedIssue.businessImpact || selectedIssue.impact}</p>
                  </div>

                  <div>
                    <div className="uppercase text-xs tracking-[1px] text-white/50 mb-2">WHAT TO DO</div>
                    <p className="text-base leading-relaxed text-white/90">{selectedIssue.suggestedAction}</p>
                  </div>

                  {/* Open the focused repair prompt modal. */}
                  <div className="pt-4 border-t border-white/10">
                    <Button
                      onClick={() => {
                        setDrawerOpen(false);
                        setPromptModalOpen(true);
                      }}
                      className="w-full gap-2 bg-white text-black hover:bg-white/90"
                      size="lg"
                    >
                      Open the fix prompt in Cursor / Claude
                    </Button>
                    <p className="text-[11px] text-white/50 text-center mt-2">
                      A focused window with a ready-to-use isolated prompt will open
                    </p>
                  </div>
                </>
              ) : selectedZone ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-3">
                      <div className="text-xs text-red-300">critical</div>
                      <div className="mt-1 text-2xl font-semibold tabular-nums">{selectedZone.critical}</div>
                    </div>
                    <div className="rounded-xl border border-orange-500/20 bg-orange-950/10 p-3">
                      <div className="text-xs text-orange-300">high</div>
                      <div className="mt-1 text-2xl font-semibold tabular-nums">{selectedZone.high}</div>
                    </div>
                    <div className="rounded-xl border border-yellow-500/20 bg-yellow-950/10 p-3">
                      <div className="text-xs text-yellow-300">medium</div>
                      <div className="mt-1 text-2xl font-semibold tabular-nums">{selectedZone.medium}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-white/50">low</div>
                      <div className="mt-1 text-2xl font-semibold tabular-nums">{selectedZone.low}</div>
                    </div>
                  </div>

                  {[...selectedZone.issues]
                    .sort((a, b) => {
                      const severityDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
                      if (severityDiff !== 0) return severityDiff;
                      return b.confidence - a.confidence;
                    })
                    .map((issue, index) => (
                      <button
                        key={`${issue.ruleId}-${issue.file || "unknown"}-${index}`}
                        onClick={() => {
                          setSelectedIssue(issue);
                          setSelectedFile(issue.file || null);
                          setSelectedZone(null);
                        }}
                        className="w-full rounded-xl border border-white/10 bg-black/30 p-4 text-left transition-colors hover:border-white/25 hover:bg-white/5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className={`h-2 w-2 shrink-0 rounded-full ${SEVERITY_COLOR[issue.severity]}`} />
                              <span className="truncate text-sm font-medium text-white/95">{issue.ruleName}</span>
                            </div>
                            <div className="mt-1 font-mono text-xs text-white/45">{issue.file || "file not specified"}</div>
                            <div className="mt-2 line-clamp-2 text-sm leading-snug text-white/65">
                              {issue.simpleExplanation || issue.message}
                            </div>
                          </div>
                          <Badge className={`${SEVERITY_COLOR[issue.severity]} shrink-0 text-black/90`}>
                            {issue.severity}
                          </Badge>
                        </div>
                      </button>
                    ))}
                </div>
              ) : (
                <div className="text-white/60 py-6">This file passed all 15 checks without findings.</div>
              )}
            </div>

            <DrawerFooter className="shrink-0 border-t border-white/10 px-6 py-5">
              <Button variant="ghost" onClick={() => setDrawerOpen(false)} className="text-white/70">Close</Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ==================== FOCUSED PROMPT MODAL (centered, prominent) ==================== */}
      <Dialog open={promptModalOpen} onOpenChange={setPromptModalOpen}>
        <DialogContent className="!max-w-5xl w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden bg-zinc-950 border-white/10 p-0 text-white sm:!max-w-5xl">
          <div className="flex max-h-[calc(100vh-2rem)] flex-col">
            <DialogHeader className="border-b border-white/10 px-6 py-5 pr-14">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-2xl tracking-tight">
                    Safe Repair Prompt
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-white/60">
                    Isolated task for fixing one issue in <span className="font-mono text-white/80">{selectedFile || "the specified file"}</span>.
                  </DialogDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPromptModalOpen(false)}
                  className="shrink-0"
                >
                  Close
                </Button>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-4">
                {selectedIssue && (
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <div className="text-xs uppercase tracking-[1px] text-white/45 mb-1">ISSUE</div>
                    <div className="font-medium">{selectedIssue.ruleName}</div>
                    <div className="text-sm text-white/70 mt-1">{selectedIssue.simpleExplanation}</div>
                  </div>
                )}

                <div>
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-medium text-white/90">Prompt for Cursor / Claude Code / Codex</div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={copyCurrentPrompt} size="sm" className="gap-2 bg-white text-black hover:bg-white/90">
                        <Copy className="w-4 h-4" /> Copy
                      </Button>
                    </div>
                  </div>

                  <pre className="min-h-[260px] max-h-[52vh] overflow-auto whitespace-pre-wrap rounded-xl border border-white/15 bg-black p-5 font-mono text-sm leading-relaxed text-white/95">
                    {selectedIssue ? buildLocalPrompt(selectedIssue) : "Select a risk to generate the prompt."}
                  </pre>

                  <div className="mt-2 flex items-center gap-2 text-[11px] text-white/50">
                    The prompt is limited to one file and one issue.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-white/10 px-6 py-4 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setPromptModalOpen(false)} className="text-white/70 hover:text-white">
                Close
              </Button>
              <Button onClick={copyCurrentPrompt} className="gap-2 bg-white text-black hover:bg-white/90">
                <Copy className="w-4 h-4" /> Copy prompt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== GITHUB AUTH HELP MODAL ==================== */}
      {showGitHubHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={() => setShowGitHubHelp(false)}>
          <div className="max-w-xl w-full" onClick={e => e.stopPropagation()}>
            <GitHubAuthHelp 
              onClose={() => setShowGitHubHelp(false)} 
            />
          </div>
        </div>
      )}

      {/* ==================== HISTORICAL SCAN MODAL ==================== */}
      {historicalScan && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" 
          onClick={() => setHistoricalScan(null)}
        >
          <div 
            className="max-w-4xl w-full max-h-[90vh] overflow-auto bg-zinc-950 border border-white/10 rounded-2xl p-6" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-sm text-white/50">Historical result</div>
                <div className="text-xl font-semibold">
                  {new Date(historicalScan.timestamp).toLocaleString()}
                </div>
              </div>
              <button 
                onClick={() => setHistoricalScan(null)}
                className="text-white/50 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="rounded-xl border border-white/10 p-4">
                <div className="text-xs text-white/50">Health Score</div>
                <div className="text-4xl font-semibold tabular-nums mt-1">{historicalScan.healthScore}</div>
              </div>
              <div className="rounded-xl border border-white/10 p-4">
                <div className="text-xs text-white/50">Critical risks</div>
                <div className="text-4xl font-semibold tabular-nums mt-1 text-red-400">{historicalScan.criticalCount}</div>
              </div>
              <div className="rounded-xl border border-white/10 p-4">
                <div className="text-xs text-white/50">High risks</div>
                <div className="text-4xl font-semibold tabular-nums mt-1 text-orange-400">{historicalScan.highCount}</div>
              </div>
            </div>

            <div className="text-center text-white/60 py-8 border border-white/10 rounded-xl">
              Full historical result browsing will be added in a future update.<br />
              For now, only the main metrics are available.
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="ghost" onClick={() => setHistoricalScan(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
