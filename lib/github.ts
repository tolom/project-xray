/**
 * GitHub API client for Project X-Ray (client-side, zero-backend)
 * Uses user OAuth token when available, falls back to unauthenticated for public repos.
 * Rate limits: 60 req/h unauth, 5000 req/h with token.
 */

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  default_branch: string;
  private: boolean;
  html_url: string;
  stargazers_count?: number;
}

export interface GitHubFileContent {
  path: string;
  content: string; // decoded
  encoding: string;
  size: number;
}

const GITHUB_API = "https://api.github.com";

function getAuthHeader(token?: string): HeadersInit {
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export async function fetchRepoInfo(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubRepo> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...getAuthHeader(token),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const status = res.status;

    if (status === 404) {
      if (!token) {
        throw new Error(
          "Repository not found or it is private. " +
          "Sign in with GitHub and try again."
        );
      } else {
        throw new Error(
          "Repository not found or the token does not have access. Check the URL and GitHub App permissions."
        );
      }
    }

    if (status === 403) {
      throw new Error(
        "Access forbidden (403). " +
        (token ? "The rate limit may be exceeded or the token may not have enough permissions." : "Sign in with GitHub to raise the limit.")
      );
    }

    if (status === 401) {
      if (token) {
        throw new Error(
          "GitHub rejected the token (401). The token was received, but it does not have access to private repositories.\n\n" +
          "Fix:\n" +
          "1. Make sure the GitHub OAuth App requests the scopes `read:user` and `repo`.\n" +
          "2. In GitHub Settings → Applications → Authorized OAuth Apps, revoke access.\n" +
          "3. Sign out of the app and sign in again with GitHub."
        );
      } else {
        throw new Error("Invalid GitHub token. Try signing out and signing in again.");
      }
    }

    throw new Error(err.message || `Failed to load repository (error ${status})`);
  }
  return res.json();
}

export async function fetchRepoTree(
  owner: string,
  repo: string,
  branch: string,
  token?: string
): Promise<GitHubTreeItem[]> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...getAuthHeader(token),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const status = res.status;

    if (status === 409) {
      throw new Error("The repository is empty or has no commits.");
    }

    if (status === 404) {
      if (!token) {
        throw new Error(
          "Failed to load the repository tree. " +
          "The repository is private - sign in with GitHub to access it."
        );
      }
      throw new Error("Repository not found while fetching the file tree.");
    }

    if (status === 403) {
      throw new Error(
        "GitHub API rate limit exceeded. " +
        (token ? "Wait a moment or use a token with broader access." : "Sign in with GitHub to raise the limit to 5000 requests/hour.")
      );
    }

    if (status === 401) {
      throw new Error(
        "GitHub rejected the token while fetching the file tree (401). " +
        "Try signing out and signing back in after revoking access in GitHub Settings."
      );
    }

    throw new Error(err.message || `Failed to fetch the repository tree (error ${status})`);
  }

  const data = await res.json();
  return data.tree || [];
}

/**
 * Fetch raw text content of a single file.
 * Uses /contents/ endpoint (returns base64 for files < 1MB).
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  token?: string
): Promise<GitHubFileContent> {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodedPath}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...getAuthHeader(token),
    },
    cache: "no-store",
  });

    if (!res.ok) {
      const status = res.status;
      if (status === 404) {
      throw new Error(`File ${path} not found (it may have been deleted or renamed).`);
      }
      if (status === 403) {
      throw new Error(`No access to file ${path}. ${token ? "" : "Sign in with GitHub."}`);
      }
    throw new Error(`Failed to read file ${path} (error ${status})`);
  }

  const json = await res.json();

  if (json.encoding === "base64" && json.content) {
    const decoded = atob(json.content.replace(/\n/g, ""));
    return {
      path,
      content: decoded,
      encoding: "utf-8",
      size: json.size,
    };
  }

  // Fallback (should rarely happen)
  return {
    path,
    content: json.content || "",
    encoding: json.encoding || "utf-8",
    size: json.size || 0,
  };
}

/**
 * Filter tree according to MVP spec (Phase 2.2)
 */
