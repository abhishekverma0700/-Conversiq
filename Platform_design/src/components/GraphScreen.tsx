import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [triples, setTriples] = useState<KGTriple[]>([]);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(false);

  const isFiniteCoord = (value: any) => Number.isFinite(value);

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

  const getNodeRadius = (node: any) => {
    const labelLength = String(node?.label || "").length;
    const base = 11;
    return base + Math.min(8, Math.max(0, Math.ceil(labelLength / 9)));
  };

  const graphData = useMemo(() => ({
    nodes: nodes.map((n) => ({ id: n.id, label: n.label, type: n.type })),
    links: edges.map((e) => ({ source: e.source, target: e.target, label: e.label })),
  }), [nodes, edges]);

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
            const subjectX = 120 + (idx % 4) * 150;
            const subjectY = 120 + Math.floor(idx / 4) * 130;
            nodeMap[t.subject] = {
              id: t.subject,
              label: t.subject,
              type: "concept",
              x: Number.isFinite(subjectX) ? subjectX : 120,
              y: Number.isFinite(subjectY) ? subjectY : 120,
            };
            idx++;
          }
          if (!nodeMap[t.object]) {
            const objectX = 120 + (idx % 4) * 150;
            const objectY = 120 + Math.floor(idx / 4) * 130;
            nodeMap[t.object] = {
              id: t.object,
              label: t.object,
              type: "concept",
              x: Number.isFinite(objectX) ? objectX : 120,
              y: Number.isFinite(objectY) ? objectY : 120,
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

  useEffect(() => {
    if (!fgRef.current || nodes.length === 0) return;
    const timer = window.setTimeout(() => {
      fgRef.current?.zoomToFit?.(500, 40);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [nodes, edges]);

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
        ref={containerRef}
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
            graphData={graphData}
            width={containerRef.current?.clientWidth || window.innerWidth - 560}
            height={containerRef.current?.clientHeight || window.innerHeight - 64}
            backgroundColor="#FFFFFF"
            nodeLabel={(node: any) => `${node.label} (${node.type})`}
            nodeVal={(node: any) => getNodeRadius(node)}
            d3AlphaMin={0.001}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.4}
            cooldownTicks={180}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const r = getNodeRadius(node);
              const color = NODE_COLORS[node.type] || "#6C63FF";
              const safeX = isFiniteCoord(node?.x) ? node.x : 0;
              const safeY = isFiniteCoord(node?.y) ? node.y : 0;
              const labelLines = wrapLabel(String(node?.label || ""), 14);

              ctx.beginPath();
              ctx.arc(safeX, safeY, r + 4, 0, 2 * Math.PI);
              ctx.fillStyle = color + "30";
              ctx.fill();

              ctx.beginPath();
              ctx.arc(safeX, safeY, r, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
              ctx.strokeStyle = "#FFFFFF";
              ctx.lineWidth = 2;
              ctx.stroke();

              const fontSize = Math.max(9 / globalScale, 5);
              ctx.font = `600 ${fontSize}px Inter, sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = "#1F2937";
              labelLines.forEach((line, i) => {
                ctx.fillText(line, safeX, safeY + r + 4 + i * (fontSize + 1));
              });
            }}
            nodePointerAreaPaint={(node: any, color, ctx) => {
              const safeX = isFiniteCoord(node?.x) ? node.x : 0;
              const safeY = isFiniteCoord(node?.y) ? node.y : 0;
              ctx.beginPath();
              ctx.arc(safeX, safeY, getNodeRadius(node) + 5, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
            }}
            linkColor={() => "#E5E7EB"}
            linkWidth={1.6}
            linkDirectionalArrowLength={5}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={0}
            linkDirectionalParticleColor={() => "#6C63FF"}
            linkCanvasObjectMode={() => "after"}
            linkCanvasObject={(link: any, ctx) => {
              const start = link.source;
              const end = link.target;
              if (!isFiniteCoord(start?.x) || !isFiniteCoord(start?.y) || !isFiniteCoord(end?.x) || !isFiniteCoord(end?.y)) return;
              const mx = (start.x + end.x) / 2;
              const my = (start.y + end.y) / 2;
              ctx.font = "600 9px Inter, sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = "#9CA3AF";
              const text = String(link.label || "");
              if (!text) return;
              const trimmed = text.length > 16 ? `${text.slice(0, 16)}…` : text;
              ctx.fillText(trimmed, mx, my - 5);
            }}
            onNodeClick={(node: any) => {
              if (isFiniteCoord(node?.x) && isFiniteCoord(node?.y)) {
                fgRef.current?.centerAt(node.x, node.y, 600);
                fgRef.current?.zoom(2.5, 600);
              }
            }}
            enableNodeDrag={true}
            enableZoomInteraction={true}
            onEngineStop={() => fgRef.current?.zoomToFit?.(500, 40)}
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
