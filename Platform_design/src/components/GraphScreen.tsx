import React, { useEffect, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { Loader2, Workflow } from "lucide-react";
import type { AuthRequestContext, GraphEdge, GraphNode, KGTriple } from "../types";
import { api } from "../app/api";

const NODE_COLORS: Record<string, string> = {
  person: "#6C63FF",
  org: "#00D4AA",
  organization: "#00D4AA",
  project: "#FF8A65",
  date: "#EC4899",
  concept: "#A78BFA",
  technology: "#F59E0B",
  location: "#10B981",
};

export default function GraphScreen({
  conversationId,
  authContext,
}: {
  conversationId: number | null;
  authContext?: AuthRequestContext;
}) {
  const fgRef = useRef<any>(null);
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
              x: 120 + (idx % 4) * 150,
              y: 120 + Math.floor(idx / 4) * 130,
            };
            idx++;
          }
          if (!nodeMap[t.object]) {
            nodeMap[t.object] = {
              id: t.object,
              label: t.object,
              type: "concept",
              x: 120 + (idx % 4) * 150,
              y: 120 + Math.floor(idx / 4) * 130,
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
        className="flex-1 relative overflow-hidden bg-white"
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
          <>
          <ForceGraph2D
            ref={fgRef}
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
            width={window.innerWidth - 560}
            height={window.innerHeight - 64}
            backgroundColor="#FFFFFF"
            nodeLabel={(node: any) => `${node.label} (${node.type})`}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const r = 12;
              const color = NODE_COLORS[node.type] || "#6C63FF";

              // Outer glow ring
              ctx.beginPath();
              ctx.arc(node.x, node.y, r + 3, 0, 2 * Math.PI);
              ctx.fillStyle = color + "30";
              ctx.fill();

              // Main circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
              ctx.strokeStyle = "#FFFFFF";
              ctx.lineWidth = 2;
              ctx.stroke();

              // Label below node
              const fontSize = Math.max(9 / globalScale, 4);
              ctx.font = `600 ${fontSize}px Inter, sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = "#1F2937";
              const maxLen = 12;
              const label = node.label?.length > maxLen
                ? node.label.slice(0, maxLen) + "…"
                : node.label || "";
              ctx.fillText(label, node.x, node.y + r + 4);
            }}
            nodePointerAreaPaint={(node: any, color, ctx) => {
              ctx.beginPath();
              ctx.arc(node.x, node.y, 15, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
            }}
            linkColor={() => "#E5E7EB"}
            linkWidth={1.6}
            linkDirectionalArrowLength={5}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={1}
            linkDirectionalParticleSpeed={0.004}
            linkDirectionalParticleColor={() => "#6C63FF"}
            linkCanvasObjectMode={() => "after"}
            linkCanvasObject={(link: any, ctx) => {
              const start = link.source;
              const end = link.target;
              if (!start?.x || !end?.x) return;
              const mx = (start.x + end.x) / 2;
              const my = (start.y + end.y) / 2;
              ctx.font = "10px Inter, sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = "#9CA3AF";
              ctx.fillText(link.label || "", mx, my - 5);
            }}
            onNodeClick={(node: any) => {
              fgRef.current?.centerAt(node.x, node.y, 600);
              fgRef.current?.zoom(2.5, 600);
            }}
            enableNodeDrag={true}
            enableZoomInteraction={true}
            cooldownTicks={220}
            d3AlphaDecay={0.01}
            d3VelocityDecay={0.35}
          />

          <div style={{position:"absolute", top:16, left:16,
            background:"rgba(255,255,255,0.96)", borderRadius:14, padding:"12px 16px",
            border:"1px solid #E5E7EB", boxShadow:"0 8px 24px rgba(15, 23, 42, 0.06)", backdropFilter:"blur(8px)"}}>
            <p style={{fontSize:11, fontWeight:600, color:"#6B7280",
              marginBottom:8, textTransform:"uppercase", letterSpacing:1}}>
              Entity Types
            </p>
            {Object.entries(NODE_COLORS)
              .filter(([type]) => !["organization"].includes(type))
              .map(([type, color]) => (
                <div key={type} style={{display:"flex", alignItems:"center",
                  gap:6, marginBottom:4}}>
                  <div style={{width:8, height:8, borderRadius:"50%",
                    backgroundColor:color}} />
                  <span style={{fontSize:11, color:"#374151",
                    textTransform:"capitalize"}}>{type}</span>
                </div>
              ))}
          </div>
          </>
        )}
      </div>

      <div className="w-[300px] bg-white border-l border-[#E5E7EB] overflow-y-auto p-4">
        <div className="mb-4">
          <h3 className="text-[13px] font-semibold text-[#101827]">
            Relationships
          </h3>
          <p className="text-[11px] text-[#9CA3AF] mt-1">
            {triples.length} links captured from KG memory
          </p>
        </div>
        <div className="space-y-2">
          {triples.map((t) => (
            <div
              key={t.id}
              className="text-[11px] text-[#6B7280] px-3 py-2 rounded-2xl bg-[#FAFBFF] border border-[#E5E7EB] shadow-sm"
            >
              <span className="font-medium text-[#101827]">{t.subject}</span>
              <span className="mx-1.5 text-[#9CA3AF]">→</span>
              <span className="text-[#7A1F2B]">{t.predicate}</span>
              <span className="mx-1.5 text-[#9CA3AF]">→</span>
              <span className="font-medium text-[#101827]">{t.object}</span>
            </div>
          ))}
          {triples.length === 0 && (
            <div className="text-[12px] text-[#9CA3AF] text-center py-8">
              No triples yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
