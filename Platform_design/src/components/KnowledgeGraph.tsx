import React, { useRef, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
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
  const fgRef = useRef<any>();

  const handleNodeClick = useCallback((node: any) => {
    if (fgRef.current) {
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

  const graphData = {
    nodes: nodes.map((n) => ({ id: n.id, label: n.label, type: n.type })),
    links: edges.map((e) => ({ source: e.source, target: e.target, label: e.label })),
  };

  return (
    <div style={{ position: "relative", width, height, borderRadius: 12, overflow: "hidden" }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={width}
        height={height}
        backgroundColor="#0F0F1A"
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const r = fullscreen ? 10 : 7;
          const color = ENTITY_COLORS[node.type] || "#6C63FF";
          
          // Glow effect
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          
          // Circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Label
          const fontSize = fullscreen ? 11 : 9;
          ctx.font = `600 ${fontSize}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = "#E5E7EB";
          const maxLen = fullscreen ? 16 : 10;
          const label = node.label?.length > maxLen 
            ? node.label.slice(0, maxLen) + "…" 
            : node.label || "";
          ctx.fillText(label, node.x, node.y + r + 3);
        }}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 12, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        linkColor={() => "#4B5563"}
        linkWidth={1.5}
        linkDirectionalArrowLength={5}
        linkDirectionalArrowRelPos={1}
        linkDirectionalParticles={1}
        linkDirectionalParticleSpeed={0.004}
        linkCanvasObjectMode={() => "after"}
        linkCanvasObject={(link: any, ctx) => {
          const start = link.source;
          const end = link.target;
          if (!start?.x || !end?.x) return;
          const mx = (start.x + end.x) / 2;
          const my = (start.y + end.y) / 2;
          ctx.font = `${fullscreen ? 9 : 7}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#9CA3AF";
          ctx.fillText(link.label || "", mx, my - 4);
        }}
        onNodeClick={handleNodeClick}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        cooldownTicks={80}
        nodeLabel={(node: any) => `${node.label} (${node.type})`}
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
