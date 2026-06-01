"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  ReactFlow,
  ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AnalysisIssue, ScanResult } from "@/lib/xray-analyzer";
import { ScanBeamOverlay } from "@/components/ScanBeamOverlay";

interface XRayMapProps {
  result: ScanResult;
  onOpenDrawer: (issue: AnalysisIssue | null, file?: string) => void;
  /** IDs of files that have already been scanned and should be fully visible. */
  activatedNodeIds?: Set<string>;
  /** Scan beam progress from 0 to 1. */
  beamProgress?: number;
  /** Whether the scan beam is visible. */
  isBeamVisible?: boolean;
  /** IDs of nodes that were just activated for the reveal effect. */
  recentlyActivated?: Set<string>;
}

interface MapNodeData extends Record<string, unknown> {
  kind: "root" | "layer" | "risk" | "summary";
  label: React.ReactNode;
  file?: string;
  issue?: AnalysisIssue | null;
  status?: AnalysisIssue["severity"] | "clean";
}

type MapNode = Node<MapNodeData>;
type MapEdge = Edge;

const STATUS_COLORS: Record<AnalysisIssue["severity"] | "clean", string> = {
  clean: "#22c55e",
  low: "#71717a",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

const LAYERS = [
  {
    id: "ui",
    title: "UI / Entry",
    subtitle: "pages, components, client logic",
    clusters: ["Components"],
    x: 260,
    y: 70,
    color: "#a855f7",
  },
  {
    id: "api",
    title: "API / Server",
    subtitle: "routes, server actions, handlers",
    clusters: ["Routes"],
    x: 500,
    y: 70,
    color: "#38bdf8",
  },
  {
    id: "auth",
    title: "Auth",
    subtitle: "session, guards, identity",
    clusters: ["Auth"],
    x: 740,
    y: 20,
    color: "#22c55e",
  },
  {
    id: "billing",
    title: "Billing",
    subtitle: "stripe, subscription, checkout",
    clusters: ["Billing"],
    x: 740,
    y: 220,
    color: "#eab308",
  },
  {
    id: "data",
    title: "Data",
    subtitle: "db, prisma, supabase, sql",
    clusters: ["Database"],
    x: 980,
    y: 120,
    color: "#3b82f6",
  },
  {
    id: "config",
    title: "Config / Other",
    subtitle: "env, config, uncategorized files",
    clusters: ["Config", "Other", "Hooks", "Utils"],
    x: 500,
    y: 420,
    color: "#71717a",
  },
];

function severityRank(severity: AnalysisIssue["severity"]) {
  return { low: 1, medium: 2, high: 3, critical: 4 }[severity];
}

function getPrimaryIssue(issues: AnalysisIssue[]) {
  return [...issues].sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0] || null;
}

function getFileLabel(path: string) {
  const fileName = path.split("/").pop() || path;
  return fileName.length > 24 ? `${fileName.slice(0, 21)}...` : fileName;
}

function createNodeLabel(title: string, subtitle: string, color: string, meta?: string) {
  return (
    <div className="min-w-[158px]">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate text-[12px] font-medium text-white">{title}</span>
      </div>
      <div className="mt-1 truncate pl-4 text-[10px] text-white/45">{meta || subtitle}</div>
    </div>
  );
}

function createClearNodeLabel(main: string, secondary?: string, tooltip?: string) {
  return (
    <div className="min-w-[158px]" title={tooltip}>
      <div className="text-[12px] font-medium text-white leading-tight">{main}</div>
      {secondary && (
        <div className="mt-0.5 text-[10px] text-white/50 leading-tight">{secondary}</div>
      )}
    </div>
  );
}

function makeEdge(id: string, source: string, target: string, color: string, animated = false): MapEdge {
  return {
    id,
    source,
    target,
    type: "smoothstep",
    animated,
    markerEnd: { type: MarkerType.ArrowClosed, color },
    style: { stroke: color, strokeOpacity: animated ? 0.8 : 0.45, strokeWidth: animated ? 2.1 : 1.4 },
  };
}

