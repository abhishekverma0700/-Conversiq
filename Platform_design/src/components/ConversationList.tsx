import React, { useEffect, useState } from "react";
import { Archive, MoreVertical, Pencil, Pin, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import type { Conversation } from "../types";
import { memoryConfig } from "../types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export default function ConversationItem({
  conversation,
  isSelected,
  onClick,
  onPin,
  onArchive,
  onRename,
  onDelete,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  onPin: () => void;
  onArchive: () => void;
  onRename: (newTitle: string) => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const cfg = memoryConfig[conversation.memory_type] || memoryConfig.buffer;
  const displayTitle = conversation.title?.trim() || "New Chat";

  useEffect(() => {
    if (!isEditing) {
      setEditTitle(conversation.title);
    }
  }, [conversation.title, isEditing]);

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
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
            {isEditing ? (
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => {
                  if (editTitle.trim() && editTitle !== conversation.title) {
                    onRename(editTitle.trim());
                  }
                  setIsEditing(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (editTitle.trim() && editTitle !== conversation.title) {
                      onRename(editTitle.trim());
                    }
                    setIsEditing(false);
                  }
                  if (e.key === "Escape") {
                    setIsEditing(false);
                    setEditTitle(conversation.title);
                  }
                  e.stopPropagation();
                }}
                onClick={(e) => e.stopPropagation()}
                className="text-[13px] font-semibold w-full bg-white border border-[#7A1F2B]/30 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#7A1F2B]/30"
              />
            ) : (
              <span
                className={`text-[13px] font-semibold truncate leading-5 ${
                  isSelected ? "text-[#7A1F2B]" : "text-[#24161A]"
                }`}
              >
                {conversation.is_pinned ? "📌 " : ""}
                {displayTitle}
              </span>
            )}
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
      <div className="absolute right-2 top-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Conversation actions"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-[#F8F9FF] hover:text-[#24161A]"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-40 rounded-2xl border border-[#E5E7EB] bg-white p-1.5 shadow-xl">
            <DropdownMenuItem
              className="cursor-pointer rounded-xl px-3 py-2 text-[13px] font-medium text-[#24161A] transition-colors hover:bg-[#F0EFFF] hover:text-[#7A1F2B]"
              onSelect={() => {
                setIsEditing(true);
                setEditTitle(conversation.title);
              }}
            >
              <Pencil className="h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer rounded-xl px-3 py-2 text-[13px] font-medium text-[#24161A] transition-colors hover:bg-[#F7E9EB] hover:text-[#7A1F2B]"
              onSelect={() => {
                onPin();
              }}
            >
              <Pin className="h-4 w-4" />
              {conversation.is_pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer rounded-xl px-3 py-2 text-[13px] font-medium text-[#24161A] transition-colors hover:bg-[#FFF3E8] hover:text-[#F59E0B]"
              onSelect={() => {
                onArchive();
              }}
            >
              <Archive className="h-4 w-4" />
              {conversation.is_archived ? "Unarchive" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer rounded-xl px-3 py-2 text-[13px] font-medium text-[#EF4444] transition-colors hover:bg-red-50 hover:text-[#DC2626]"
              onSelect={() => {
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4 text-[#EF4444]" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
