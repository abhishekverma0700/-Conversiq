import React, { useEffect, useMemo, useRef, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { forceCollide, forceManyBody } from "d3-force";
import type { GraphEdge, GraphNode } from "../types";

const ENTITY_COLORS: Record<string, string> = {
  person: "#6C63FF",
  org: "#00D4AA",
  organization: "#00D4AA",
  project: "#FF8A65",
  date: "#EC4899",
  concept: "#A78BFA",
  technology: "#F59E0B",
  location: "#10B981",
  general: "#94A3B8",
};

export default function KnowledgeGraph({
  nodes,
  edges,
  width = 280,
  height = 220,
  fullscreen = false,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width?: number;
  height?: number;
  fullscreen?: boolean;
}) {
  const fgRef = useRef<any>(null);

  const graphData = useMemo(() => ({
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
    })),
    links: edges.map((e) => ({ source: e.source, target: e.target, label: e.label })),
  }), [nodes, edges]);

  useEffect(() => {
    if (!fgRef.current || nodes.length === 0) return;
    const timer = window.setTimeout(() => {
      fgRef.current?.zoomToFit?.(450, 48);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [nodes, edges]);

  useEffect(() => {
    if (!fgRef.current || nodes.length === 0) return;

    fgRef.current.d3Force?.("charge", forceManyBody().strength(-220));
    fgRef.current.d3Force?.("collide", forceCollide().radius((node: any) => getNodeSize(node) + 8).iterations(2));
    fgRef.current.d3ReheatSimulation?.();
  }, [nodes, edges, fullscreen]);

  const wrapLabel = (label: string, maxChars: number) => {
    if (!label) return [] as string[];
    const words = label.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    });
    if (current) lines.push(current);
    return lines.slice(0, 3);
  };

  const getNodeSize = (node: any) => {
    const labelLength = String(node?.label || "").length;
    const base = fullscreen ? 12 : 9;
    const extra = Math.min(10, Math.max(0, Math.ceil(labelLength / 8)));
    return base + extra;
  };

  const isFiniteCoord = (value: any) => Number.isFinite(value);

  const handleNodeClick = useCallback((node: any) => {
    if (fgRef.current && isFiniteCoord(node?.x) && isFiniteCoord(node?.y)) {
      fgRef.current.centerAt(node.x, node.y, 600);
      fgRef.current.zoom(3, 600);
    }
  }, []);

  if (nodes.length === 0) {
    return (
      <div style={{
        width, height,
        background: "#0F0F1A",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🕸️</div>
        <p style={{ color: "#6B7280", fontSize: 12, margin: 0 }}>No relationships yet</p>
        <p style={{ color: "#4B5563", fontSize: 11, marginTop: 4 }}>Use KG memory and start chatting</p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width, height, borderRadius: 12, overflow: "hidden" }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={width}
        height={height}
        backgroundColor="#0F0F1A"
        d3AlphaMin={0.001}
        d3AlphaDecay={0.03}
        d3VelocityDecay={0.45}
        cooldownTicks={140}
        warmupTicks={0}
        nodeRelSize={4}
        nodeVal={(node: any) => getNodeSize(node)}
        minZoom={0.35}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const radius = getNodeSize(node);
          const color = ENTITY_COLORS[node.type] || "#6C63FF";
          const safeX = isFiniteCoord(node?.x) ? node.x : 0;
          const safeY = isFiniteCoord(node?.y) ? node.y : 0;
          const maxLineChars = fullscreen ? 14 : 10;
          const labelLines = wrapLabel(String(node?.label || ""), maxLineChars);
          const lineHeight = Math.max(10 / globalScale, fullscreen ? 12 : 10);
          
          ctx.shadowColor = color;
          ctx.shadowBlur = 6;
          
          ctx.beginPath();
          ctx.arc(safeX, safeY, radius, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.shadowBlur = 0;

          const fontSize = Math.max(9 / globalScale, fullscreen ? 9 : 8);
          ctx.font = `600 ${fontSize}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = "#E5E7EB";

          const totalHeight = labelLines.length * lineHeight;
          labelLines.forEach((line, index) => {
            ctx.fillText(line, safeX, safeY + radius + 4 + index * lineHeight);
          });

          // soft hit area for the label
          ctx.beginPath();
          ctx.rect(safeX - radius - 8, safeY - radius - 8, (radius + 8) * 2, (radius + 8) * 2 + totalHeight);
        }}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          const safeX = isFiniteCoord(node?.x) ? node.x : 0;
          const safeY = isFiniteCoord(node?.y) ? node.y : 0;
          const radius = getNodeSize(node) + 5;
          ctx.beginPath();
          ctx.arc(safeX, safeY, radius, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        linkColor={() => "#4B5563"}
        linkWidth={1.5}
        linkDirectionalArrowLength={5}
        linkDirectionalArrowRelPos={1}
        linkDirectionalParticles={0}
        linkCanvasObjectMode={() => "after"}
        linkCanvasObject={(link: any, ctx) => {
          const start = link.source;
          const end = link.target;
          if (!isFiniteCoord(start?.x) || !isFiniteCoord(start?.y) || !isFiniteCoord(end?.x) || !isFiniteCoord(end?.y)) return;
          const mx = (start.x + end.x) / 2;
          const my = (start.y + end.y) / 2;
          ctx.font = `600 ${Math.max(7, fullscreen ? 9 : 7)}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#94A3B8";
          const text = String(link.label || "");
          if (!text) return;
          const safeLabel = text.length > (fullscreen ? 18 : 12) ? `${text.slice(0, fullscreen ? 18 : 12)}…` : text;
          ctx.fillText(safeLabel, mx, my - 4);
        }}
        onNodeClick={handleNodeClick}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        nodeLabel={(node: any) => `${node.label} (${node.type})`}
        onEngineStop={() => fgRef.current?.zoomToFit?.(450, 48)}
        onNodeDragEnd={(node: any) => {
          if (isFiniteCoord(node?.x) && isFiniteCoord(node?.y)) {
            node.fx = node.x;
            node.fy = node.y;
          }
        }}
      />

      {/* Legend - only in fullscreen */}
      {fullscreen && (
        <div style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: "rgba(0,0,0,0.6)",
          borderRadius: 8,
          padding: "10px 14px",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          <p style={{ color: "#9CA3AF", fontSize: 10, margin: "0 0 8px 0", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
            Entity Types
          </p>
          {Object.entries(ENTITY_COLORS).filter(([type]) => 
            !["organization", "general"].includes(type)
          ).map(([type, color]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color }} />
              <span style={{ color: "#D1D5DB", fontSize: 10, textTransform: "capitalize" }}>{type}</span>
            </div>
          ))}
        </div>
      )}

      {/* Node count badge */}
      <div style={{
        position: "absolute",
        bottom: 8,
        left: 8,
        background: "rgba(0,0,0,0.5)",
        borderRadius: 6,
        padding: "3px 8px",
        fontSize: 10,
        color: "#9CA3AF",
      }}>
        {nodes.length} nodes · {edges.length} edges
      </div>
    </div>
  );
}
