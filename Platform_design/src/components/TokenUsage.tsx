import React from "react";
import { AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import type { TokenInfo } from "../types";

export default function TokenBar({
  tokenInfo,
}: {
  tokenInfo: TokenInfo | null;
}) {
  if (!tokenInfo) {
    return (
      <div className="text-[12px] text-[#9CA3AF] text-center py-4">
        No token data available
      </div>
    );
  }

  const { used_tokens, total_budget, usage_percentage, is_near_limit, is_over_limit } = tokenInfo;

  const breakdown = [
    { label: "System prompt", value: tokenInfo.system_prompt_tokens, color: "#7A1F2B" },
    { label: "Memory context", value: tokenInfo.memory_tokens, color: "#C8A96A" },
    { label: "Recent messages", value: tokenInfo.recent_message_tokens, color: "#B76E4E" },
    { label: "Reserved (gen)", value: tokenInfo.generation_reserved, color: "#D6DCE3" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end mb-1">
        <span className="text-xs text-[#6B7280]">Context window</span>
        <div className="text-right">
          <span className={`text-sm font-bold ${is_over_limit ? "text-red-500" : is_near_limit ? "text-amber-500" : "text-[#1A1A2E]"}`}>
            {used_tokens.toLocaleString()}
          </span>
          <span className="text-xs text-[#9CA3AF]">
            {" "}/ {total_budget.toLocaleString()}
          </span>
        </div>
      </div>
      {is_near_limit && (
        <div className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Approaching context limit
        </div>
      )}
      <div className="h-3 bg-[#F3F4F6] rounded-full overflow-hidden flex">
        {breakdown.map((seg, i) => {
          const segPct = (seg.value / total_budget) * 100;
          return (
            <motion.div
              key={seg.label}
              initial={{ width: 0 }}
              animate={{ width: `${segPct}%` }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
              className="h-full"
              style={{ backgroundColor: seg.color }}
            />
          );
        })}
      </div>
      <div className="space-y-2.5 pt-1">
        {breakdown.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2.5">
            <div
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-[12px] text-[#6B7280] flex-1">
              {seg.label}
            </span>
            <span className="text-[12px] font-medium text-[#1A1A2E]">
              {seg.value.toLocaleString()}
            </span>
            <span className="text-[11px] text-[#9CA3AF] w-8 text-right">
              {Math.round((seg.value / total_budget) * 100)}%
            </span>
          </div>
        ))}
      </div>
      <div className="pt-2 border-t border-[#F3F4F6]">
        <div className="flex justify-between items-center">
          <span className="text-[12px] text-[#6B7280]">Utilization</span>
          <span
            className={`text-[12px] font-semibold ${
              is_over_limit
                ? "text-red-500"
                : is_near_limit
                ? "text-amber-500"
                : "text-[#10B981]"
            }`}
          >
            {usage_percentage.toFixed(1)}%
          </span>
        </div>
        <div className="text-[11px] text-[#9CA3AF] mt-0.5">
          {tokenInfo.available_for_generation.toLocaleString()} tokens available
          for generation
        </div>
      </div>
    </div>
  );
}
