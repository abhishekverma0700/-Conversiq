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
  const normalizeTypeLocal = (t?: string) => {
    if (!t) return "general";
    const s = t.toLowerCase();
    if (s === "organization" || s === "company" || s === "orgs") return "org";
    if (s === "people" || s === "individual" || s === "person") return "person";
    if (s === "project" || s === "projects") return "project";
    if (s === "date" || s === "dates") return "date";
    if (s === "concept" || s === "concepts") return "concept";
    if (s === "org") return "org";
    if (s === "general") return "general";
    return s;
  };

  const normalizedType = normalizeTypeLocal(entity.entity_type);
  const cfg = entityConfig[normalizedType] || entityConfig.general;
  const Icon = cfg.icon;
  return (
    <div
      className={`bg-white border border-[#E5E7EB] rounded-xl p-3 transition-all duration-200 transform hover:-translate-y-0.5 ${
        compact ? "" : "mb-2"
      }`}
      style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.04)" }}
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
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1"
              style={{ color: cfg.color, backgroundColor: `${cfg.color}15` }}
            >
              {cfg.label}
            </span>
          </div>
          <p className="text-[12px] text-[#6B7280] leading-relaxed line-clamp-2">
            {entity.description || "No description yet"}
          </p>

          {!compact && (
            <div className="flex items-center justify-between gap-3 mt-2">
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#9CA3AF]">
                  Updated {formatTime(entity.updated_at)}
                </span>
                <span className="text-[11px] text-[#9CA3AF]">•</span>
                <span className="text-[11px] text-[#9CA3AF]">Type: {cfg.label}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
