import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "motion/react";
import type { Message } from "../types";

export default function MessageBubble({
  message,
  index,
}: {
  message: Message;
  index: number;
}) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: index * 0.02 }}
      className={`flex items-end gap-2.5 ${
        isUser ? "flex-row-reverse" : "flex-row"
      } slide-up-fade`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-[#7A1F2B] flex items-center justify-center shrink-0 mb-1 shadow-sm text-white text-[13px]">
          🐥
        </div>
      )}
      <div
        className={`max-w-[72%] ${
          isUser ? "items-end" : "items-start"
        } flex flex-col gap-1`}
      >
        <div
          className={`px-4 py-3 text-[15px] leading-[1.65] ${
            isUser
              ? "text-white rounded-[18px_18px_4px_18px]"
              : "bg-white text-[#1A1A2E] rounded-[12px_18px_18px_18px] border border-[#E5E7EB]"
          }`}
          style={
            isUser
              ? {
                  background:
                    "linear-gradient(135deg, #7A1F2B 0%, #C8A96A 100%)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }
              : { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }
          }
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>
        <span className="text-[11px] text-[#9CA3AF] px-1">
          {(message.timestamp instanceof Date && !isNaN(message.timestamp.getTime())
            ? message.timestamp
            : new Date()
          ).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {message.token_count ? ` · ${message.token_count}t` : ""}
        </span>
      </div>
    </motion.div>
  );
}

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-end gap-2.5 slide-up-fade"
    >
      <div className="w-8 h-8 rounded-full bg-[#7A1F2B] flex items-center justify-center shrink-0 shadow-sm text-white text-[13px]">
        🐥
      </div>
      <div
        className="px-4 py-3 bg-white rounded-[4px_18px_18px_18px] border border-[#E5E7EB] flex gap-1.5 items-center"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div key={i} className="typing-dot w-2 h-2 rounded-full bg-[#9CA3AF]" />
        ))}
      </div>
    </motion.div>
  );
}
