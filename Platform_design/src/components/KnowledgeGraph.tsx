import React from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { GraphEdge, GraphNode } from "../types";

export default function MiniGraph({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) {
  return (
    <ForceGraph2D
      graphData={{
        nodes: nodes.map((n) => ({
          id: n.id,
          label: n.label,
          type: n.type,
        })),
        links: edges.map((e) => ({
          source: e.source,
          target: e.target,
          label: e.label,
        })),
      }}
      nodeLabel="label"
      nodeColor={(node: any) => {
        const colors: Record<string, string> = {
          person: "#7A1F2B",
          org: "#C8A96A",
          project: "#B76E4E",
          date: "#A15B68",
          concept: "#9B4B5A",
        };
        return colors[node.type] || "#7A1F2B";
      }}
      linkLabel="label"
      linkColor={() => "#374151"}
      backgroundColor="#0F0F1A"
      width={280}
      height={220}
    />
  );
}