export function filterSourceTree(items: GitHubTreeItem[]): GitHubTreeItem[] {
  const EXCLUDED = [
    "node_modules/",
    ".next/",
    ".git/",
    "dist/",
    "build/",
    "coverage/",
    ".vercel/",
    ".turbo/",
  ];

  const BINARY_EXT = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".mp4", ".mov", ".zip", ".tar", ".gz", ".pdf", ".woff", ".woff2"];

  return items.filter((item) => {
    if (item.type !== "blob") return false;

    const p = item.path.toLowerCase();

    // Exclude directories
    if (EXCLUDED.some((ex) => p.startsWith(ex))) return false;

    // Exclude binary
    if (BINARY_EXT.some((ext) => p.endsWith(ext))) return false;

    // Keep only source code + critical configs
    const isSource =
      p.endsWith(".ts") ||
      p.endsWith(".tsx") ||
      p.endsWith(".js") ||
      p.endsWith(".jsx") ||
      p.endsWith(".mjs") ||
      p.endsWith(".cjs") ||
      p.endsWith(".sql") ||
      p.includes("package.json") ||
      p.startsWith(".env");

    return isSource;
  });
}

/**
 * Detect "critical" files that should have their full content fetched for rule analysis.
 * Per spec Phase 2.3: /api/, /routes/, /hooks/, names containing stripe/auth/supabase etc.
 */
export function isCriticalFile(path: string): boolean {
  const p = path.toLowerCase();
  const criticalDirs = ["/api/", "/routes/", "/hooks/", "/server/", "/actions/", "/middleware", "/proxy"];
  const criticalNames = [
    "stripe",
    "auth",
    "supabase",
    "clerk",
    "middleware",
    "proxy",
    "webhook",
    "billing",
    "subscription",
    "payment",
    "prisma",
    "db",
    "database",
    "migration",
    "policy",
    "env",
    "config",
  ];

  if (criticalDirs.some((d) => p.includes(d))) return true;
  if (criticalNames.some((n) => p.includes(n))) return true;
  if (p.endsWith(".sql")) return true;
  if (p.endsWith("package.json") || p.startsWith(".env")) return true;

  return false;
}

export function selectDeepAnalysisFiles(
  items: GitHubTreeItem[],
  maxFiles = 45
): GitHubTreeItem[] {
  const byPath = new Map<string, GitHubTreeItem>();
  const add = (item: GitHubTreeItem) => {
    if (!byPath.has(item.path)) byPath.set(item.path, item);
  };

  const sortedBySize = [...items].sort((a, b) => (b.size || 0) - (a.size || 0));

  items.filter((item) => isCriticalFile(item.path)).forEach(add);

  items
    .filter((item) => {
      const p = item.path.toLowerCase();
      return (
        p.includes("dashboard") ||
        p.includes("admin") ||
        p.includes("account") ||
        p.includes("onboard") ||
        p.includes("pricing") ||
        p.includes("checkout") ||
        p.includes("settings") ||
        p.includes("profile") ||
        p.includes("academy") ||
        p.includes("lesson")
      );
    })
    .forEach(add);

  items
    .filter((item) => {
      const p = item.path.toLowerCase();
      return (
        p.endsWith("app/page.tsx") ||
        p.endsWith("app/page.ts") ||
        p.endsWith("pages/index.tsx") ||
        p.endsWith("pages/index.ts") ||
        p.includes("/app/") ||
        p.includes("/pages/") ||
        p.includes("/components/")
      );
    })
    .slice(0, Math.floor(maxFiles * 0.35))
    .forEach(add);

  sortedBySize.slice(0, Math.floor(maxFiles * 0.35)).forEach(add);

  return Array.from(byPath.values())
    .sort((a, b) => {
      const aCritical = isCriticalFile(a.path) ? 1 : 0;
      const bCritical = isCriticalFile(b.path) ? 1 : 0;
      return bCritical - aCritical || (b.size || 0) - (a.size || 0) || a.path.localeCompare(b.path);
    })
    .slice(0, maxFiles);
}

/**
 * Parse GitHub URL into owner + repo.
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url.trim());
    if (!u.hostname.includes("github.com")) return null;

    const parts = u.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/").filter(Boolean);
    if (parts.length < 2) return null;

    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}
