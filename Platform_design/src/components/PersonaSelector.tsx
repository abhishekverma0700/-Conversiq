import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import type { Persona } from "../types";
import { memoryConfig } from "../types";

export default function PersonaCard({
  persona,
  isActive,
  onSelect,
  onEdit,
  onDelete,
}: {
  persona: Persona;
  isActive: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const mcfg = memoryConfig[persona.memory_type] || memoryConfig.buffer;
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 10px 22px rgba(0,0,0,0.08)" }}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 relative ${
        isActive
          ? "border-[#7A1F2B] bg-[#F7E9EB] shadow-sm"
          : "border-[#E5E7EB] bg-white hover:border-[#D0CFFE]"
      }`}
      style={{
        boxShadow: isActive
          ? "0 0 0 2px rgba(108,99,255,0.15)"
          : "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <button onClick={onSelect} className="w-full text-left">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
            style={{
              background: "linear-gradient(135deg, #7A1F2B 0%, #C8A96A 100%)",
            }}
          >
            {persona.avatar}
          </div>
          <div>
            <div className="text-[14px] font-semibold text-[#1A1A2E]">
              {persona.name}
            </div>
            <div
              className="text-[10px] font-medium px-2 py-0.5 rounded-full mt-0.5 inline-block"
              style={{ color: mcfg.color, backgroundColor: mcfg.bg }}
            >
              {mcfg.label} Memory
            </div>
          </div>
          {isActive && (
            <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#7A1F2B] text-white">
              Active
            </span>
          )}
        </div>
        <p className="text-[12px] text-[#6B7280] leading-relaxed">
          {persona.description}
        </p>
        <div className="mt-3 inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#FBF7F6] px-2 py-1 text-[10px] font-medium text-[#6B7280]">
          {persona.domain}
        </div>
      </button>
      {!persona.is_builtin && (onEdit || onDelete) && (
        <div className="absolute top-3 right-3 flex items-center gap-1">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 rounded-full hover:bg-[#F7E9EB] transition-colors"
              title="Edit persona"
            >
              <Pencil className="w-3.5 h-3.5 text-[#7A1F2B]" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-full hover:bg-red-50 transition-colors"
              title="Delete persona"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#EF4444]" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

export function NavButton({
  icon: Icon,
  active,
  onClick,
  tooltip,
}: {
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  tooltip: string;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`p-2.5 rounded-lg transition-all duration-200 hover:scale-[1.02] flex items-center justify-center ${
        active
          ? "bg-[#F7E9EB] text-[#7A1F2B]"
          : "text-[#9CA3AF] hover:text-[#6B7280] hover:bg-[#FBF7F6]"
      }`}
    >
      <Icon className="w-4.5 h-4.5" />
    </button>
  );
}
