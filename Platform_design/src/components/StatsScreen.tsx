import React, { useEffect, useState } from "react";
import { Loader2, MessageCircleMore, Send, Database, Workflow, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import type { AuthRequestContext } from "../types";
import { api } from "../app/api";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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

        {realStats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              className="bg-white rounded-xl border border-[#E5E7EB] p-5"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
            >
              <h3 className="text-[14px] font-semibold text-[#1A1A2E] mb-4">
                Memory Type Distribution
              </h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Buffer", value: realStats.buffer_conversations ?? 0 },
                        { name: "Summary", value: realStats.summary_conversations ?? 0 },
                        { name: "Entity", value: realStats.entity_conversations ?? 0 },
                        { name: "KG", value: realStats.kg_conversations ?? 0 },
                        { name: "Sequential", value: realStats.sequential_conversations ?? 0 },
                      ].filter((d) => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {[
                        "#7A1F2B",
                        "#C8A96A",
                        "#00D4AA",
                        "#A78BFA",
                        "#FF8A65",
                      ].map((color, i) => (
                        <Cell key={i} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12 }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              className="bg-white rounded-xl border border-[#E5E7EB] p-5"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
            >
              <h3 className="text-[14px] font-semibold text-[#1A1A2E] mb-4">
                Memory Overview
              </h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Conversations", value: realStats.total_conversations ?? 0 },
                      { name: "Messages", value: realStats.total_messages ?? 0 },
                      { name: "Entities", value: realStats.total_entities ?? 0 },
                      { name: "KG Triples", value: realStats.total_kg_triples ?? 0 },
                      { name: "Summaries", value: realStats.total_summaries ?? 0 },
                    ]}
                    margin={{ left: -8, right: 4, top: 8, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12 }} />
                    <Bar dataKey="value" fill="#7A1F2B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

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
