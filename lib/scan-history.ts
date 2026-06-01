import { ScanResult } from './xray-analyzer';

export interface SavedScan {
  id: string;
  timestamp: number;
  healthScore: number;
  verdict: ScanResult['verdict'];
  criticalCount: number;
  highCount: number;
  totalIssues: number;
  repo?: {
    owner: string;
    repo: string;
    branch: string;
  };
  /** Full result, retained only for the newest few scans to save localStorage space. */
  fullResult?: ScanResult;
}

const MAX_HISTORY = 10;

function getStorageKey(repo?: { owner: string; repo: string; branch?: string }): string {
  if (repo) {
    return `xray-history-${repo.owner}-${repo.repo}`;
  }
  return 'xray-history-global';
}

export function loadScanHistory(repo?: { owner: string; repo: string; branch?: string }): SavedScan[] {
  if (typeof window === 'undefined') return [];

  const key = getStorageKey(repo);

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveScan(
  result: ScanResult, 
  repoInfo?: { owner: string; repo: string; branch: string }
): SavedScan[] {
  const key = getStorageKey(repoInfo);
  const history = loadScanHistory(repoInfo);

  const criticalCount = result.issues.filter(i => i.severity === 'critical').length;
  const highCount = result.issues.filter(i => i.severity === 'high').length;

  const newEntry: SavedScan = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    healthScore: result.healthScore,
    verdict: result.verdict,
    criticalCount,
    highCount,
    totalIssues: result.issues.length,
    repo: repoInfo,
    fullResult: result,
  };

  const updated = [newEntry, ...history]
    .slice(0, MAX_HISTORY)
    .map((entry, index) => (index < 4 ? entry : { ...entry, fullResult: undefined }));

  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save scan history', e);
  }

  return updated;
}

export function deleteScanFromHistory(id: string, repo?: { owner: string; repo: string }): SavedScan[] {
  const history = loadScanHistory(repo);
  const updated = history.filter(entry => entry.id !== id);

  const key = getStorageKey(repo);
  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to delete scan from history', e);
  }

  return updated;
}

export function getLastScan(repo?: { owner: string; repo: string }): SavedScan | null {
  const history = loadScanHistory(repo);
  return history.length > 0 ? history[0] : null;
}

export function compareWithPrevious(
  current: ScanResult, 
  repo?: { owner: string; repo: string }
): {
  previous: SavedScan | null;
  delta: number;
  hasPrevious: boolean;
} {
  const previous = getLastScan(repo);

  if (!previous) {
    return { previous: null, delta: 0, hasPrevious: false };
  }

  const delta = current.healthScore - previous.healthScore;

  return {
    previous,
    delta,
    hasPrevious: true,
  };
}
