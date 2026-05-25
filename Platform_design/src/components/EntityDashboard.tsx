import React from "react";
import type { Entity } from "../types";
import { entityConfig } from "../types";
import { formatTime } from "./utils";

export default function EntityCard({
  entity,
  compact = false,
}: {
  entity: Entity;
  compact?: boolean;
}) {
  const cfg = entityConfig[entity.entity_type] || entityConfig.general;
  const Icon = cfg.icon;
  return (
    <div
      className={`bg-white border border-[#E5E7EB] rounded-xl p-3 hover:border-[#D0CFFE] transition-all duration-200 hover:-translate-y-0.5 ${
        compact ? "" : "mb-2"
      }`}
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: cfg.bg }}
        >
          <Icon className="w-4 h-4" style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-semibold text-[#1A1A2E] truncate">
              {entity.name}
            </span>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
              style={{ color: cfg.color, backgroundColor: `${cfg.color}15` }}
            >
              {cfg.label}
            </span>
          </div>
          <p className="text-[12px] text-[#6B7280] leading-relaxed line-clamp-2">
            {entity.description || "No description yet"}
          </p>
          {!compact && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[11px] text-[#9CA3AF]">
                {formatTime(entity.updated_at)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
