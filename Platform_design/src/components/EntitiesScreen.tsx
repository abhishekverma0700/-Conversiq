import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Database, Loader2, Search } from "lucide-react";
import { motion } from "motion/react";
import type { AuthRequestContext, Entity } from "../types";
import { entityConfig } from "../types";
import { api } from "../app/api";
import EntityCard from "./EntityDashboard";

export default function EntitiesScreen({
  conversationId,
  authContext,
}: {
  conversationId: number | null;
  authContext?: AuthRequestContext;
}) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const normalizeType = (t?: string) => {
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

  const loadEntities = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const data = await api.getEntities(conversationId, authContext);
      setEntities(data.entities || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [conversationId, authContext]);

  const handleSearchGlobal = useCallback(async () => {
    if (!searchQuery.trim()) {
      loadEntities();
      return;
    }
    setLoading(true);
    try {
      const data = await api.searchEntities(searchQuery, authContext);
      setEntities(data.results || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [searchQuery, loadEntities, authContext]);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center text-[#9CA3AF]">
        Select a conversation to view its entities.
      </div>
    );
  }

  const counts = useMemo(() => {
    return entities.reduce((acc: Record<string, number>, e) => {
      const t = normalizeType(e.entity_type);
      acc[t] = (acc[t] || 0) + 1;
      acc.total = (acc.total || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [entities]);

  const filtered = entities
    .filter((e) => {
      const t = normalizeType(e.entity_type);
      if (activeCategory && activeCategory !== "all") {
        if (t !== activeCategory) return false;
      }
      return (
        !searchQuery ||
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-[19px] font-bold text-[#1A1A2E]">
              Entity Memory
            </h2>
            <p className="text-[13px] text-[#6B7280] mt-0.5">
              {entities.length} entities tracked
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchGlobal()}
                placeholder="Search entities..."
                className="pl-9 pr-4 py-2 bg-white border border-[#E5E7EB] rounded-full text-[13px] focus:outline-none focus:ring-2 focus:ring-[#7A1F2B]/20 w-48"
              />
            </div>
            <button
              onClick={handleSearchGlobal}
              className="px-3 py-2 rounded-full bg-[#7A1F2B] text-white text-[12px] font-medium"
            >
              Search All
            </button>
          </div>
        </div>

        <div className="sticky top-6 z-20 bg-white py-2">
          <div className="flex flex-wrap gap-2">
            <button
              key="all"
              onClick={() => setActiveCategory("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors ${
                activeCategory === "all"
                  ? "bg-[#7A1F2B] text-white border-[#7A1F2B]"
                  : "bg-white border border-[#E5E7EB] hover:border-[#D0CFFE]"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              All ({counts.total || 0})
            </button>

            {Object.entries(entityConfig)
              .filter(([type]) => type !== "general")
              .map(([type, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={type}
                  onClick={() => setActiveCategory(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors ${
                    activeCategory === type
                      ? "bg-[#7A1F2B] text-white border-[#7A1F2B]"
                      : "bg-white border border-[#E5E7EB] hover:border-[#D0CFFE]"
                  }`}
                  style={
                    activeCategory === type
                      ? { backgroundColor: "#7A1F2B", color: "white" }
                      : { color: cfg.color }
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cfg.label} ({counts[type] || 0})
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#7A1F2B] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[#9CA3AF]">
            <Database className="w-10 h-10 mx-auto opacity-30 mb-3" />
            <div className="text-[14px]">No entities found</div>
            <div className="text-[12px]">
              No {activeCategory === "all" ? "entities" : `${activeCategory} entities`} found. Try another filter or search.
            </div>
          </div>
        ) : (
          <motion.div key={activeCategory} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((entity, i) => (
              <motion.div
                key={entity.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <EntityCard entity={entity} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
