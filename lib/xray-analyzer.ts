/**
 * XRayAnalyzer — Client-Side Rule Engine (Phase 3)
 * Zero-dependency, deterministic, RegExp + heuristics based.
 * All analysis happens in the browser. No code leaves the device.
 */

export interface AnalysisIssue {
  ruleId: number;
  ruleName: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number; // 0-1
  file?: string;
  /** Files that triggered the heuristic. Used for manual verification and exports. */
  evidenceFiles?: string[];
  message: string;
  details?: string;
  impact: string; // Technical "what can break" explanation.

  /** Plain-language risk explanation for non-specialist users. */
  simpleExplanation?: string;

  /** Product or business impact. */
  businessImpact?: string;

  /** Recommended action. */
  suggestedAction?: string;
}

export interface FileNode {
  id: string;
  path: string;
  type: "file";
  size: number; // line count when content is available
  hasContent: boolean;
  cluster: string; // Auth | Billing | Database | Routes | Components | Config | Other
}

export interface ScoreBreakdownItem {
  ruleId: number;
  ruleName: string;
  severity: AnalysisIssue["severity"];
  count: number;
  totalPenalty: number;
}

export interface ScoreBreakdown {
  totalPenalty: number;
  items: ScoreBreakdownItem[];
  /** Theoretical score gain from fixing top risks. */
  potentialGain: number;
}

// === Dependency graph types for Rule 14 ===
export type FilePath = string;

/** Directed import graph: key = imported file, value = files that import it. */
export type ImportGraph = Map<FilePath, Set<FilePath>>;

export interface DependencyStats {
  direct: number;
  transitive: number;
  total: number;
}

/** Extended dependency information for the UI. */
export interface DependencyInfo extends DependencyStats {
  /** Top dependent files, including direct and selected transitive dependents. */
  dependents: string[];
}

export interface ScanResult {
  healthScore: number; // 0-100
  verdict: "ready" | "caution" | "high_risk";
  verdictTitle: string;
  verdictDescription: string;
  summary: string;
  issues: AnalysisIssue[];
  topRisks: AnalysisIssue[]; // Top 3 by severity*confidence*impact
  nodes: FileNode[];
  scannedFiles: number;
  criticalFilesFetched: number;
  scoreBreakdown?: ScoreBreakdown;
}

const CLUSTERS = {
  auth: ["auth", "clerk", "supabase", "login", "session", "middleware", "proxy"],
  billing: ["stripe", "billing", "subscription", "payment", "price", "invoice", "webhook"],
  database: ["prisma", "supabase", "db", "database", "sql", "query", "model"],
  routes: ["api/", "routes/", "app/api", "server/"],
  components: ["components/", "ui/", "app/"],
  config: [".env", "package.json", "config", "next.config"],
};

const PROTECTED_ROUTE_KEYWORDS = ["dashboard", "admin", "account", "settings", "profile"];

function classifyCluster(path: string): string {
  const p = path.toLowerCase();
  for (const [cluster, keywords] of Object.entries(CLUSTERS)) {
    if (keywords.some((k) => p.includes(k))) {
      return cluster.charAt(0).toUpperCase() + cluster.slice(1);
    }
  }
  if (p.includes("hook")) return "Hooks";
  if (p.includes("lib/") || p.includes("utils/")) return "Utils";
  return "Other";
}

function isSourceFile(path: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(path.toLowerCase());
}

function isRouteLikeFile(path: string): boolean {
  const p = path.toLowerCase();
  return (
    isSourceFile(p) &&
    (
      /(^|\/)app\/.*\/(page|layout|route)\.(ts|tsx|js|jsx)$/.test(p) ||
      /(^|\/)pages\/.*\.(ts|tsx|js|jsx)$/.test(p) ||
      /(^|\/)src\/app\/.*\/(page|layout|route)\.(ts|tsx|js|jsx)$/.test(p) ||
      /(^|\/)src\/pages\/.*\.(ts|tsx|js|jsx)$/.test(p)
    )
  );
}

function hasProtectedRouteKeyword(path: string): boolean {
  const p = path.toLowerCase();
  return PROTECTED_ROUTE_KEYWORDS.some((keyword) => p.includes(keyword));
}

