import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRightLeft, Loader2, Search, Sparkles, Users } from "lucide-react";
import { motion } from "motion/react";
import type { AuthRequestContext, Conversation, Entity, Persona, TokenInfo } from "../types";
import { api } from "../app/api";

type ComparisonSnapshot = {
  conversation: Conversation;
  persona: Persona | null;
  entities: Entity[];
  tokenInfo: TokenInfo | null;
  summary: string | null;
  apiComparison: Record<string, { response: string; tokens_used: number }> | null;
};

const DEFAULT_TEST_MESSAGE = "What do you remember about me?";

function normalizeEntityKey(entity: Entity) {
  return `${entity.name || ""}`.trim().toLowerCase();
}

function formatMemoryLine(memoryType?: string) {
  if (!memoryType) return "Unknown";
  return memoryType.charAt(0).toUpperCase() + memoryType.slice(1);
}

function entityLabel(entity: Entity) {
  return `${entity.name} (${entity.entity_type})`;
}

export default function MemoryComparisonScreenView({
  conversations,
  personas,
  authContext,
}: {
  conversations: Conversation[];
  personas: Persona[];
  authContext?: AuthRequestContext;
}) {
  const [leftConversationId, setLeftConversationId] = useState<number | "">("");
  const [rightConversationId, setRightConversationId] = useState<number | "">("");
  const [testMessage, setTestMessage] = useState(DEFAULT_TEST_MESSAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftSnapshot, setLeftSnapshot] = useState<ComparisonSnapshot | null>(null);
  const [rightSnapshot, setRightSnapshot] = useState<ComparisonSnapshot | null>(null);

  useEffect(() => {
    if (!conversations.length) {
      setLeftConversationId("");
      setRightConversationId("");
      setLeftSnapshot(null);
      setRightSnapshot(null);
      return;
    }

    setLeftConversationId((current) => {
      if (current && conversations.some((conv) => conv.id === current)) return current;
      return conversations[0].id;
    });

    setRightConversationId((current) => {
      const validCurrent = current && conversations.some((conv) => conv.id === current);
      if (validCurrent) return current;
      return conversations[1]?.id ?? conversations[0].id;
    });
  }, [conversations]);

  const leftConversation = useMemo(
    () => conversations.find((conv) => conv.id === leftConversationId) || null,
    [conversations, leftConversationId]
  );
  const rightConversation = useMemo(
    () => conversations.find((conv) => conv.id === rightConversationId) || null,
    [conversations, rightConversationId]
  );

  const personaById = useMemo(() => {
    const map = new Map<string, Persona>();
    personas.forEach((persona) => map.set(persona.id, persona));
    return map;
  }, [personas]);

  const fetchSnapshot = useCallback(
    async (conversation: Conversation, referenceMemoryType: string): Promise<ComparisonSnapshot> => {
      const [conversationRes, entitiesRes, tokenInfoRes, summaryRes] = await Promise.all([
        api.getConversation(conversation.id, authContext),
        api.getEntities(conversation.id, authContext),
        api.getTokenInfo(conversation.id, authContext),
        api.getSummary(conversation.id, authContext),
      ]);

      const comparison = await api.compareMemory(
        conversation.id,
        testMessage.trim() || DEFAULT_TEST_MESSAGE,
        conversation.memory_type,
        referenceMemoryType,
        authContext
      );

      return {
        conversation: {
          ...conversation,
          title: conversationRes.title || conversation.title,
          memory_type: conversationRes.memory_type || conversation.memory_type,
          persona_id: conversationRes.persona_id || conversation.persona_id,
          is_pinned: conversationRes.is_pinned ?? conversation.is_pinned,
          is_archived: conversationRes.is_archived ?? conversation.is_archived,
          message_count: conversationRes.message_count ?? conversation.message_count,
          updated_at: conversationRes.updated_at || conversation.updated_at,
          created_at: conversationRes.created_at || conversation.created_at,
        },
        persona: personaById.get(conversation.persona_id) || null,
        entities: entitiesRes.entities || [],
        tokenInfo: tokenInfoRes || null,
        summary: summaryRes?.summary_text || summaryRes?.summary || null,
        apiComparison: comparison?.comparison || null,
      };
    },
    [authContext, personaById, testMessage]
  );

  const handleCompare = useCallback(async () => {
    if (!leftConversation || !rightConversation) {
      setError("Select two conversations to compare.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [left, right] = await Promise.all([
        fetchSnapshot(leftConversation, rightConversation.memory_type),
        fetchSnapshot(rightConversation, leftConversation.memory_type),
      ]);
      setLeftSnapshot(left);
      setRightSnapshot(right);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  }, [fetchSnapshot, leftConversation, rightConversation]);

  useEffect(() => {
    if (leftConversation && rightConversation) {
      void handleCompare();
    }
  }, [leftConversationId, rightConversationId, handleCompare]);

  const comparisonSummary = useMemo(() => {
    const leftEntities = leftSnapshot?.entities || [];
    const rightEntities = rightSnapshot?.entities || [];
    const leftMap = new Map(leftEntities.map((entity) => [normalizeEntityKey(entity), entity]));
    const rightMap = new Map(rightEntities.map((entity) => [normalizeEntityKey(entity), entity]));

    const shared = [...leftMap.keys()].filter((key) => rightMap.has(key));
    const leftOnly = [...leftMap.keys()].filter((key) => !rightMap.has(key));
    const rightOnly = [...rightMap.keys()].filter((key) => !leftMap.has(key));

    return {
      shared: shared.map((key) => leftMap.get(key)!).filter(Boolean),
      leftOnly: leftOnly.map((key) => leftMap.get(key)!).filter(Boolean),
      rightOnly: rightOnly.map((key) => rightMap.get(key)!).filter(Boolean),
    };
  }, [leftSnapshot, rightSnapshot]);

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#FBF7F6]">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[19px] font-bold text-[#1A1A2E] flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-[#7A1F2B]" />
              Memory Comparison
            </h2>
            <p className="text-[13px] text-[#6B7280] mt-0.5 max-w-2xl">
              Compare two conversations side by side using the existing memory APIs. Entity overlap, token usage, and backend memory-mode previews are computed from live data.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF] bg-white border border-[#E5E7EB] rounded-full px-3 py-2 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#7A1F2B]" />
           
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-[0_6px_18px_rgba(0,0,0,0.04)]">
          <div className="grid gap-3 lg:grid-cols-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#8A94A6] mb-2">
                Left conversation
              </label>
              <select
                value={leftConversationId}
                onChange={(e) => setLeftConversationId(Number(e.target.value))}
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#FBFBFD] px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#7A1F2B]/20"
              >
                {conversations.map((conversation) => (
                  <option key={conversation.id} value={conversation.id}>
                    {conversation.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#8A94A6] mb-2">
                Right conversation
              </label>
              <select
                value={rightConversationId}
                onChange={(e) => setRightConversationId(Number(e.target.value))}
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#FBFBFD] px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#7A1F2B]/20"
              >
                {conversations.map((conversation) => (
                  <option key={conversation.id} value={conversation.id}>
                    {conversation.title}
                  </option>
                ))}
              </select>
            </div>

          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCompare}
              disabled={!leftConversation || !rightConversation || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#7A1F2B] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
              Compare now
            </button>
            <div className="text-[11px] text-[#9CA3AF]">
              Select two conversations, then compare entities, memory stats, and backend memory-mode responses.
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-[#F4C7C3] bg-[#FFF6F5] px-4 py-3 text-[13px] text-[#B42318]">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {!leftConversation || !rightConversation ? (
          <div className="rounded-2xl border border-dashed border-[#D6D3D1] bg-white p-8 text-center text-[#9CA3AF]">
            Select two conversations to begin the comparison.
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#7A1F2B]" />
          </div>
        ) : leftSnapshot && rightSnapshot ? (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              {[leftSnapshot, rightSnapshot].map((snapshot, index) => {
                const label = index === 0 ? "Left" : "Right";
                const other = index === 0 ? rightSnapshot : leftSnapshot;
                const apiEntry = snapshot.apiComparison?.[snapshot.conversation.memory_type];
                return (
                  <motion.div
                    key={snapshot.conversation.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-[0_6px_18px_rgba(0,0,0,0.04)]"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                          {label} side
                        </div>
                        <div className="text-[17px] font-bold text-[#1A1A2E] mt-1">
                          {snapshot.conversation.title}
                        </div>
                        <div className="text-[12px] text-[#6B7280] mt-1">
                          Persona: {snapshot.persona?.name || snapshot.conversation.persona_id}
                        </div>
                      </div>
                      <div className="rounded-full px-3 py-1.5 text-[11px] font-semibold"
                        style={{ backgroundColor: snapshot.conversation.is_archived ? "#FFF7ED" : "#F7E9EB", color: snapshot.conversation.is_archived ? "#C2410C" : "#7A1F2B" }}>
                        {formatMemoryLine(snapshot.conversation.memory_type)}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="rounded-xl border border-[#E5E7EB] bg-[#FBFBFD] p-3">
                        <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">Messages</div>
                        <div className="text-[16px] font-semibold text-[#1A1A2E] mt-1">{snapshot.conversation.message_count}</div>
                      </div>
                      <div className="rounded-xl border border-[#E5E7EB] bg-[#FBFBFD] p-3">
                        <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">Entities</div>
                        <div className="text-[16px] font-semibold text-[#1A1A2E] mt-1">{snapshot.entities.length}</div>
                      </div>
                      <div className="rounded-xl border border-[#E5E7EB] bg-[#FBFBFD] p-3">
                        <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">Tokens</div>
                        <div className="text-[16px] font-semibold text-[#1A1A2E] mt-1">{snapshot.tokenInfo?.used_tokens?.toLocaleString() ?? 0}</div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8A94A6] mb-2">
                        Summary
                      </div>
                      <div className="rounded-xl border border-[#E5E7EB] bg-[#FBFBFD] p-3 text-[13px] leading-relaxed text-[#374151] min-h-[88px]">
                        {snapshot.summary || "No summary yet"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8A94A6] mb-2">
                        Backend memory comparison preview
                      </div>
                      {apiEntry ? (
                        <div className="rounded-xl border border-[#E5E7EB] bg-[#0F172A] p-4 text-white">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="text-[12px] font-semibold">
                              {snapshot.conversation.memory_type} vs {index === 0 ? rightConversation.memory_type : leftConversation.memory_type}
                            </div>
                            <div className="text-[11px] text-[#CBD5E1]">
                              {apiEntry.tokens_used.toLocaleString()} tokens
                            </div>
                          </div>
                          <div className="text-[13px] leading-relaxed text-[#E2E8F0] whitespace-pre-wrap">
                            {apiEntry.response}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-[#D6D3D1] bg-[#FBFBFD] p-4 text-[13px] text-[#9CA3AF]">
                          No backend preview available.
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-[0_6px_18px_rgba(0,0,0,0.04)]">
                <div className="text-[12px] font-semibold text-[#1A1A2E] mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#7A1F2B]" />
                  Overlap
                </div>
                {comparisonSummary.shared.length === 0 ? (
                  <div className="text-[13px] text-[#9CA3AF]">No shared entities.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {comparisonSummary.shared.map((entity) => (
                      <span key={`${entity.id}-shared`} className="rounded-full bg-[#F7E9EB] px-3 py-1.5 text-[11px] font-medium text-[#7A1F2B]">
                        {entityLabel(entity)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-[0_6px_18px_rgba(0,0,0,0.04)]">
                <div className="text-[12px] font-semibold text-[#1A1A2E] mb-3">Left-only entities</div>
                {comparisonSummary.leftOnly.length === 0 ? (
                  <div className="text-[13px] text-[#9CA3AF]">None.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {comparisonSummary.leftOnly.map((entity) => (
                      <span key={`${entity.id}-left`} className="rounded-full bg-[#FFF7ED] px-3 py-1.5 text-[11px] font-medium text-[#B45309]">
                        {entityLabel(entity)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-[0_6px_18px_rgba(0,0,0,0.04)]">
                <div className="text-[12px] font-semibold text-[#1A1A2E] mb-3">Right-only entities</div>
                {comparisonSummary.rightOnly.length === 0 ? (
                  <div className="text-[13px] text-[#9CA3AF]">None.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {comparisonSummary.rightOnly.map((entity) => (
                      <span key={`${entity.id}-right`} className="rounded-full bg-[#EEF2FF] px-3 py-1.5 text-[11px] font-medium text-[#4338CA]">
                        {entityLabel(entity)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {[
                {
                  title: "Left entity roster",
                  entities: leftSnapshot.entities,
                },
                {
                  title: "Right entity roster",
                  entities: rightSnapshot.entities,
                },
              ].map((panel) => (
                <div key={panel.title} className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-[0_6px_18px_rgba(0,0,0,0.04)]">
                  <div className="text-[12px] font-semibold text-[#1A1A2E] mb-3">{panel.title}</div>
                  {panel.entities.length === 0 ? (
                    <div className="text-[13px] text-[#9CA3AF]">No entities yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {panel.entities.map((entity) => (
                        <div key={`${panel.title}-${entity.id}`} className="rounded-xl border border-[#E5E7EB] bg-[#FBFBFD] px-3 py-2.5">
                          <div className="text-[13px] font-medium text-[#1A1A2E]">{entity.name}</div>
                          <div className="text-[11px] text-[#9CA3AF] mt-0.5">{entity.entity_type}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}