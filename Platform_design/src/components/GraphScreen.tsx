import React, { useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { Loader2, Workflow } from "lucide-react";
import type { AuthRequestContext, GraphEdge, GraphNode, KGTriple } from "../types";
import { api } from "../app/api";

export default function GraphScreen({
  conversationId,
  authContext,
}: {
  conversationId: number | null;
  authContext?: AuthRequestContext;
}) {
  const [triples, setTriples] = useState<KGTriple[]>([]);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    api
      .getGraph(conversationId, authContext)
      .then((data) => {
        setTriples(data.triples || []);
        const nodeMap: Record<string, GraphNode> = {};
        const edgeList: GraphEdge[] = [];
        let idx = 0;
        (data.triples || []).forEach((t: KGTriple) => {
          if (!nodeMap[t.subject]) {
            nodeMap[t.subject] = {
              id: t.subject,
              label: t.subject,
              type: "concept",
              x: 80 + (idx % 6) * 90,
              y: 80 + Math.floor(idx / 6) * 90,
            };
            idx++;
          }
          if (!nodeMap[t.object]) {
            nodeMap[t.object] = {
              id: t.object,
              label: t.object,
              type: "concept",
              x: 80 + (idx % 6) * 90,
              y: 80 + Math.floor(idx / 6) * 90,
            };
            idx++;
          }
          edgeList.push({ source: t.subject, target: t.object, label: t.predicate });
        });
        setNodes(Object.values(nodeMap));
        setEdges(edgeList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [conversationId, authContext]);

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center text-[#9CA3AF]">
        Select a conversation to view its knowledge graph.
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div
        className="flex-1 relative overflow-hidden bg-[#FBF7F6]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(122,31,43,0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#7A1F2B] animate-spin" />
          </div>
        ) : nodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#9CA3AF] gap-3">
            <Workflow className="w-10 h-10 opacity-30" />
            <div className="text-[14px]">No graph data yet</div>
            <div className="text-[12px]">
              Switch to KG memory and chat to build relationships
            </div>
          </div>
        ) : (
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
            width={640}
            height={480}
          />
        )}
      </div>

      <div className="w-[280px] bg-white border-l border-[#E5E7EB] overflow-y-auto p-4">
        <h3 className="text-[13px] font-semibold text-[#101827] mb-3">
          Relationships ({triples.length})
        </h3>
        <div className="space-y-1.5">
          {triples.map((t) => (
            <div
              key={t.id}
              className="text-[11px] text-[#6B7280] px-2 py-1.5 rounded-xl bg-[#FAFBFF] border border-[#E5E7EB]"
            >
              <span className="font-medium text-[#101827]">{t.subject}</span>
              <span className="mx-1.5 text-[#9CA3AF]">→</span>
              <span className="text-[#7A1F2B]">{t.predicate}</span>
              <span className="mx-1.5 text-[#9CA3AF]">→</span>
              <span className="font-medium text-[#101827]">{t.object}</span>
            </div>
          ))}
          {triples.length === 0 && (
            <div className="text-[12px] text-[#9CA3AF] text-center py-6">
              No triples yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
