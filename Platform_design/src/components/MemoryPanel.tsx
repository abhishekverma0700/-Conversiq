import React, { useCallback, useEffect, useState } from "react";
import { Activity, Database, FileClock, Loader2, RefreshCw, Workflow, Clock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { AuthRequestContext, Entity, GraphEdge, GraphNode, KGTriple, MemoryTab, TokenInfo } from "../types";
import { api } from "../app/api";
import EntityCard from "./EntityDashboard";
import MiniGraph from "./KnowledgeGraph";
import TokenBar from "./TokenUsage";

export default function MemoryPanel({
  activeTab,
  setActiveTab,
  conversationId,
  refreshKey,
  authContext,
}: {
  activeTab: MemoryTab;
  setActiveTab: (t: MemoryTab) => void;
  conversationId: number | null;
  refreshKey?: number;
  authContext?: AuthRequestContext;
}) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [triples, setTriples] = useState<KGTriple[]>([]);
  const [graphData, setGraphData] = useState<{
    nodes: GraphNode[];
    edges: GraphEdge[];
  }>({ nodes: [], edges: [] });
  const [summary, setSummary] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const toGraphData = useCallback((allTriples: KGTriple[]) => {
    const nodeMap: Record<string, GraphNode> = {};
    const edges: GraphEdge[] = [];
    let nodeIdx = 0;
    allTriples.forEach((t: KGTriple) => {
      if (!nodeMap[t.subject]) {
        nodeMap[t.subject] = {
          id: t.subject,
          label: t.subject,
          type: "concept",
          x: 60 + (nodeIdx % 5) * 70,
          y: 60 + Math.floor(nodeIdx / 5) * 70,
        };
        nodeIdx++;
      }
      if (!nodeMap[t.object]) {
        nodeMap[t.object] = {
          id: t.object,
          label: t.object,
          type: "concept",
          x: 60 + (nodeIdx % 5) * 70,
          y: 60 + Math.floor(nodeIdx / 5) * 70,
        };
        nodeIdx++;
      }
      edges.push({ source: t.subject, target: t.object, label: t.predicate });
    });
    return { nodes: Object.values(nodeMap), edges };
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const [entitiesRes, graphRes, summaryRes, tokenRes] = await Promise.all([
        api.getEntities(conversationId, authContext),
        api.getGraph(conversationId, authContext),
        api.getSummary(conversationId, authContext),
        api.getTokenInfo(conversationId, authContext),
      ]);

      setEntities(entitiesRes.entities || []);
      setTriples(graphRes.triples || []);
      setGraphData(toGraphData(graphRes.triples || []));
      setSummary(summaryRes.summary_text || null);
      setTokenInfo(tokenRes);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [conversationId, authContext, toGraphData]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData, refreshKey]);

  const tabs: { id: MemoryTab; icon: React.ElementType; label: string }[] = [
    { id: "entities", icon: Database, label: "Entities" },
    { id: "graph", icon: Workflow, label: "Graph" },
    { id: "summary", icon: FileClock, label: "Summary" },
    { id: "tokens", icon: Activity, label: "Tokens" },
  ];

  return (
    <div className="h-full flex flex-col bg-white border-l border-[#E5E7EB]">
      <div className="px-4 pt-4 pb-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2 mb-3 rounded-2xl bg-[#FBF7F6] border border-[#EAD9DC] px-3 py-2.5 shadow-[0_2px_10px_rgba(122,31,43,0.03)]">
          <Database className="w-4 h-4 text-[#7A1F2B]" />
          <span className="text-[13px] font-semibold text-[#101827]">
            Memory Inspector
          </span>
          <div className="ml-auto flex gap-1.5">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F7E9EB] text-[#7A1F2B]">
              {entities.length} entities
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FBF2DF] text-[#B76E4E]">
              {triples.length} relations
            </span>
          </div>
        </div>
        <button
          onClick={fetchAllData}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-[#6B7280] hover:text-[#7A1F2B] hover:bg-[#F7E9EB] rounded-lg transition-colors mb-2"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
        <div className="flex border-b border-[#F3F4F6] relative -mx-4 px-4 gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-medium uppercase tracking-wide transition-colors relative shrink-0 ${
                activeTab === tab.id
                  ? "bg-[#F7E9EB] text-[#7A1F2B]"
                  : "text-[#8A94A6] hover:bg-[#FBF7F6] hover:text-[#6B7280]"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tabUnderline"
                  className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#7A1F2B] rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 text-[#7A1F2B] animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "entities" && (
              <motion.div
                key="entities"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="p-4 space-y-3"
              >
                {entities.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#D0CFFE] bg-[#FAFAFF] p-5 text-center">
                    <div className="mx-auto w-9 h-9 rounded-full bg-[#F7E9EB] text-[#7A1F2B] flex items-center justify-center mb-2">
                      <Database className="w-4 h-4" />
                    </div>
                    <div className="text-[12px] font-semibold text-[#1A1A2E]">
                      No entities yet
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-1">
                      Start chatting with Entity or KG memory to track facts.
                    </div>
                  </div>
                ) : (
                  entities.map((entity) => (
                    <EntityCard key={entity.id} entity={entity} compact />
                  ))
                )}
              </motion.div>
            )}

            {activeTab === "graph" && (
              <motion.div
                key="graph"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="p-4 space-y-3"
              >
                {graphData.nodes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#D0CFFE] bg-[#FAFAFF] p-5 text-center">
                    <div className="text-[12px] font-semibold text-[#1A1A2E]">
                      No graph data yet
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-1">
                      Use KG memory mode to build relationships.
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className="rounded-xl overflow-hidden"
                      style={{ background: "#0F0F1A", aspectRatio: "1/0.8" }}
                    >
                      <MiniGraph nodes={graphData.nodes} edges={graphData.edges} />
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] text-center">
                      {triples.length} relationship triples
                    </p>
                    <div className="space-y-1.5">
                      {triples.slice(0, 5).map((t) => (
                        <div
                          key={t.id}
                          className="text-[11px] text-[#6B7280] px-2 py-1.5 rounded-xl bg-[#FAFBFF] border border-[#E5E7EB]"
                        >
                          <span className="font-medium text-[#101827]">
                            {t.subject}
                          </span>
                          <span className="mx-1.5 text-[#9CA3AF]">→</span>
                          <span className="text-[#7A1F2B]">{t.predicate}</span>
                          <span className="mx-1.5 text-[#9CA3AF]">→</span>
                          <span className="font-medium text-[#101827]">
                            {t.object}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {activeTab === "summary" && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="p-4 space-y-3"
              >
                {!summary ? (
                  <div className="rounded-xl border border-dashed border-[#D0CFFE] bg-[#FAFAFF] p-5 text-center">
                    <div className="mx-auto w-9 h-9 rounded-full bg-[#F7E9EB] text-[#7A1F2B] flex items-center justify-center mb-2">
                      <FileClock className="w-4 h-4" />
                    </div>
                    <div className="text-[12px] font-semibold text-[#1A1A2E]">
                      No summary yet
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-1">
                      Auto-summarizes after assistant responses to recap key info.
                    </div>
                  </div>
                ) : (
                  <div
                    className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-[13px] text-[#374151] leading-relaxed"
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                  >
                    {summary}
                  </div>
                )}
                <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                  <Clock className="w-3 h-3" />
                  <span>Updates after assistant responses</span>
                </div>
              </motion.div>
            )}

            {activeTab === "tokens" && (
              <motion.div
                key="tokens"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="p-4 space-y-3"
              >
                {tokenInfo && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="rounded-lg border border-[#E5E7EB] bg-white p-2.5">
                      <div className="text-[10px] text-[#9CA3AF]">Used</div>
                      <div className="text-[13px] font-semibold text-[#1A1A2E]">
                        {tokenInfo.used_tokens.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#E5E7EB] bg-white p-2.5">
                      <div className="text-[10px] text-[#9CA3AF]">Budget</div>
                      <div className="text-[13px] font-semibold text-[#1A1A2E]">
                        {tokenInfo.total_budget.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#E5E7EB] bg-white p-2.5">
                      <div className="text-[10px] text-[#9CA3AF]">Free</div>
                      <div className="text-[13px] font-semibold text-[#10B981]">
                        {tokenInfo.available_for_generation.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
                <TokenBar tokenInfo={tokenInfo} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
