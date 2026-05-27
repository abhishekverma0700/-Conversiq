import React, { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { motion } from "motion/react";
import type { AuthRequestContext, MemoryMode, Persona } from "../types";
import { api } from "../app/api";

export default function CreatePersonaCard({
  authContext,
  onCreated,
}: {
  authContext?: AuthRequestContext;
  onCreated: (persona: Persona) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    system_prompt: "",
    memory_type: "buffer" as MemoryMode,
    domain: "general",
    avatar: "🎭",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.system_prompt) return;
    setLoading(true);
    try {
      const persona = await api.createPersona(form, authContext);
      onCreated(persona);
      setOpen(false);
      setForm({
        name: "",
        description: "",
        system_prompt: "",
        memory_type: "buffer",
        domain: "general",
        avatar: "🎭",
      });
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <motion.button
        whileHover={{ y: -4, boxShadow: "0 10px 22px rgba(0,0,0,0.06)" }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(true)}
        className="w-full min-h-[172px] rounded-xl border-2 border-dashed border-[#D8B7BC] bg-white text-[#7A1F2B] flex flex-col items-center justify-center gap-2"
      >
        <div className="w-10 h-10 rounded-full bg-[#F7E9EB] flex items-center justify-center">
          <Plus className="w-5 h-5" />
        </div>
        <div className="text-[13px] font-semibold">Create Custom</div>
        <div className="text-[11px] text-[#9CA3AF]">
          Build a persona for your workflow
        </div>
      </motion.button>
    );
  }

  return (
    <div className="rounded-xl border-2 border-[#7A1F2B] bg-white p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[13px] font-semibold text-[#1A1A2E]">
          New Persona
        </span>
        <button
          onClick={() => setOpen(false)}
          className="p-1 hover:bg-[#F3F4F6] rounded"
        >
          <X className="w-4 h-4 text-[#9CA3AF]" />
        </button>
      </div>
      <input
        className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#7A1F2B]/20"
        placeholder="Name *"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
      />
      <input
        className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#7A1F2B]/20"
        placeholder="Description"
        value={form.description}
        onChange={(e) =>
          setForm((f) => ({ ...f, description: e.target.value }))
        }
      />
      <textarea
        className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#7A1F2B]/20 resize-none"
        placeholder="System prompt *"
        rows={3}
        value={form.system_prompt}
        onChange={(e) =>
          setForm((f) => ({ ...f, system_prompt: e.target.value }))
        }
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          className="border border-[#E5E7EB] rounded-xl px-3 py-2 text-[12px] focus:outline-none"
          value={form.memory_type}
          onChange={(e) =>
            setForm((f) => ({ ...f, memory_type: e.target.value as MemoryMode }))
          }
        >
          <option value="buffer">Buffer</option>
          <option value="summary">Summary</option>
          <option value="entity">Entity</option>
          <option value="kg">Knowledge Graph</option>
          <option value="hybrid">Hybrid (Summary + Entity)</option>
          <option value="sequential">Sequential</option>
        </select>
        <input
          className="border border-[#E5E7EB] rounded-xl px-3 py-2 text-[13px] focus:outline-none"
          placeholder="Avatar emoji"
          value={form.avatar}
          onChange={(e) => setForm((f) => ({ ...f, avatar: e.target.value }))}
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading || !form.name || !form.system_prompt}
        className="w-full py-2.5 rounded-xl text-white text-[13px] font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        style={{
          background: "linear-gradient(135deg, #7A1F2B 0%, #C8A96A 100%)",
        }}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
        Create Persona
      </button>
    </div>
  );
}
