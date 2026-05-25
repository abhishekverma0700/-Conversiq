import React, { useEffect, useState } from "react";
import { Loader2, MessageCircleMore, Send, Database, Workflow, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import type { AuthRequestContext } from "../types";
import { api } from "../app/api";

export default function StatsScreen({ authContext }: { authContext?: AuthRequestContext }) {
  const [realStats, setRealStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getStats(authContext)
      .then((data) => setRealStats(data))
      .catch((err) => console.error("Stats fetch failed:", err))
      .finally(() => setLoading(false));
  }, [authContext]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#7A1F2B] animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Conversations",
      value: realStats?.total_conversations ?? 0,
      icon: MessageCircleMore,
      color: "#7A1F2B",
      delta: `~${realStats?.average_messages_per_conversation ?? 0} msgs avg`,
    },
    {
      label: "Messages",
      value: realStats?.total_messages ?? 0,
      icon: Send,
      color: "#C8A96A",
      delta: "Total sent",
    },
    {
      label: "Entities",
      value: realStats?.total_entities ?? 0,
      icon: Database,
      color: "#FF8A65",
      delta: "Tracked facts",
    },
    {
      label: "Tokens",
      value: realStats?.total_tokens_used ?? 0,
      icon: Workflow,
      color: "#F59E0B",
      delta: "Total usage",
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A2E]">Usage Overview</h2>
          <p className="text-[13px] text-[#6B7280] mt-1">
            Live platform metrics from your backend
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-xl p-4 border border-[#E5E7EB]"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: s.color + "18" }}
                >
                  <s.icon
                    className="w-4.5 h-4.5"
                    style={{ color: s.color }}
                  />
                </div>
                <TrendingUp className="w-3.5 h-3.5 text-[#C8A96A]" />
              </div>
              <div className="text-[22px] font-bold text-[#1A1A2E] mb-0.5">
                {s.value.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#6B7280]">{s.label}</div>
              <div className="text-[11px] text-[#C8A96A] mt-1">{s.delta}</div>
            </motion.div>
          ))}
        </div>

        {realStats?.total_tokens_used > 0 && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <h3 className="text-[14px] font-semibold text-[#1A1A2E] mb-2">
              Total Tokens Consumed
            </h3>
            <div className="text-[32px] font-bold text-[#7A1F2B]">
              {realStats.total_tokens_used.toLocaleString()}
            </div>
            <div className="text-[12px] text-[#9CA3AF]">
              across all conversations
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