export function XRayMap({ 
  result, 
  onOpenDrawer, 
  activatedNodeIds, 
  beamProgress = 0, 
  isBeamVisible = false,
  recentlyActivated 
}: XRayMapProps) {
  const [flow, setFlow] = useState<ReactFlowInstance<MapNode, MapEdge> | null>(null);

  // Show the map hint only until the user dismisses it.
  const [showHint, setShowHint] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('xray-map-hint-dismissed') !== 'true';
  });

  const dismissHint = () => {
    setShowHint(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('xray-map-hint-dismissed', 'true');
    }
  };

  // Map display mode: high-level overview or per-file details.
  const [mapMode, setMapMode] = useState<'simple' | 'detailed'>(() => {
    if (typeof window === 'undefined') return 'simple';
    return (localStorage.getItem('xray-map-mode') as 'simple' | 'detailed') || 'simple';
  });

  const toggleMapMode = (mode: 'simple' | 'detailed') => {
    setMapMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('xray-map-mode', mode);
    }
  };

  // Custom node hover tooltip.
  const [hoveredNode, setHoveredNode] = useState<{
    node: MapNode;
    x: number;
    y: number;
  } | null>(null);

  const graph = useMemo(() => {
    const issuesByFile = new Map<string, AnalysisIssue[]>();
    result.issues.forEach((issue) => {
      if (!issue.file) return;
      const list = issuesByFile.get(issue.file) || [];
      list.push(issue);
      issuesByFile.set(issue.file, list);
    });

    const layerByFile = new Map<string, string>();
    result.nodes.forEach((file) => {
      const layer = LAYERS.find((item) => item.clusters.includes(file.cluster)) || LAYERS.find((item) => item.id === "config")!;
      layerByFile.set(file.path, layer.id);
    });

    const isNodeActivated = (nodeId: string) => {
      if (!activatedNodeIds || activatedNodeIds.size === 0) return true;
      return activatedNodeIds.has(nodeId);
    };

    const isRecentlyActivated = (nodeId: string) => {
      return recentlyActivated?.has(nodeId) ?? false;
    };

    const rootActivated = isNodeActivated("project");

    const projectTooltip = result.topRisks[0] 
      ? `Overall scan result.\n\nMain risk: ${result.topRisks[0].simpleExplanation || result.topRisks[0].message}`
      : "Overall scan result for the project.";

    const mapNodes: MapNode[] = [
      {
        id: "project",
        type: "default",
        position: { x: 30, y: 210 },
        data: {
          kind: "root",
          issue: result.topRisks[0] || null,
          status: result.verdict === "ready" ? "clean" : result.verdict === "caution" ? "medium" : "critical",
          label: createClearNodeLabel("Project Scan", `${result.healthScore}/100 · ${result.verdictTitle}`, projectTooltip),
        },
        draggable: true,
        style: {
          background: "#18181b",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 10,
          padding: 10,
          width: 184,
          opacity: rootActivated ? 1 : 0.3,
          transition: "opacity 180ms ease-out",
          boxShadow: "0 0 32px rgba(255,255,255,0.08)",
        },
      },
    ];

    const mapEdges: MapEdge[] = [];

    LAYERS.forEach((layer) => {
      const layerFiles = result.nodes.filter((file) => layer.clusters.includes(file.cluster));
      const layerIssues = result.issues.filter((issue) => issue.file && layerByFile.get(issue.file) === layer.id);
      const primaryIssue = getPrimaryIssue(layerIssues);
      const highPlusCount = layerIssues.filter((issue) => issue.severity === "high" || issue.severity === "critical").length;
      const status: AnalysisIssue["severity"] | "clean" = primaryIssue ? primaryIssue.severity : "clean";
      const color = status === "clean" ? layer.color : STATUS_COLORS[status];

      const layerActivated = isNodeActivated(`layer:${layer.id}`);
      const layerRecently = isRecentlyActivated(`layer:${layer.id}`);

      const layerLabel = layerIssues.length > 0 
        ? `${layerIssues.length} issues${highPlusCount > 0 ? ` (${highPlusCount} high severity)` : ""}`
        : `${layerFiles.length} files - safe zone`;

      const layerTooltip = primaryIssue 
        ? `${layer.title}: ${primaryIssue.simpleExplanation || primaryIssue.message}`
        : `${layer.title} - no risks found in this zone.`;

      mapNodes.push({
        id: `layer:${layer.id}`,
        type: "default",
        position: { x: layer.x, y: layer.y },
        data: {
          kind: "layer",
          issue: primaryIssue,
          status,
          label: createClearNodeLabel(layer.title, layerLabel, layerTooltip),
        },
        draggable: true,
        style: {
          background: "#111113",
          border: `1px solid ${color}88`,
          borderRadius: 10,
          padding: 10,
          width: 184,
          opacity: layerActivated ? 1 : 0.25,
          transition: "opacity 220ms ease-out, box-shadow 300ms ease-out",
          boxShadow: layerRecently 
            ? `0 0 32px ${color}55, 0 0 12px ${color}33` 
            : status === "critical" ? "0 0 24px rgba(239,68,68,0.22)" : undefined,
          transform: layerRecently ? "scale(1.02)" : undefined,
        },
      });

      if (mapMode === 'simple') {
        const criticalInLayer = layerIssues.filter(i => i.severity === "critical").length;
        const highInLayer = layerIssues.filter(i => i.severity === "high").length;

        let summaryText = "clean";
        let summaryColor = "#22c55e";

        if (criticalInLayer > 0) {
          summaryText = `${criticalInLayer} critical`;
          summaryColor = "#ef4444";
        } else if (highInLayer > 0) {
          summaryText = `${highInLayer} high`;
          summaryColor = "#f59e0b";
        }

        const summaryId = `summary:${layer.id}`;
        mapNodes.push({
          id: summaryId,
          type: "default",
          position: { x: layer.x, y: layer.y + 92 },
          data: {
            kind: "summary",
            issue: primaryIssue,
            status,
            label: createClearNodeLabel(summaryText, `${layerFiles.length} files`),
          },
          draggable: true,
          style: {
            background: "#111113",
            border: `2px solid ${summaryColor}`,
            borderRadius: 12,
            padding: 12,
            width: 200,
            opacity: layerActivated ? 1 : 0.4,
          },
        });

        mapEdges.push(makeEdge(`layer-summary:${layer.id}`, `layer:${layer.id}`, summaryId, summaryColor, status !== "clean"));

      } else {
        const riskFiles = layerFiles
          .map((file) => ({
            file,
            issue: getPrimaryIssue(issuesByFile.get(file.path) || []),
          }))
          .filter((item): item is { file: typeof item.file; issue: AnalysisIssue } => Boolean(item.issue))
          .sort((a, b) => severityRank(b.issue.severity) - severityRank(a.issue.severity) || a.file.path.localeCompare(b.file.path));

        riskFiles.slice(0, 5).forEach(({ file, issue }, index) => {
          const issueColor = STATUS_COLORS[issue.severity];
          const riskId = `risk:${file.path}`;
          const isActivated = isNodeActivated(file.path);
          const isRecent = isRecentlyActivated(file.path);

          const riskLabel = issue.simpleExplanation || issue.message;

          mapNodes.push({
            id: riskId,
            type: "default",
            position: { x: layer.x, y: layer.y + 82 + index * 52 },
            data: {
              kind: "risk",
              file: file.path,
              issue,
              status: issue.severity,
              label: createClearNodeLabel(getFileLabel(file.path), riskLabel),
            },
            draggable: true,
            style: {
              background: "#1a160f",
              border: `1.5px solid ${issueColor}`,
              borderRadius: 8,
              padding: 8,
              width: 210,
              opacity: isActivated ? 1 : 0.25,
              boxShadow: isRecent ? `0 0 24px ${issueColor}55` : undefined,
            },
          });

          mapEdges.push(makeEdge(`layer-risk:${layer.id}:${file.path}`, `layer:${layer.id}`, riskId, issueColor, issue.severity === "high" || issue.severity === "critical"));
        });
      }
    });

    const layerExists = (id: string) => mapNodes.some((node) => node.id === `layer:${id}`);

    const addFlowEdge = (source: string, target: string, color: string) => {
      if ((source === "project" || layerExists(source.replace("layer:", ""))) &&
          (target === "project" || layerExists(target.replace("layer:", "")))) {
        mapEdges.push(makeEdge(`flow:${source}-${target}`, source, target, color));
      }
    };

    addFlowEdge("project", "layer:ui", "#a855f7");
    addFlowEdge("project", "layer:api", "#38bdf8");
    addFlowEdge("layer:ui", "layer:api", "#38bdf8");
    addFlowEdge("layer:api", "layer:auth", "#22c55e");
    addFlowEdge("layer:api", "layer:billing", "#eab308");
    addFlowEdge("layer:api", "layer:data", "#3b82f6");

    const projectIssues = result.issues.filter((issue) => !issue.file);
    if (projectIssues.length > 0) {
      const issue = getPrimaryIssue(projectIssues)!;
      const color = STATUS_COLORS[issue.severity];
      mapNodes.push({
        id: "project-risk",
        type: "default",
        position: { x: 30, y: 330 },
        data: {
          kind: "risk",
          issue,
          status: issue.severity,
          label: createNodeLabel("Project-level risk", issue.ruleName, color, issue.message),
        },
        draggable: true,
        style: {
          background: "#14110b",
          border: `1px solid ${color}aa`,
          borderRadius: 8,
          padding: 9,
          width: 190,
        },
      });
      mapEdges.push(makeEdge("project-project-risk", "project", "project-risk", color, issue.severity === "high" || issue.severity === "critical"));
    }

    return { nodes: mapNodes, edges: mapEdges };
  }, [activatedNodeIds, mapMode, recentlyActivated, result]);

  const [nodes, setNodes, onNodesChange] = useNodesState<MapNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<MapEdge>([]);

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph.nodes, graph.edges, setNodes, setEdges]);

  return (
    <div className="relative h-[720px] overflow-hidden rounded-2xl border border-white/10 bg-[#090909]">
      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-xl border border-white/10 bg-black/70 px-4 py-3 backdrop-blur">
        <div className="text-xs tracking-[2px] text-white/45">RISK ZONE MAP (SIMPLIFIED)</div>
        <div className="mt-1 max-w-[460px] text-xs text-white/75 leading-snug space-y-1">
          <div>Shows the major architectural zones of the project and the risk level in each one.</div>
          <div className="text-white/55">
            Color = how risky it is to change that zone. Individual files were removed to keep the map simpler and clearer.
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex gap-3 rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-[10px] text-white/70 backdrop-blur">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-500" /> safe to change</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-yellow-500" /> medium risk</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-orange-500" /> high risk</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-red-500" /> very risky</span>
      </div>

      {/* Prominent map mode switch. */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-1 rounded-xl border border-white/20 bg-zinc-950/90 p-1 backdrop-blur shadow-sm">
        <button
          onClick={() => toggleMapMode('simple')}
          className={`px-4 py-1.5 text-xs rounded-lg transition font-medium ${
            mapMode === 'simple' ? 'bg-white text-black' : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => toggleMapMode('detailed')}
          className={`px-4 py-1.5 text-xs rounded-lg transition font-medium ${
            mapMode === 'detailed' ? 'bg-white text-black' : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          Detailed
        </button>
      </div>

      {/* Top-right hint, adapted to the selected mode. */}
      <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-[10px] text-white/70 backdrop-blur max-w-[300px] mt-9">
        {mapMode === 'simple' ? (
          <>
            <div><strong>Overview</strong>: only major project zones and their risk levels.</div>
            <div className="mt-1 text-white/55">Useful for quickly understanding where the most fragile areas are.</div>
          </>
        ) : (
          <>
            <div><strong>Detailed</strong>: shows specific files with serious risks.</div>
            <div className="mt-1 text-white/55">Helps identify which exact modules are best left untouched.</div>
          </>
        )}
      </div>

      {/* First-run map guidance. */}
      {showHint && (
        <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-xl border border-white/15 bg-zinc-950/95 px-4 py-3 text-xs text-white/80 backdrop-blur shadow-lg max-w-[440px]">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="font-medium text-white mb-1">How to read this map</div>
              <div className="leading-snug text-white/75">
                Each block is a project zone. The color shows the risk of changes: the redder it is, the more dangerous it is to touch that area (higher chance of breaking a lot of other code).
              </div>
            </div>
            <button 
              onClick={dismissHint}
              className="text-white/50 hover:text-white text-lg leading-none mt-[-2px]"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Custom tooltip for hovered nodes. */}
      {hoveredNode && hoveredNode.node.data.issue && (
        <div
          className="fixed z-[999] pointer-events-none rounded-lg border border-white/15 bg-zinc-900/95 px-3 py-2 text-xs text-white/90 shadow-xl max-w-[340px] backdrop-blur"
          style={{
            left: hoveredNode.x,
            top: hoveredNode.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-medium mb-1 text-white">
            {hoveredNode.node.data.issue.ruleName}
          </div>
          <div className="text-white/75 leading-snug">
            {hoveredNode.node.data.issue.simpleExplanation || 
             hoveredNode.node.data.issue.businessImpact || 
             hoveredNode.node.data.issue.impact}
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={setFlow}
        onNodeClick={(_, node) => {
          const file = typeof node.data.file === "string" ? node.data.file : undefined;
          const issue = (node.data.issue as AnalysisIssue | null) || null;
          flow?.setCenter(node.position.x + 95, node.position.y + 32, { zoom: 1.22, duration: 320 });
          onOpenDrawer(issue, file);
        }}
        onNodeMouseEnter={(event, node) => {
          // Use mouse coordinates to position the tooltip.
          setHoveredNode({
            node: node as MapNode,
            x: event.clientX,
            y: event.clientY - 12,
          });
        }}
        onNodeMouseLeave={() => {
          setHoveredNode(null);
        }}
        fitView
        fitViewOptions={{ padding: 0.16 }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#2a2a2a" gap={24} size={1} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => {
            const status = node.data?.status as AnalysisIssue["severity"] | "clean" | undefined;
            if (status) return STATUS_COLORS[status];
            if (node.data?.kind === "root") return "#ffffff";
            return "#71717a";
          }}
          maskColor="rgba(0,0,0,0.55)"
          className="!bg-black/70 !border !border-white/10"
        />
        <Controls className="!border !border-white/10 !bg-black/70 [&_button]:!border-white/10 [&_button]:!bg-zinc-950 [&_button]:!text-white" />
      </ReactFlow>

      {/* Scan beam. */}
      <ScanBeamOverlay
        progress={beamProgress}
        isVisible={isBeamVisible}
      />
    </div>
  );
}
