import React, { useState } from "react";
import { Pin, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import type { Conversation } from "../types";
import { memoryConfig } from "../types";
import { formatTime } from "./utils";

export default function ConversationItem({
  conversation,
  isSelected,
  onClick,
  onPin,
  onDelete,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cfg = memoryConfig[conversation.memory_type] || memoryConfig.buffer;

  return (
    <motion.button
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      className={`w-full text-left px-3 py-3 rounded-2xl transition-all duration-200 relative group border ${
        isSelected
          ? "bg-[#F7E9EB] border-[#E2C6CA] shadow-[0_1px_8px_rgba(122,31,43,0.08)]"
          : hovered
          ? "bg-[#FBFBFF] border-[#EDF0F7] shadow-[0_1px_6px_rgba(15,23,42,0.04)]"
          : "bg-white border-transparent"
      }`}
    >
      <div className="flex items-start gap-3 pr-10">
        <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: cfg.dot }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span
              className={`text-[13px] font-semibold truncate leading-5 ${
                isSelected ? "text-[#7A1F2B]" : "text-[#24161A]"
              }`}
            >
              {conversation.is_pinned ? "📌 " : ""}
              {conversation.title}
            </span>
            <span className="text-[10px] text-[#9CA3AF] shrink-0">
              {formatTime(conversation.updated_at)}
            </span>
          </div>
          <p className="text-[11px] text-[#6B7280] truncate mt-1 leading-relaxed">
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full mr-1"
              style={{
                color: cfg.color,
                backgroundColor: `${cfg.color}18`,
              }}
            >
              {cfg.label}
            </span>
            {conversation.message_count} messages
          </p>
        </div>
      </div>
      {hovered && (
        <div className="absolute right-2 top-2.5 flex gap-1">
          <div
            role="button"
            className="p-1.5 hover:bg-[#F7E9EB] rounded-full transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            title={conversation.is_pinned ? "Unpin" : "Pin"}
          >
            <Pin className="w-3 h-3 text-[#6B7280]" />
          </div>
          <div
            role="button"
            className="p-1.5 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete"
          >
            <Trash2 className="w-3 h-3 text-[#EF4444]" />
          </div>
        </div>
      )}
    </motion.button>
  );
}