function hasAuthEvidence(content?: string): boolean {
  const c = (content || "").toLowerCase();
  return /auth\(|getserversession|usesession|currentuser|requireauth|withauth|clerk|next-auth|session|jwt|req\.auth|supabase\.auth/.test(c);
}

export class XRayAnalyzer {
  private files: Array<{ path: string; content?: string; size?: number }>;

  /** Directed import graph: tracks incoming dependencies for each file. */
  private importGraph: ImportGraph = new Map();

  constructor(files: Array<{ path: string; content?: string; size?: number }>) {
    this.files = files;
  }

  analyze(): ScanResult {
    const issues: AnalysisIssue[] = [];
    const nodes: FileNode[] = [];

    // Build the import graph once for every rule that needs it, especially Rule 14.
    this.buildImportGraph();

    // Build nodes from structure
    for (const f of this.files) {
      const hasContent = typeof f.content === "string";
      const lines = hasContent ? (f.content!.match(/\n/g) || []).length + 1 : 0;
      nodes.push({
        id: f.path,
        path: f.path,
        type: "file",
        size: lines,
        hasContent,
        cluster: classifyCluster(f.path),
      });
    }

    // === RULE IMPLEMENTATIONS (MVP 15 rules, starting with core ones) ===

    // Rule 1: Auth route exposure (middleware missing + open dashboards)
    this.checkAuthExposure(issues);

    // Rule 2: Auth + Billing coupling
    this.checkAuthBillingCoupling(issues);

    // Rule 3: Stripe webhook fragility
    this.checkStripeWebhook(issues);

    // Rule 6: Env var exposure (most critical)
    this.checkEnvExposure(issues);

    // Rule 7: Oversized files
    this.checkOversizedFiles(issues, nodes);

    // Rule 9: Temporary fix markers
    this.checkTodoMarkers(issues);

    // Rule 4: Client-side trust (dangerous price/role mutation)
    this.checkClientTrust(issues);

    // Rule 5: Supabase RLS uncertainty
    this.checkSupabaseRls(issues, nodes);

    // Rule 8: Repeated business logic
    this.checkRepeatedBusinessLogic(issues);

    // Rule 10: Too many responsibilities in one module
    this.checkMixedResponsibilities(issues);

    // Rule 11 + 12: Dangerous DB ops & missing error handling (lightweight)
    this.checkDangerousOps(issues);

    // Rule 14: Sensitive modules with high dependency count
    this.checkSensitiveDependencyCount(issues);

    // Rule 15: AI-chaos smell (composite)
    this.checkAiChaos(issues);

    // Additional MVP rules (light)
    this.checkMissingOnboardingPaths(issues, nodes);

    const enrichedIssues = issues.map((issue) => this.enrichIssue(issue));

    // Calculate Health Score
    const healthScore = this.calculateHealthScore(enrichedIssues);

    const verdict = healthScore >= 85 ? "ready" : healthScore >= 60 ? "caution" : "high_risk";
    const verdictCopy = this.generateVerdictCopy(verdict, healthScore, enrichedIssues);

    const topRisks = [...enrichedIssues]
      .filter((i) => i.confidence > 0.5)
      .sort((a, b) => {
        const scoreA = this.severityScore(a.severity) * a.confidence;
        const scoreB = this.severityScore(b.severity) * b.confidence;
        return scoreB - scoreA;
      })
      .slice(0, 3);

    const summary = this.generateSummary(healthScore, enrichedIssues.length, topRisks);

    const scoreBreakdown = this.calculateScoreBreakdown(enrichedIssues, topRisks);

    return {
      healthScore,
      verdict,
      verdictTitle: verdictCopy.title,
      verdictDescription: verdictCopy.description,
      summary,
      issues: enrichedIssues,
      topRisks,
      nodes,
      scannedFiles: this.files.length,
      criticalFilesFetched: this.files.filter((f) => f.content).length,
      scoreBreakdown,
    };
  }

  private enrichIssue(issue: AnalysisIssue): AnalysisIssue {
    const defaultAction = "Open the file, fix the identified risk area, and run X-Ray again.";

    const copyByRule: Record<number, {
      simpleExplanation?: string;
      businessImpact: string;
      suggestedAction: string;
    }> = {
      1: {
        simpleExplanation: "The project contains routes named like /admin, /dashboard, or /account, but X-Ray did not see an obvious access check in the scanned code.",
        businessImpact: "If protection is truly missing, an outsider could reach private sections. If protection exists elsewhere, this risk should be marked as a false positive after manual review.",
        suggestedAction: "Review the listed files and the shared route guard (middleware/proxy/layout/server-side helper). If protection exists, no product change is needed; if not, add authentication checks.",
      },
      2: {
        simpleExplanation: "One server file mixes real authentication logic with billing logic (Stripe). Changing one can easily break the other.",
        businessImpact: "A billing change can accidentally break sign-in or sessions. This is a classic source of hard-to-debug regressions after AI-assisted edits.",
        suggestedAction: "Split auth and billing into separate modules (for example `lib/auth.ts` and `lib/stripe.ts`) instead of keeping them in one file.",
      },
      3: {
        simpleExplanation: "Your code accepts Stripe payment events but barely verifies that they are real. An attacker could forge them.",
        businessImpact: "Someone could get paid access without paying, or a subscription might stay active after cancellation. That is direct financial loss.",
        suggestedAction: "Verify the webhook signature with `stripe.webhooks.constructEvent`. Handle the key events: successful payment and subscription cancellation.",
      },
      4: {
        simpleExplanation: "Important values such as roles, prices, or feature access are changed directly in browser code. That is easy to tamper with.",
        businessImpact: "A user could grant themselves admin access, set a price to zero, or unlock paid features for free.",
        suggestedAction: "Anything related to permissions, pricing, or access should be validated and changed only on the server with the current user checked.",
      },
      5: {
        simpleExplanation: "The app talks to the database directly from the browser, but there is no clear evidence that users cannot see each other's data.",
        businessImpact: "One user may accidentally or intentionally read or modify another user's data.",
        suggestedAction: "Set up Row Level Security (RLS) in Supabase and add access policies. Make sure regular users only see their own data.",
      },
      6: {
        simpleExplanation: "Secret keys (Stripe, database, etc.) are present in code that reaches the browser. Anyone can inspect them.",
        businessImpact: "An attacker could gain full access to payments, the database, or external services. This is one of the most dangerous leaks.",
        suggestedAction: "Remove the secret from client-side code immediately. Move it to the server-only environment and rotate the key.",
      },
      7: {
        simpleExplanation: "One file has become very large and tangled. It mixes multiple kinds of logic, which makes it hard to change safely.",
        businessImpact: "Any change in this file is likely to break something else. Large files like this are a high-risk area before launch.",
        suggestedAction: "Split the file into smaller modules by responsibility (for example auth, billing, and UI logic).",
      },
      8: {
        simpleExplanation: "The same access rules (who can see what, which plan a user has) are written in several places and can drift apart.",
        businessImpact: "Different users may see different functionality depending on the page they open. That looks buggy and reduces trust.",
        suggestedAction: "Move all access and plan checks into one place (a helper or server-side policy) and reuse it everywhere.",
      },
      9: {
        simpleExplanation: "The code contains many markers like \"do later\", \"temporary fix\", or \"hack\". The more of them there are, the more likely something will break unexpectedly.",
        businessImpact: "Temporary fixes tend to become permanent. In production they often turn into weird, hard-to-trace bugs.",
        suggestedAction: "Review every TODO/FIXME/HACK. Either finish the fix properly or document the limitation and add a guard.",
      },
      10: {
        simpleExplanation: "One file is responsible for UI, authentication, billing, and database work at the same time. That is a brittle setup.",
        businessImpact: "Even a small change in such a file is likely to break something critical. These files are major sources of AI-edit regressions.",
        suggestedAction: "Split the file. UI, auth, billing, and data access should live as separately as possible.",
      },
      11: {
        simpleExplanation: "The code deletes or updates database records directly, but there is no obvious check that the user owns the record.",
        businessImpact: "One user could theoretically delete or change another user's data. That is a serious IDOR risk.",
        suggestedAction: "Check ownership before every `.update` or `.delete`, either through RLS or explicitly via `userId` / `auth.uid` in the query.",
      },
      12: {
        simpleExplanation: "If something goes wrong during payment or sign-in, the app may crash or show the user a confusing error.",
        businessImpact: "The user may lose money or be unable to sign in without understanding what happened. That hurts trust.",
        suggestedAction: "Wrap all critical calls (Stripe, auth) in `try/catch` and return clear error messages.",
      },
      13: {
        simpleExplanation: "After payment, registration, or cancellation, the user may end up nowhere useful because there is no obvious success, cancel, or account page.",
        businessImpact: "The user paid but does not know what to do next. That leads to cancellations, bad reviews, and lost trust.",
        suggestedAction: "Create clear success, cancel, and onboarding pages. Make sure the post-payment destination is meaningful.",
      },
      14: {
        simpleExplanation: "One of the app's most important modules (auth, Stripe, billing, middleware) is imported by a very large number of files. Touching it is risky.",
        businessImpact: "Even a tiny change here can break 10+ other places. This is a common reason why \"it worked before the AI edit\" failures happen.",
        suggestedAction: "Expose a stable, narrow public API for this module. Reduce direct imports from pages/components where possible and use wrappers or server actions.",
      },
      15: {
        simpleExplanation: "This is one of the riskiest files in the project: it is large, full of temporary fixes, and mixes several kinds of logic.",
        businessImpact: "This is a maximum-risk area. A small change here can break several important flows at once.",
        suggestedAction: "Do not try to fix the whole file in one prompt. Split it into parts and make small, controlled changes.",
      },
    };

    const copy = copyByRule[issue.ruleId];
    return {
      ...issue,
      simpleExplanation: issue.simpleExplanation || copy?.simpleExplanation,
      businessImpact: issue.businessImpact || copy?.businessImpact || issue.impact,
      suggestedAction: issue.suggestedAction || copy?.suggestedAction || defaultAction,
    };
  }

  private generateVerdictCopy(
    verdict: ScanResult["verdict"],
    score: number,
    issues: AnalysisIssue[]
  ): { title: string; description: string } {
    const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
    const highCount = issues.filter((issue) => issue.severity === "high").length;

    if (verdict === "ready") {
      return {
        title: "Ready to launch",
        description: `Health Score ${score}/100. The signals found do not indicate serious problems. Review the remaining notes before launch, but they do not appear critical.`,
      };
    }

    if (verdict === "caution") {
      return {
        title: "Areas need review",
        description: `Found ${highCount} high-severity and ${criticalCount} critical risk signals. Review the Top Risks manually and fix confirmed issues before launch.`,
      };
    }

    return {
      title: "Manual review required",
      description: `Found ${criticalCount} critical and ${highCount} high-severity risk signals. This is not a final verdict, but these areas should be reviewed before launch, especially if money, user data, or product access are involved.`,
    };
  }

  private checkAuthExposure(issues: AnalysisIssue[]) {
    const routeGuardFiles = this.files.filter(
      (f) => /(^|\/)(middleware|proxy)\.(ts|js)$/.test(f.path.toLowerCase())
    );
    const hasRouteGuard = routeGuardFiles.some((f) => hasAuthEvidence(f.content));

    const openDashboards = this.files.filter((f) => {
      const p = f.path.toLowerCase();
      return isRouteLikeFile(p) &&
        hasProtectedRouteKeyword(p) &&
        !hasAuthEvidence(f.content);
    });

    if (!hasRouteGuard && openDashboards.length > 0) {
      const evidenceFiles = openDashboards.slice(0, 5).map((f) => f.path);
      issues.push({
        ruleId: 1,
        ruleName: "Auth route needs verification",
        severity: "high",
        confidence: 0.65,
        file: evidenceFiles[0],
        evidenceFiles,
        message: "Route names suggest protected areas, but no visible authorization check was found in the scanned code.",
        details: `Found ${openDashboards.length} route-like files (${evidenceFiles.join(", ")}), but no middleware/proxy with an explicit session check was found in the deep-scan sample.`,
        impact: "This is not proof of public access. It is a manual review signal: protection may live in an unscanned file, on the host, or inside a shared layout/helper.",
      });
    }
  }

  private checkAuthBillingCoupling(issues: AnalysisIssue[]) {
    const coupled = this.files.filter((f) => {
      const c = (f.content || "").toLowerCase();
      const hasRealAuth = /@clerk|supabase\.auth|getserversession|auth\(\)|currentuser|requireauth/.test(c);
      const hasRealStripe = /new stripe|stripe\.webhooks|constructevent|createsubscription|createcheckoutsession/.test(c);
      // Only real server-side mixing, not a page that imports useUser and a <StripeButton/>
      const isServerFile = /server|api\/|actions|lib\/|middleware/.test(f.path.toLowerCase()) || c.includes('"use server"');
      return hasRealAuth && hasRealStripe && isServerFile;
    });

    if (coupled.length > 0) {
      issues.push({
        ruleId: 2,
        ruleName: "Auth and billing coupling",
        severity: "medium",
        confidence: 0.7,
        file: coupled[0].path,
        message: "Auth and billing are tightly coupled in one server module.",
        details: "The file contains real server-side authentication logic and Stripe logic together.",
        impact: "A billing change can easily break sign-in or sessions. This is a classic source of hard-to-debug regressions.",
      });
    }
  }

  private checkStripeWebhook(issues: AnalysisIssue[]) {
    const webhookFiles = this.files.filter(
      (f) => f.path.toLowerCase().includes("webhook") || f.path.toLowerCase().includes("stripe")
    );

    for (const f of webhookFiles) {
      const c = f.content || "";
      if (c && !c.includes("constructEvent") && c.includes("stripe")) {
        issues.push({
          ruleId: 3,
          ruleName: "Stripe webhook fragility",
          severity: "critical",
          confidence: 0.9,
          file: f.path,
          message: "Stripe webhook is handled without signature verification.",
          details: "The code accepts payment notifications but does not verify that they actually came from Stripe.",
          impact: "An attacker could forge a successful payment and get paid access for free. That is direct financial loss.",
        });
      }

      if (c && c.includes("constructEvent")) {
        const handlesSuccess = c.includes("invoice.payment_succeeded") || c.includes("checkout.session.completed");
        const handlesCancel = c.includes("customer.subscription.deleted") || c.includes("invoice.payment_failed");
        if (!handlesSuccess || !handlesCancel) {
          issues.push({
            ruleId: 3,
            ruleName: "Stripe webhook fragility",
            severity: "high",
            confidence: 0.78,
            file: f.path,
            message: "Stripe webhook does not handle important payment events.",
            details: "Successful payments or subscription cancellations are not handled.",
            impact: "After payment, the user may not receive access, or the subscription may remain active after cancellation.",
          });
        }
      }
    }
  }

  private checkEnvExposure(issues: AnalysisIssue[]) {
    const badPatterns = [
      { re: /sk_live_[a-zA-Z0-9]{20,}/, name: "Stripe live secret" },
      { re: /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/, name: "JWT / Supabase service key" },
      { re: /NEXT_PUBLIC_.*(KEY|SECRET|TOKEN)/i, name: "NEXT_PUBLIC secret" },
    ];

    for (const f of this.files) {
      const c = f.content || "";
      for (const pat of badPatterns) {
        if (pat.re.test(c)) {
          issues.push({
            ruleId: 6,
            ruleName: "Environment variables exposure",
            severity: "critical",
            confidence: 0.95,
            file: f.path,
            message: `Secret found in client-side code: ${pat.name}`,
            details: "A secret key (Stripe, Supabase, etc.) is present in code that ships to the browser.",
            impact: "Anyone can inspect that key and gain full access to payments, the database, or other services.",
          });
        }
      }
    }
  }

  private checkOversizedFiles(issues: AnalysisIssue[], nodes: FileNode[]) {
    for (const node of nodes) {
      if (!node.hasContent) continue;

      if (node.size > 800 && (node.cluster === "Other" || node.cluster === "Components")) {
        issues.push({
          ruleId: 7,
          ruleName: "Oversized critical file",
          severity: "medium",
          confidence: 0.7,
          file: node.path,
          message: `The file is ${node.size} lines long, which is too large.`,
          details: "UI pages and components over 800 lines are almost always a sign of poor separation of concerns.",
          impact: "Hard to maintain, with a high likelihood of regressions during edits.",
        });
      }
      if (node.size > 500 && ["Auth", "Billing", "Database", "Routes"].includes(node.cluster)) {
        issues.push({
          ruleId: 7,
          ruleName: "Oversized critical file",
          severity: "high",
          confidence: 0.8,
          file: node.path,
          message: `Very large file in a critical area: ${node.size} lines.`,
          details: `The file ${node.path} owns an important part of the logic and is still very large.`,
          impact: "These files are easy to break during edits. The risk is especially high when AI modifies them.",
        });
      }
    }
  }

  private checkTodoMarkers(issues: AnalysisIssue[]) {
    const markers = /TODO|FIXME|HACK|TEMP|quick fix|workaround|for now/i;

    for (const f of this.files) {
      if (!f.content) continue;
      const matches = f.content.match(markers);
      if (!matches) continue;

      const count = matches.length;
      const p = f.path.toLowerCase();
      const isCoreFile = /(auth|stripe|billing|middleware|prisma|supabase|database|api\/)/.test(p);

      // Only report if either (a) many markers in a critical file, or (b) very high concentration anywhere
      if ((isCoreFile && count >= 3) || count >= 6) {
        const severity: AnalysisIssue["severity"] = (isCoreFile && count >= 5) || count >= 8 ? "high" : "medium";
        issues.push({
          ruleId: 9,
          ruleName: "Temporary fix patterns",
          severity,
          confidence: isCoreFile ? 0.68 : 0.55,
          file: f.path,
          message: `The file contains ${count} temporary-fix markers (TODO/FIXME/HACK).`,
          details: isCoreFile
            ? "There is a lot of technical debt in a critical module, which raises the chance of hidden problems."
            : "A significant amount of temporary logic. This is a common trace of AI-generated code.",
          impact: "Temporary fixes tend to stick around forever and become the source of strange production bugs.",
        });
      }
    }
  }

  private checkClientTrust(issues: AnalysisIssue[]) {
    const clientFiles = this.files.filter((f) => f.content?.includes('"use client"'));

    for (const f of clientFiles) {
      const c = f.content || "";
      if (/(\.role\s*=|user\.role|price\s*=|amount\s*=|isAdmin|hasAccess)\s*=/.test(c)) {
        issues.push({
          ruleId: 4,
          ruleName: "Client-side trust",
          severity: "critical",
          confidence: 0.8,
          file: f.path,
          message: "Important values such as roles, prices, or access are changed directly in browser code.",
          details: "The code allows permissions or pricing to be changed on the client.",
          impact: "A user could trick the system, for example by granting themselves admin access or making an item free.",
        });
      }
    }
  }

  private checkSupabaseRls(issues: AnalysisIssue[], nodes: FileNode[]) {
    const usesSupabaseClient = this.files.some((f) => {
      const c = f.content || "";
      return c.includes("@supabase/supabase-js") || /createClient\s*\(/.test(c);
    });

    if (!usesSupabaseClient) return;

    const hasRlsEvidence = nodes.some((node) => {
      const p = node.path.toLowerCase();
      const content = this.files.find((file) => file.path === node.path)?.content?.toLowerCase() || "";
      return (
        p.includes("migration") ||
        p.includes("supabase/migrations") ||
        p.endsWith(".sql") ||
        content.includes("enable row level security") ||
        content.includes("create policy") ||
        content.includes("alter table") && content.includes("enable row level security")
      );
    });

    if (!hasRlsEvidence) {
      // Only warn if we see direct browser client usage without obvious server wrapper
      const directBrowserClient = this.files.some((f) => {
        const cc = (f.content || "").toLowerCase();
        return /createclient\(.supabase.*anon|from\(.supabase.*browser|supabase.*client.*browser/.test(cc);
      });

      if (directBrowserClient) {
        issues.push({
          ruleId: 5,
          ruleName: "Supabase RLS uncertainty",
          severity: "medium",
          confidence: 0.55,
          message: "Supabase browser client is used, but no explicit RLS policies were found in the code.",
          details: "No migrations or files with 'enable row level security' / 'create policy' were found. The policies may be configured only in the Supabase dashboard.",
          impact: "If the tables are open without RLS, any user could read or modify another user's data.",
        });
      }
    }
  }

  private checkRepeatedBusinessLogic(issues: AnalysisIssue[]) {
    const patterns = [
      { re: /user\.role\s*={2,3}\s*["'`](admin|owner|pro)["'`]/g, label: "role checks" },
      { re: /role\s*={2,3}\s*["'`](admin|owner|pro)["'`]/g, label: "role checks" },
      { re: /plan\s*={2,3}\s*["'`](pro|premium|paid|enterprise)["'`]/g, label: "plan checks" },
      { re: /subscription\.status\s*={2,3}\s*["'`](active|trialing)["'`]/g, label: "subscription checks" },
      { re: /is(Pro|Admin|Premium|Paid|Enterprise)\b/g, label: "access flags" },
    ];

    const hitsByLabel = new Map<string, Set<string>>();

    for (const f of this.files) {
      const c = f.content || "";
      for (const pattern of patterns) {
        if (pattern.re.test(c)) {
          if (!hitsByLabel.has(pattern.label)) hitsByLabel.set(pattern.label, new Set());
          hitsByLabel.get(pattern.label)!.add(f.path);
        }
        pattern.re.lastIndex = 0;
      }
    }

    for (const [label, files] of hitsByLabel.entries()) {
      if (files.size >= 3) {
        const sample = Array.from(files).slice(0, 4);
        issues.push({
          ruleId: 8,
          ruleName: "Repeated business logic",
          severity: "medium",
          confidence: 0.72,
          file: sample[0],
          message: `Repeated access business logic: ${label} appears in ${files.size} files.`,
          details: `Examples: ${sample.join(", ")}`,
          impact: "Access rules can drift between components, which leads to hidden launch regressions.",
        });
      }
    }
  }

  private checkMixedResponsibilities(issues: AnalysisIssue[]) {
    for (const f of this.files) {
      const c = f.content || "";
      if (!c) continue;

      // Much stricter signals — ignore incidental JSX in server components
      const hasHeavyUi = /export\s+(default\s+)?(async\s+)?function\s+[A-Z]/.test(c) &&
                         (c.match(/<([A-Z][A-Za-z0-9]*|div|section|main|button|form|Card|Dialog)\b/g) || []).length >= 4;

      const hasRealDatabaseWork = /prisma\.(user|account|subscription|customer)|supabase\.from\(|createServerClient/.test(c) &&
                                  (/\.insert\(|\.update\(|\.delete\(|\.rpc\(/.test(c) || (c.match(/\.select\(/g) || []).length >= 2);

      const hasBillingLogic = /new\s+Stripe|stripe\.webhooks|constructEvent|createCheckoutSession|createSubscription|paymentintent/i.test(c);

      const hasAuthLogic = /getServerSession|auth\(\)|requireAuth|currentUser|supabase\.auth\.|clerkClient|verifyToken/.test(c);

      // Only the really bad "everything in one file" combo
      const responsibilityCount = [hasHeavyUi, hasRealDatabaseWork, hasBillingLogic, hasAuthLogic].filter(Boolean).length;

      if (responsibilityCount >= 3 && c.length > 180) {
        issues.push({
          ruleId: 10,
          ruleName: "Too many responsibilities in one module",
          severity: "high",
          confidence: 0.75,
          file: f.path,
          message: "One module mixes heavy UI, auth, billing, and/or database logic in a single file.",
          details: "The file shows signs of multiple architectural layers at once, plus significant size.",
          impact: "Any edit in such a file is likely to break several critical flows. This is especially risky for AI-generated changes.",
        });
      }
    }
  }

  private checkDangerousOps(issues: AnalysisIssue[]) {
    for (const f of this.files) {
      const c = f.content || "";
      const hasDbMutation =
        /prisma\.[a-zA-Z0-9_]+\.(delete|update|deleteMany|updateMany)\s*\(/.test(c) ||
        /(supabase|db)\.from\([^)]+\)[\s\S]{0,240}\.(delete|update)\s*\(/.test(c) ||
        /\.from\([^)]+\)[\s\S]{0,240}\.(delete|update)\s*\(/.test(c);

      if (hasDbMutation) {
        const hasOwnershipCheck = /userId|user_id|auth\.uid|clerkId|currentUserId|\.eq\(.user|where.*user|requireAuth|withAuth|checkOwnership/.test(c);
        if (!hasOwnershipCheck) {
        issues.push({
          ruleId: 11,
          ruleName: "Dangerous direct database operations",
          severity: "high",
          confidence: 0.58,
          file: f.path,
          message: "The code deletes or updates data without checking that it belongs to the current user.",
          details: "Database operations run without an explicit ownership check (userId / auth.uid, etc.).",
          impact: "One user could theoretically delete or modify another user's data, which is an IDOR risk.",
        });
      }
      }

      const hasCriticalExternalCall =
        /await\s+stripe\./.test(c) ||
        /await\s+supabase\.auth\./.test(c) ||
        /await\s+.*\.(signIn|signUp|signOut|createCheckoutSession|createSubscription|paymentIntents)/.test(c);

      if (hasCriticalExternalCall && !c.includes("try") && !c.includes("catch")) {
        issues.push({
          ruleId: 12,
          ruleName: "Missing error handling",
          severity: "medium",
          confidence: 0.55,
          file: f.path,
          message: "Stripe / Supabase Auth calls are missing try/catch.",
          details: "Authentication and payment errors can cause the application to fail.",
          impact: "Poor UX, plus possible loss of subscription state.",
        });
      }
    }
  }

  private checkSensitiveDependencyCount(issues: AnalysisIssue[]) {
    const sensitiveFiles = this.files.filter((file) => {
      if (!file.content) return false;
      const p = file.path.toLowerCase();
      const c = file.content.toLowerCase();

      // Much stricter core detection — only real central modules, not every "auth-button" or "db-types"
      const isStrongCorePath =
        /(^|\/)middleware\.(ts|js)$/.test(p) ||
        /(^|\/)lib\/(auth|stripe|billing|db|database)\.(ts|tsx|js)/.test(p) ||
        /\/(auth|stripe|billing|subscription|webhook)\.(ts|tsx|js)$/.test(p) ||
        /app\/api\/(auth|stripe|webhook|billing|subscription)/.test(p) ||
        /(^|\/)(auth|stripe)\/(index|config|client|server)\.(ts|tsx|js)/.test(p);

      if (!isStrongCorePath) return false;

      // Require content evidence that this is actually the critical implementation
      const looksLikeAuthCore = /getserversession|createserverclient|auth\(\)|supabase\.auth|clerk|next-auth/.test(c);
      const looksLikeStripeCore = /new stripe|stripe\.webhooks|constructevent|createsubscription|paymentintent/.test(c);
      const looksLikeDbCore = /(prisma|createclient.*supabase|from\(.supabase)/.test(c) && c.length < 650;

      return looksLikeAuthCore || looksLikeStripeCore || looksLikeDbCore || /middleware/.test(p);
    });

    if (sensitiveFiles.length === 0) return;

    for (const sensitiveFile of sensitiveFiles) {
      const info = this.getIncomingDependenciesInfo(sensitiveFile.path, 2, 6);

      if (info.total === 0) continue;

      const p = sensitiveFile.path.toLowerCase();
      const isHighlyCritical = /(auth|stripe|billing|subscription|payment|middleware)/.test(p);
      const isCritical = isHighlyCritical || /(prisma|supabase|database|db)/.test(p);

      // Significantly raised thresholds for realistic production Next.js apps.
      const directThreshold = isHighlyCritical ? 9 : isCritical ? 12 : 16;
      const totalThreshold = isHighlyCritical ? 14 : isCritical ? 18 : 24;

      const isProblematic = info.direct >= directThreshold || info.total >= totalThreshold;

      if (isProblematic) {
        const confidence = Math.min(0.82, 0.58 + Math.min(info.total, 30) * 0.008);

        let details = `Direct imports: ${info.direct}. Total connections (depth ≤2): ${info.total}.`;

        if (info.dependents.length > 0) {
          const examples = info.dependents.slice(0, 3).map(f => f.split("/").pop()).join(", ");
          details += ` Examples: ${examples}${info.dependents.length > 3 ? "..." : ""}.`;
        }

        issues.push({
          ruleId: 14,
          ruleName: "Sensitive module with high dependency count",
          severity: isHighlyCritical ? "high" : "medium",
          confidence,
          file: sensitiveFile.path,
          message: `The critical module is imported too broadly (${info.direct} direct + ${info.transitive} transitive).`,
          details,
          impact: "Changes in this file affect a lot of code. High risk of regressions during edits, including AI-assisted ones.",
        });
      }
    }
  }

  private checkAiChaos(issues: AnalysisIssue[]) {
    // Rule 15: composite of oversized + TODO + mixed responsibilities
    const byFile = new Map<string, Set<number>>();

    issues.forEach((iss) => {
      if ((iss.ruleId === 7 || iss.ruleId === 9 || iss.ruleId === 10) && iss.file) {
        if (!byFile.has(iss.file)) byFile.set(iss.file, new Set());
        byFile.get(iss.file)!.add(iss.ruleId);
      }
    });

    const chaosFiles = Array.from(byFile.entries())
      .filter(([, rules]) => rules.has(7) && rules.has(9) && rules.has(10))
      .map(([file]) => file);

    if (chaosFiles.length > 0) {
      issues.push({
        ruleId: 15,
        ruleName: "AI-chaos smell",
        severity: "critical",
        confidence: 0.85,
        file: chaosFiles[0],
        message: "A high-risk file was found: large, tangled, and full of temporary fixes.",
        details: "This file combines large size, many TODO/HACK markers, and mixed responsibilities.",
        impact: "This is one of the most dangerous areas in the project. It is especially easy to break something during the next edit.",
      });
    }
  }

  private checkMissingOnboardingPaths(issues: AnalysisIssue[], nodes: FileNode[]) {
    const lowerPaths = nodes.map((n) => n.path.toLowerCase());

    // More precise route patterns for Next.js App Router and Pages Router.
    const hasSuccess = lowerPaths.some((p) =>
      p.includes("/success") ||
      p.includes("success/page") ||
      p.endsWith("success.tsx") ||
      p.endsWith("success.ts") ||
      p.includes("checkout/success") ||
      p.includes("payment/success")
    );

    const hasCancel = lowerPaths.some((p) =>
      p.includes("/cancel") ||
      p.includes("cancel/page") ||
      p.endsWith("cancel.tsx") ||
      p.endsWith("cancel.ts") ||
      p.includes("checkout/cancel") ||
      p.includes("payment/cancel")
    );

    const hasDashboardOrAccount = lowerPaths.some((p) =>
      p.includes("dashboard") ||
      p.includes("/account") ||
      p.includes("/profile") ||
      p.includes("onboard") ||
      p.includes("welcome")
    );

    // Determine whether the project has any billing or checkout flow.
    const hasBillingFlow = this.hasBillingEvidence(nodes);

    if (!hasSuccess || !hasCancel || !hasDashboardOrAccount) {
      const missingParts: string[] = [];
      if (!hasSuccess) missingParts.push("success");
      if (!hasCancel) missingParts.push("cancel");
      if (!hasDashboardOrAccount) missingParts.push("dashboard/onboarding");

      // Only meaningful if there is actual billing flow AND at least two things missing
      const meaningfulMissing = missingParts.length >= 2 && hasBillingFlow;
      if (meaningfulMissing) {
        issues.push({
          ruleId: 13,
          ruleName: "Unclear launch path",
          severity: "low",
          confidence: 0.6,
          message: `Incomplete launch path after payment: missing ${missingParts.join(" / ")}.`,
          details: "The project shows billing signals, but there are no obvious success/cancel/onboarding pages.",
          impact: "The user paid, but may not understand what to do next. This lowers conversion and trust.",
        });
      }
    }
  }

  /** Detect whether the project contains billing or checkout signals. */
  private hasBillingEvidence(nodes: FileNode[]): boolean {
    return nodes.some((n) => {
      const p = n.path.toLowerCase();
      return (
        p.includes("stripe") ||
        p.includes("billing") ||
        p.includes("subscription") ||
        p.includes("checkout") ||
        p.includes("pricing") ||
        p.includes("payment")
      );
    });
  }

  private severityScore(sev: AnalysisIssue["severity"]): number {
    return { low: 1, medium: 3, high: 7, critical: 12 }[sev];
  }

  private issuePenalty(issue: AnalysisIssue): number {
    return Math.round(this.severityScore(issue.severity) * issue.confidence * 1.8);
  }

  private rulePenaltyCap(ruleId: number): number {
    const caps: Record<number, number> = {
      1: 18, // Auth route exposure
      2: 10, // Auth + billing coupling
      3: 24, // Stripe webhook fragility
      4: 24, // Client-side trust
      5: 8,  // Supabase RLS uncertainty
      6: 38, // Environment exposure
      7: 12, // Oversized files
      8: 10, // Repeated business logic
      9: 8,  // Temporary markers
      10: 16, // Mixed responsibilities
      11: 22, // Dangerous DB ops
      12: 10, // Missing error handling
      13: 4,  // Launch path
      14: 14, // Sensitive dependencies
      15: 24, // AI-chaos smell
    };

    return caps[ruleId] ?? 12;
  }

  private cappedRulePenalty(issues: AnalysisIssue[]): number {
    const rawPenalties = issues
      .map((issue) => this.issuePenalty(issue))
      .sort((a, b) => b - a);

    const diminishingPenalty = rawPenalties.reduce((sum, penalty, index) => {
      if (index === 0) return sum + penalty;
      if (index === 1) return sum + penalty * 0.45;
      if (index === 2) return sum + penalty * 0.25;
      return sum + penalty * 0.12;
    }, 0);

    return Math.round(Math.min(diminishingPenalty, this.rulePenaltyCap(issues[0].ruleId)));
  }

  /**
   * Normalize an import path for more accurate comparisons.
   * Used by Rule 14 and future dependency-based rules.
   */
  private normalizeImportPath(importPath: string): string {
    return importPath
      .replace(/^@\//, "")
      .replace(/^\.\//, "")
      .replace(/^\.\.\//, "")
      .replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, "")
      .replace(/\/index$/, "");
  }

  // ============================================
  // === Import graph for dependency-sensitive rules ===
  // ============================================

  /**
   * Build a directed import graph.
   * Key = imported file, value = files that import it.
   */
  private buildImportGraph(): void {
    this.importGraph.clear();

    // Initialize every file in the graph.
    for (const file of this.files) {
      this.importGraph.set(file.path, new Set());
    }

    for (const file of this.files) {
      if (!file.content) continue;

      const imports = this.extractImports(file.content);

      for (const importPath of imports) {
        const resolved = this.resolveImportPath(file.path, importPath);
        if (!resolved) continue;

        // Add the incoming dependency: resolved <-- file.
        const dependents = this.importGraph.get(resolved);
        if (dependents) {
          dependents.add(file.path);
        }
      }
    }
  }

  /**
   * Extract relative imports, @-imports, and re-exports from file content.
   * This is required for accurate dependency graph construction.
   */
  private extractImports(content: string): string[] {
    const imports = new Set<string>();

    const addIfLocal = (p: string) => {
      if (this.isLocalImport(p)) imports.add(p);
    };

    // import ... from "..."
    // export ... from "..."
    const fromRegex = /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s+["']([^"']+)["']/g;

    // export * from "..."
    const exportStarRegex = /export\s+\*\s+from\s+["']([^"']+)["']/g;

    // export { x, y } from "..."
    const exportNamedFromRegex = /export\s*\{\s*[^}]+\s*\}\s*from\s+["']([^"']+)["']/g;

    // require("...")
    const requireRegex = /require\(["']([^"']+)["']\)/g;

    let match;
    while ((match = fromRegex.exec(content)) !== null) addIfLocal(match[1]);
    while ((match = exportStarRegex.exec(content)) !== null) addIfLocal(match[1]);
    while ((match = exportNamedFromRegex.exec(content)) !== null) addIfLocal(match[1]);
    while ((match = requireRegex.exec(content)) !== null) addIfLocal(match[1]);

    return Array.from(imports);
  }

  private isLocalImport(path: string): boolean {
    return path.startsWith(".") || path.startsWith("@/");
  }

  /**
   * Resolve a relative or @ import to an actual project file path.
   * Supports several common import styles.
   */
  private resolveImportPath(fromFile: string, importPath: string): string | null {
    const normalizedImport = this.normalizeImportPath(importPath);

    // Direct match.
    if (this.importGraph.has(normalizedImport)) {
      return normalizedImport;
    }

    // Extended candidate list, including .mjs and .cjs.
    const candidates = [
      normalizedImport,
      normalizedImport + "/index",
      normalizedImport + ".ts",
      normalizedImport + ".tsx",
      normalizedImport + ".js",
      normalizedImport + ".mjs",
      normalizedImport + ".cjs",
    ];

    for (const candidate of candidates) {
      if (this.importGraph.has(candidate)) {
        return candidate;
      }
    }

    // Resolve relative to the current file directory.
    const fromDir = fromFile.substring(0, fromFile.lastIndexOf("/"));
    if (fromDir) {
      const relativeBase = this.normalizeImportPath(fromDir + "/" + importPath.replace(/^\.\//, ""));
      const relativeCandidates = [
        relativeBase,
        relativeBase + "/index",
        relativeBase + ".ts",
        relativeBase + ".tsx",
        relativeBase + ".js",
      ];
      for (const c of relativeCandidates) {
        if (this.importGraph.has(c)) return c;
      }
    }

    // Suffix matching works well with barrel files and varied source layouts.
    const importBase = normalizedImport.split("/").pop()!;
    for (const existingPath of this.importGraph.keys()) {
      const existingBase = existingPath.split("/").pop()!;
      if (existingBase === importBase || existingPath.endsWith("/" + normalizedImport)) {
        return existingPath;
      }
    }

    return null;
  }

  /**
   * Return incoming dependency counts and dependent file examples.
   * Used by the improved Rule 14.
   */
  public getIncomingDependenciesInfo(filePath: string, maxDepth: number = 2, limit = 6): DependencyInfo {
    const visited = new Set<string>();
    const direct = new Set<string>();
    const transitive = new Set<string>();

    const traverse = (current: string, depth: number) => {
      if (depth > maxDepth || visited.has(current)) return;
      visited.add(current);

      const dependents = this.importGraph.get(current) || new Set();

      for (const dependent of dependents) {
        if (depth === 1) {
          direct.add(dependent);
        } else if (depth > 1) {
          transitive.add(dependent);
        }
        traverse(dependent, depth + 1);
      }
    };

    traverse(filePath, 1);

    for (const d of direct) transitive.delete(d);

    const allDependents = [...direct, ...transitive].slice(0, limit);

    return {
      direct: direct.size,
      transitive: transitive.size,
      total: direct.size + transitive.size,
      dependents: allDependents,
    };
  }

  /** Kept for backward compatibility. */
  public getIncomingDependencyCount(filePath: string, maxDepth: number = 2): DependencyStats {
    return this.getIncomingDependenciesInfo(filePath, maxDepth);
  }

  // ============================================
  // === End import graph block ===============
  // ============================================

  private calculateHealthScore(issues: AnalysisIssue[]): number {
    const byRule = new Map<number, AnalysisIssue[]>();

    for (const issue of issues) {
      if (!byRule.has(issue.ruleId)) byRule.set(issue.ruleId, []);
      byRule.get(issue.ruleId)!.push(issue);
    }

    const totalPenalty = Array.from(byRule.values())
      .reduce((sum, ruleIssues) => sum + this.cappedRulePenalty(ruleIssues), 0);

    const score = 100 - totalPenalty;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate the detailed Health Score breakdown by rule.
   * This helps users understand which issues affect the score most.
   */
  private calculateScoreBreakdown(issues: AnalysisIssue[], topRisks: AnalysisIssue[]): ScoreBreakdown {
    const byRule = new Map<number, { ruleName: string; severity: AnalysisIssue["severity"]; issues: AnalysisIssue[] }>();

    for (const issue of issues) {
      if (!byRule.has(issue.ruleId)) {
        byRule.set(issue.ruleId, {
          ruleName: issue.ruleName,
          severity: issue.severity,
          issues: [],
        });
      }
      byRule.get(issue.ruleId)!.issues.push(issue);
    }

    const items: ScoreBreakdownItem[] = Array.from(byRule.entries())
      .map(([ruleId, data]) => ({
        ruleId,
        ruleName: data.ruleName,
        severity: data.severity,
        count: data.issues.length,
        totalPenalty: this.cappedRulePenalty(data.issues),
      }))
      .sort((a, b) => b.totalPenalty - a.totalPenalty);

    const totalPenalty = items.reduce((sum, item) => sum + item.totalPenalty, 0);

    // Potential gain from fixing the top three risks.
    const topRiskPenalty = topRisks
      .slice(0, 3)
      .reduce((sum, issue) => sum + this.issuePenalty(issue), 0);

    return {
      totalPenalty,
      items,
      potentialGain: Math.min(totalPenalty, topRiskPenalty),
    };
  }

  private generateSummary(score: number, totalIssues: number, top: AnalysisIssue[]): string {
    if (score >= 90) return "Good structure. Minimal risk. Ready to launch.";
    if (score >= 75) return "Decent shape. There are a few areas worth tightening before launch.";
    if (score >= 60) return "Medium risk level. Manually review the strongest signals before giving real users access.";
    return `Many risk signals (${totalIssues}). Start with ${top[0]?.ruleName || "the key structural issues"} and confirm which ones truly apply to the project.`;
  }
}
