import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ForceGraph2D from 'react-force-graph-2d'
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import {
  Send,
  Search,
  Plus,
  SlidersHorizontal,
  Pin,
  Trash2,
  Database,
  Brain,
  Workflow,
  FileClock,
  Activity,
  UserRound,
  UserPlus,
  LogIn,
  Building,
  FolderKanban,
  CalendarDays,
  Atom,
  TrendingUp,
  Clock,
  MessageCircleMore,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  PanelRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  RefreshCw,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ─── API Configuration ───────────────────────────────────────────────────────
const API_BASE = "https://conversiq-2.onrender.com/api";

type AuthRequestContext = {
  accessToken?: string | null;
  userId?: string | null;
};

function buildAuthHeaders(auth?: AuthRequestContext): HeadersInit {
  const headers: Record<string, string> = {};

  if (auth?.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }

  if (auth?.userId) {
    headers["X-User-Id"] = auth.userId;
  }

  return headers;
}

// ─── API Client ──────────────────────────────────────────────────────────────
const api = {
  // Conversations
  listConversations: async (
    search = "",
    archived = false,
    auth?: AuthRequestContext
  ) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (archived) params.set("archived", "true");
    const res = await fetch(`${API_BASE}/conversations?${params}`, {
      headers: buildAuthHeaders(auth),
    });
    if (!res.ok) throw new Error("Failed to fetch conversations");
    return res.json();
  },

  createConversation: async (data: {
    title?: string;
    persona_id?: string;
    memory_type?: string;
    user_id?: string;
  }, auth?: AuthRequestContext) => {
    const res = await fetch(`${API_BASE}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...buildAuthHeaders(auth) },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create conversation");
    return res.json();
  },

  getConversation: async (id: number, auth?: AuthRequestContext) => {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      headers: buildAuthHeaders(auth),
    });
    if (!res.ok) throw new Error("Failed to fetch conversation");
    return res.json();
  },

  updateConversation: async (
    id: number,
    data: object,
    auth?: AuthRequestContext
  ) => {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...buildAuthHeaders(auth) },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update conversation");
    return res.json();
  },

  deleteConversation: async (id: number, auth?: AuthRequestContext) => {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      method: "DELETE",
      headers: buildAuthHeaders(auth),
    });
    if (!res.ok) throw new Error("Failed to delete conversation");
    return res.json();
  },

  sendMessage: async (
    convId: number,
    message: string,
    auth?: AuthRequestContext
  ) => {
    const res = await fetch(`${API_BASE}/conversations/${convId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...buildAuthHeaders(auth) },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error("Failed to send message");
    return res.json();
  },

  getEntities: async (convId: number, auth?: AuthRequestContext) => {
    const res = await fetch(`${API_BASE}/conversations/${convId}/entities`, {
      headers: buildAuthHeaders(auth),
    });
    if (!res.ok) throw new Error("Failed to fetch entities");
    return res.json();
  },

  getGraph: async (convId: number, auth?: AuthRequestContext) => {
    const res = await fetch(`${API_BASE}/conversations/${convId}/graph`, {
      headers: buildAuthHeaders(auth),
    });
    if (!res.ok) throw new Error("Failed to fetch graph");
    return res.json();
  },

  getSummary: async (convId: number, auth?: AuthRequestContext) => {
    const res = await fetch(`${API_BASE}/conversations/${convId}/summary`, {
      headers: buildAuthHeaders(auth),
    });
    if (!res.ok) throw new Error("Failed to fetch summary");
    return res.json();
  },

  getTokenInfo: async (convId: number, auth?: AuthRequestContext) => {
    const res = await fetch(`${API_BASE}/conversations/${convId}/tokens`, {
      headers: buildAuthHeaders(auth),
    });
    if (!res.ok) throw new Error("Failed to fetch token info");
    return res.json();
  },

  // Personas
  listPersonas: async () => {
    const res = await fetch(`${API_BASE}/personas`);
    if (!res.ok) throw new Error("Failed to fetch personas");
    return res.json();
  },

  createPersona: async (data: object) => {
    const res = await fetch(`${API_BASE}/personas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create persona");
    return res.json();
  },

  deletePersona: async (id: string) => {
    const res = await fetch(`${API_BASE}/personas/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete persona");
    return res.json();
  },

  // Memory
  getStats: async (auth?: AuthRequestContext) => {
    const res = await fetch(`${API_BASE}/stats`, {
      headers: buildAuthHeaders(auth),
    });
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  },

  searchEntities: async (query: string, auth?: AuthRequestContext) => {
    const res = await fetch(
      `${API_BASE}/entities/search?q=${encodeURIComponent(query)}`,
      { headers: buildAuthHeaders(auth) }
    );
    if (!res.ok) throw new Error("Failed to search entities");
    return res.json();
  },

  compareMemory: async (
    convId: number,
    testMessage: string,
    typeA: string,
    typeB: string,
    auth?: AuthRequestContext
  ) => {
    const res = await fetch(`${API_BASE}/compare/memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...buildAuthHeaders(auth) },
      body: JSON.stringify({
        conversation_id: convId,
        test_message: testMessage,
        memory_type_a: typeA,
        memory_type_b: typeB,
      }),
    });
    if (!res.ok) throw new Error("Failed to compare memory");
    return res.json();
  },

  // Export / Import
  exportConversation: async (
    convId: number,
    format: string,
    auth?: AuthRequestContext
  ) => {
    const res = await fetch(`${API_BASE}/conversations/${convId}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...buildAuthHeaders(auth) },
      body: JSON.stringify({ format }),
    });
    if (!res.ok) throw new Error("Failed to export");
    return res.json();
  },

  importConversation: async (data: object, auth?: AuthRequestContext) => {
    const res = await fetch(`${API_BASE}/conversations/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...buildAuthHeaders(auth) },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to import");
    return res.json();
  },

  health: async () => {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },
};

// ─── Types ─────────────────────────────────────────────────────────────────
type MemoryMode = "buffer" | "summary" | "entity" | "kg" | "sequential";
type EntityType = "person" | "org" | "project" | "date" | "concept" | "general";
type MessageRole = "user" | "assistant";
type Screen =
  | "chat"
  | "graph"
  | "entities"
  | "personas"
  | "stats"
  | "login"
  | "register";
type AuthView = "login" | "register";
type MemoryTab = "entities" | "graph" | "summary" | "tokens";

interface AuthFormValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  token_count?: number;
}

interface Conversation {
  id: number;
  title: string;
  memory_type: MemoryMode;
  persona_id: string;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface Entity {
  id: number;
  name: string;
  entity_type: EntityType;
  description: string;
  conversation_id: number;
  created_at: string;
  updated_at: string;
}

interface KGTriple {
  id: number;
  subject: string;
  predicate: string;
  object: string;
  conversation_id: number;
  created_at: string;
}

interface GraphNode {
  id: string;
  label: string;
  type: EntityType;
  x: number;
  y: number;
}

interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

interface Persona {
  id: string;
  name: string;
  description: string;
  domain: string;
  memory_type: MemoryMode;
  avatar: string;
  is_builtin: boolean;
  system_prompt?: string;
  temperature?: number;
}

const DEFAULT_GENERAL_ASSISTANT_PERSONA: Persona = {
  id: "general_assistant",
  name: "General Assistant",
  description: "Helpful all-purpose assistant for everyday tasks",
  domain: "general",
  memory_type: "buffer",
  avatar: "🤖",
  is_builtin: true,
  system_prompt: "You are a helpful, friendly AI assistant. Remember everything the user tells you and use it to provide personalized, contextual responses.",
  temperature: 0.7,
};

interface TokenInfo {
  system_prompt_tokens: number;
  memory_tokens: number;
  recent_message_tokens: number;
  used_tokens: number;
  total_budget: number;
  generation_reserved: number;
  available_for_generation: number;
  usage_percentage: number;
  is_near_limit: boolean;
  is_over_limit: boolean;
}

// ─── Config ─────────────────────────────────────────────────────────────────
const memoryConfig: Record<
  string,
  { color: string; bg: string; label: string; dot: string }
> = {
  buffer: { color: "#6C63FF", bg: "#F0EFFF", label: "Buffer", dot: "#6C63FF" },
  summary: {
    color: "#F59E0B",
    bg: "#FFFBEB",
    label: "Summary",
    dot: "#F59E0B",
  },
  entity: { color: "#10B981", bg: "#ECFDF5", label: "Entity", dot: "#10B981" },
  kg: { color: "#8B5CF6", bg: "#F5F3FF", label: "KG", dot: "#8B5CF6" },
  sequential: {
    color: "#EC4899",
    bg: "#FDF2F8",
    label: "Sequential",
    dot: "#EC4899",
  },
};

const entityConfig: Record<
  string,
  {
    color: string;
    bg: string;
    icon: React.ElementType;
    label: string;
  }
> = {
  person: { color: "#6C63FF", bg: "#F0EFFF", icon: UserRound, label: "Person" },
  org: { color: "#00D4AA", bg: "#E6FBF7", label: "Org", icon: Building },
  project: {
    color: "#FF8A65",
    bg: "#FFF3EE",
    label: "Project",
    icon: FolderKanban,
  },
  date: { color: "#EC4899", bg: "#FDF2F8", label: "Date", icon: CalendarDays },
  concept: { color: "#A78BFA", bg: "#F5F3FF", label: "Concept", icon: Atom },
  general: { color: "#64748B", bg: "#F1F5F9", label: "General", icon: Sparkles },
};

const sidebarSectionClass = "px-3 py-3";

// ─── Utilities ────────────────────────────────────────────────────────────
function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}



function getUserDisplayName(user: User | null): string {
  if (!user) return "Guest";

  const metadata = user.user_metadata ?? {};

  return (
    metadata.full_name ??
    metadata.name ??
    user.email?.split("@")[0] ??
    "Account"
  );
}

// ─── Toast Notification ──────────────────────────────────────────────────
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: "bg-[#10B981] text-white",
    error: "bg-[#EF4444] text-white",
    info: "bg-[#6C63FF] text-white",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50 }}
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg text-[13px] font-medium ${colors[type]}`}
    >
      {type === "success" && <CheckCircle className="w-4 h-4" />}
      {type === "error" && <AlertCircle className="w-4 h-4" />}
      {type === "info" && <Sparkles className="w-4 h-4" />}
      {message}
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────
function ConversationItem({
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
          ? "bg-[#F5F3FF] border-[#D8D4FF] shadow-[0_1px_8px_rgba(108,99,255,0.08)]"
          : hovered
          ? "bg-[#FBFBFF] border-[#EDF0F7] shadow-[0_1px_6px_rgba(15,23,42,0.04)]"
          : "bg-white border-transparent"
      }`}
    >
      <div className="flex items-start gap-3 pr-10">
        <div
          className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
          style={{ backgroundColor: cfg.dot }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span
              className={`text-[13px] font-semibold truncate leading-5 ${
                isSelected ? "text-[#6C63FF]" : "text-[#1A1A2E]"
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
          <button
            className="p-1.5 hover:bg-[#EEF0FF] rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            title={conversation.is_pinned ? "Unpin" : "Pin"}
          >
            <Pin className="w-3 h-3 text-[#6B7280]" />
          </button>
          <button
            className="p-1.5 hover:bg-red-50 rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete"
          >
            <Trash2 className="w-3 h-3 text-[#EF4444]" />
          </button>
        </div>
      )}
    </motion.button>
  );
}

function MessageBubble({
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
        <div className="w-8 h-8 rounded-full bg-[#6C63FF] flex items-center justify-center shrink-0 mb-1 shadow-sm text-white text-[13px]">
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
                      "linear-gradient(135deg, #6C63FF 0%, #00D4AA 100%)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }
                : { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }
            }
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        <span className="text-[11px] text-[#9CA3AF] px-1">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {message.token_count ? ` · ${message.token_count}t` : ""}
        </span>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-end gap-2.5 slide-up-fade"
    >
      <div className="w-8 h-8 rounded-full bg-[#6C63FF] flex items-center justify-center shrink-0 shadow-sm text-white text-[13px]">
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

function EntityCard({
  entity,
  compact = false,
}: {
  entity: Entity;
  compact?: boolean;
}) {
  const cfg =
    entityConfig[entity.entity_type] || entityConfig.general;
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

function MiniGraph({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) {
  return (
    <ForceGraph2D
      graphData={{
        nodes: nodes.map((n) => ({
          id: n.id,
          label: n.label,
          type: n.type,
        })),
        links: edges.map((e) => ({
          source: e.source,
          target: e.target,
          label: e.label,
        })),
      }}
      nodeLabel="label"
      nodeColor={(node: any) => {
        const colors: Record<string, string> = {
          person: "#6C63FF",
          org: "#00D4AA",
          project: "#FF8A65",
          date: "#EC4899",
          concept: "#A78BFA",
        };
        return colors[node.type] || "#6C63FF";
      }}
      linkLabel="label"
      linkColor={() => "#374151"}
      backgroundColor="#0F0F1A"
      width={280}
      height={220}
    />
  );
}

function TokenBar({
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
    { label: "System prompt", value: tokenInfo.system_prompt_tokens, color: "#6C63FF" },
    { label: "Memory context", value: tokenInfo.memory_tokens, color: "#00D4AA" },
    { label: "Recent messages", value: tokenInfo.recent_message_tokens, color: "#FF8A65" },
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

// ─── Welcome Screen ───────────────────────────────────────────────────────
const aiHeroAnimation = new URL(
  "../../assests/Artificial_Intelligence.svg",
  import.meta.url
).href;

const welcomeHighlights = [
  {
    title: "Persistent memory",
    description:
      "Retain context, entities, and relationships across conversations.",
  },
  {
    title: "Knowledge graph",
    description: "See how people, projects, and concepts connect in real time.",
  },
  {
    title: "Fast retrieval",
    description:
      "Surface the most relevant memories without cluttering the chat.",
  },
  {
    title: "Polished workflows",
    description:
      "Move between chat, graph, personas, and analytics seamlessly.",
  },
];

function WelcomeScreen({
  onNewConversation,
}: {
  onNewConversation: () => void;
}) {
  return (
    <div className="h-full min-h-0 relative overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-32 left-[-10%] h-[28rem] w-[28rem] rounded-full opacity-[0.08] blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(108,99,255,0.9) 0%, transparent 65%)",
          }}
          animate={{ scale: [1, 1.08, 1], x: [0, 20, 0], y: [0, -16, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-24 right-[-10%] h-[26rem] w-[26rem] rounded-full opacity-[0.08] blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(0,212,170,0.9) 0%, transparent 65%)",
          }}
          animate={{ scale: [1, 1.12, 1], x: [0, -20, 0], y: [0, 18, 0] }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-full w-full max-w-6xl items-center py-6">
        <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="space-y-5">
              <h1
                className="max-w-xl text-5xl tracking-wide sm:text-6xl lg:text-7xl bg-gradient-to-r from-red-800 via-red-1200 to-red-400 bg-clip-text text-transparent"
                style={{ fontFamily: "'Dancing Script', cursive" }}
              >
                ConversiQ
              </h1>
              <p className="max-w-2xl text-[15px] leading-7 text-[#5B6474] sm:text-[16px]">
                AI Chatbot Platform with Persistent Memory
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onNewConversation}
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(108,99,255,0.22)] transition-transform duration-200 hover:scale-[1.01]"
                style={{
                  background: "linear-gradient(135deg, #6C63FF 0%, #00D4AA 100%)",
                }}
              >
                <Plus className="h-4 w-4" />
                Start Conversation
              </motion.button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Memory modes", value: "5" },
                { label: "Contexts tracked", value: "∞" },
                { label: "Graph links", value: "Live" },
                { label: "Response feel", value: "Premium" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-[#E5E7EB] bg-white/85 px-4 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)] backdrop-blur"
                >
                  <div className="text-[11px] uppercase tracking-wide text-[#8A94A6]">
                    {stat.label}
                  </div>
                  <div className="mt-1 text-[16px] font-semibold text-[#101827]">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
            className="relative"
          >
            <div className="space-y-5">
              <div className="flex justify-center">
                <img
                  src={aiHeroAnimation}
                  alt="AI illustration"
                  className="h-auto w-full max-w-[290px] select-none object-contain"
                  loading="eager"
                  decoding="async"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {welcomeHighlights.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.12 + index * 0.06 }}
                    className="rounded-2xl border border-transparent bg-transparent p-4"
                  >
                    <div className="text-[13px] font-semibold text-[#101827]">
                      {item.title}
                    </div>
                    <p className="mt-1.5 text-[12px] leading-6 text-[#5B6474]">
                      {item.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ─── Memory Panel ─────────────────────────────────────────────────────────
function MemoryPanel({
  activeTab,
  setActiveTab,
  conversationId,
  authContext,
}: {
  activeTab: MemoryTab;
  setActiveTab: (t: MemoryTab) => void;
  conversationId: number | null;
  authContext?: AuthRequestContext;
}) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [triples, setTriples] = useState<KGTriple[]>([]);
  const [graphData, setGraphData] = useState<{
    nodes: GraphNode[];
    edges: GraphEdge[];
  }>({ nodes: [], edges: [] });
  const [summary, setSummary] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTabData = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      if (activeTab === "entities") {
        const data = await api.getEntities(conversationId, authContext);
        setEntities(data.entities || []);
      } else if (activeTab === "graph") {
        const data = await api.getGraph(conversationId, authContext);
        setTriples(data.triples || []);
        // Convert triples → graph nodes/edges
        const nodeMap: Record<string, GraphNode> = {};
        const edges: GraphEdge[] = [];
        let nodeIdx = 0;
        (data.triples || []).forEach((t: KGTriple) => {
          if (!nodeMap[t.subject]) {
            nodeMap[t.subject] = {
              id: t.subject,
              label: t.subject,
              type: "concept",
              x: 60 + (nodeIdx % 5) * 70,
              y: 60 + Math.floor(nodeIdx / 5) * 70,
            };
            nodeIdx++;
          }
          if (!nodeMap[t.object]) {
            nodeMap[t.object] = {
              id: t.object,
              label: t.object,
              type: "concept",
              x: 60 + (nodeIdx % 5) * 70,
              y: 60 + Math.floor(nodeIdx / 5) * 70,
            };
            nodeIdx++;
          }
          edges.push({ source: t.subject, target: t.object, label: t.predicate });
        });
        setGraphData({ nodes: Object.values(nodeMap), edges });
      } else if (activeTab === "summary") {
        const data = await api.getSummary(conversationId, authContext);
        setSummary(data.summary_text || null);
      } else if (activeTab === "tokens") {
        const data = await api.getTokenInfo(conversationId, authContext);
        setTokenInfo(data);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [conversationId, activeTab, authContext]);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  const tabs: { id: MemoryTab; icon: React.ElementType; label: string }[] = [
    { id: "entities", icon: Database, label: "Entities" },
    { id: "graph", icon: Workflow, label: "Graph" },
    { id: "summary", icon: FileClock, label: "Summary" },
    { id: "tokens", icon: Activity, label: "Tokens" },
  ];

  return (
    <div className="h-full flex flex-col bg-white border-l border-[#E5E7EB]">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2 mb-3 rounded-2xl bg-[#FAFBFF] border border-[#ECEEF6] px-3 py-2.5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
          <Database className="w-4 h-4 text-[#6C63FF]" />
          <span className="text-[13px] font-semibold text-[#101827]">
            Memory Inspector
          </span>
          <div className="ml-auto flex gap-1.5">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F0EFFF] text-[#6C63FF]">
              {entities.length} entities
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981]">
              {triples.length} relations
            </span>
          </div>
        </div>
        {/* Refresh button */}
        <button
          onClick={fetchTabData}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-[#6B7280] hover:text-[#6C63FF] hover:bg-[#F5F3FF] rounded-lg transition-colors mb-2"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
        {/* Tabs */}
        <div className="flex border-b border-[#F3F4F6] relative -mx-4 px-4 gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-medium uppercase tracking-wide transition-colors relative shrink-0 ${
                activeTab === tab.id
                  ? "bg-[#F5F3FF] text-[#6C63FF]"
                  : "text-[#8A94A6] hover:bg-[#F8F9FF] hover:text-[#6B7280]"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tabUnderline"
                  className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#6C63FF] rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 text-[#6C63FF] animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "entities" && (
              <motion.div
                key="entities"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="p-4 space-y-3"
              >
                {entities.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#D0CFFE] bg-[#FAFAFF] p-5 text-center">
                    <div className="mx-auto w-9 h-9 rounded-full bg-[#F0EFFF] text-[#6C63FF] flex items-center justify-center mb-2">
                      <Database className="w-4 h-4" />
                    </div>
                    <div className="text-[12px] font-semibold text-[#1A1A2E]">
                      No entities yet
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-1">
                      Start chatting with Entity or KG memory to track facts.
                    </div>
                  </div>
                ) : (
                  entities.map((entity) => (
                    <EntityCard key={entity.id} entity={entity} compact />
                  ))
                )}
              </motion.div>
            )}

            {activeTab === "graph" && (
              <motion.div
                key="graph"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="p-4 space-y-3"
              >
                {graphData.nodes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#D0CFFE] bg-[#FAFAFF] p-5 text-center">
                    <div className="text-[12px] font-semibold text-[#1A1A2E]">
                      No graph data yet
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-1">
                      Use KG memory mode to build relationships.
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className="rounded-xl overflow-hidden"
                      style={{ background: "#0F0F1A", aspectRatio: "1/0.8" }}
                    >
                      <MiniGraph nodes={graphData.nodes} edges={graphData.edges} />
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] text-center">
                      {triples.length} relationship triples
                    </p>
                    <div className="space-y-1.5">
                      {triples.slice(0, 5).map((t) => (
                        <div
                          key={t.id}
                          className="text-[11px] text-[#6B7280] px-2 py-1.5 rounded-xl bg-[#FAFBFF] border border-[#E5E7EB]"
                        >
                          <span className="font-medium text-[#101827]">
                            {t.subject}
                          </span>
                          <span className="mx-1.5 text-[#9CA3AF]">→</span>
                          <span className="text-[#6C63FF]">{t.predicate}</span>
                          <span className="mx-1.5 text-[#9CA3AF]">→</span>
                          <span className="font-medium text-[#101827]">
                            {t.object}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {activeTab === "summary" && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="p-4 space-y-3"
              >
                {!summary ? (
                  <div className="rounded-xl border border-dashed border-[#D0CFFE] bg-[#FAFAFF] p-5 text-center">
                    <div className="mx-auto w-9 h-9 rounded-full bg-[#F0EFFF] text-[#6C63FF] flex items-center justify-center mb-2">
                      <FileClock className="w-4 h-4" />
                    </div>
                    <div className="text-[12px] font-semibold text-[#1A1A2E]">
                      No summary yet
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-1">
                      Use Summary memory. Auto-summarizes every 5 messages.
                    </div>
                  </div>
                ) : (
                  <div
                    className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-[13px] text-[#374151] leading-relaxed"
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                  >
                    {summary}
                  </div>
                )}
                <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                  <Clock className="w-3 h-3" />
                  <span>Auto-updates every 5 messages</span>
                </div>
              </motion.div>
            )}

            {activeTab === "tokens" && (
              <motion.div
                key="tokens"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="p-4 space-y-3"
              >
                {tokenInfo && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="rounded-lg border border-[#E5E7EB] bg-white p-2.5">
                      <div className="text-[10px] text-[#9CA3AF]">Used</div>
                      <div className="text-[13px] font-semibold text-[#1A1A2E]">
                        {tokenInfo.used_tokens.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#E5E7EB] bg-white p-2.5">
                      <div className="text-[10px] text-[#9CA3AF]">Budget</div>
                      <div className="text-[13px] font-semibold text-[#1A1A2E]">
                        {tokenInfo.total_budget.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#E5E7EB] bg-white p-2.5">
                      <div className="text-[10px] text-[#9CA3AF]">Free</div>
                      <div className="text-[13px] font-semibold text-[#10B981]">
                        {tokenInfo.available_for_generation.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
                <TokenBar tokenInfo={tokenInfo} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ─── Persona Card ──────────────────────────────────────────────────────────
function PersonaCard({
  persona,
  isActive,
  onSelect,
  onDelete,
}: {
  persona: Persona;
  isActive: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  const mcfg = memoryConfig[persona.memory_type] || memoryConfig.buffer;
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 10px 22px rgba(0,0,0,0.08)" }}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 relative ${
        isActive
          ? "border-[#6C63FF] bg-[#F0EFFF] shadow-sm"
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
              background: "linear-gradient(135deg, #6C63FF 0%, #00D4AA 100%)",
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
            <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#6C63FF] text-white">
              Active
            </span>
          )}
        </div>
        <p className="text-[12px] text-[#6B7280] leading-relaxed">
          {persona.description}
        </p>
        <div className="mt-3 inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F8F9FF] px-2 py-1 text-[10px] font-medium text-[#6B7280]">
          {persona.domain}
        </div>
      </button>
      {!persona.is_builtin && onDelete && (
        <button
          onClick={onDelete}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-red-50 transition-colors"
          title="Delete persona"
        >
          <Trash2 className="w-3.5 h-3.5 text-[#EF4444]" />
        </button>
      )}
    </motion.div>
  );
}

// ─── Nav Button ─────────────────────────────────────────────────────────────
function NavButton({
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
          ? "bg-[#F0EFFF] text-[#6C63FF]"
          : "text-[#9CA3AF] hover:text-[#6B7280] hover:bg-[#F8F9FF]"
      }`}
    >
      <Icon className="w-4.5 h-4.5" />
    </button>
  );
}

// ─── Auth Components ──────────────────────────────────────────────────────
function AuthField({
  label,
  placeholder,
  type = "text",
  icon: Icon,
  value,
  onChange,
  rightSlot,
}: {
  label: string;
  placeholder: string;
  type?: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-[12px] font-medium text-[#475569]">{label}</span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          className="w-full rounded-2xl border border-[#E5E7EB] bg-white py-3 pl-10 pr-12 text-[14px] text-[#101827] placeholder:text-[#94A3B8] shadow-[0_1px_4px_rgba(15,23,42,0.03)] transition-all focus:border-[#CFCFF7] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/15"
        />
        {rightSlot}
      </div>
    </label>
  );
}

function AuthScreen({
  mode,
  onBack,
  onSwitchMode,
  onSubmit,
  authMessage,
}: {
  mode: AuthView;
  onBack: () => void;
  onSwitchMode: (mode: AuthView) => void;
  onSubmit: (form: AuthFormValues) => Promise<void> | void;
  authMessage: { text: string; type: "error" | "success" | "info" } | null;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState<AuthFormValues>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const isLogin = mode === "login";

  useEffect(() => {
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [mode]);

  const sharedCard =
    "rounded-[28px] border border-white/70 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl";

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-full w-full max-w-6xl items-center py-4">
        <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="hidden items-center justify-center lg:flex"
          >
            <img
              src={aiHeroAnimation}
              alt="AI illustration"
              className="w-full max-w-[340px] select-none object-contain"
              loading="eager"
              decoding="async"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
            className={`${sharedCard} p-5 sm:p-6`}
          >
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] font-medium text-[#475569] transition-all hover:bg-[#F8F9FF]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to app
            </button>

            <div className="mt-5 space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-[#101827]">
                {isLogin ? "Login" : "Create account"}
              </h2>
              <p className="text-[13px] leading-6 text-[#64748B]">
                {isLogin
                  ? "Enter your credentials to continue."
                  : "Create your account to start using the AI workspace."}
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {!isLogin && (
                <AuthField
                  label="Full Name"
                  placeholder="Enter your full name"
                  icon={UserRound}
                  value={form.fullName}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, fullName: value }))
                  }
                />
              )}
              <AuthField
                label="Email"
                placeholder="name@company.com"
                icon={Mail}
                value={form.email}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, email: value }))
                }
              />
              <AuthField
                label="Password"
                placeholder="Enter your password"
                icon={Lock}
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, password: value }))
                }
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[#94A3B8] transition-colors hover:bg-[#F8F9FF] hover:text-[#475569]"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
              />
              {!isLogin && (
                <AuthField
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  icon={Lock}
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, confirmPassword: value }))
                  }
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[#94A3B8] transition-colors hover:bg-[#F8F9FF] hover:text-[#475569]"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />
              )}
            </div>

            {authMessage && (
              <div
                className={`w-full px-4 py-3 rounded-xl text-sm font-medium text-center ${
                  authMessage.type === "error"
                    ? "bg-red-50 text-red-600 border border-red-200"
                    : authMessage.type === "success"
                    ? "bg-green-50 text-green-600 border border-green-200"
                    : "bg-blue-50 text-blue-600 border border-blue-200"
                }`}
              >
                {authMessage.text}
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => void onSubmit(form)}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_14px_28px_rgba(108,99,255,0.22)] transition-transform hover:scale-[1.01]"
              style={{
                background: "linear-gradient(135deg, #6C63FF 0%, #00D4AA 100%)",
              }}
            >
              {isLogin ? (
                <LogIn className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {isLogin ? "Login" : "Create Account"}
            </motion.button>

            <div className="mt-5 text-center text-[13px] text-[#64748B]">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => onSwitchMode(isLogin ? "register" : "login")}
                className="font-semibold text-[#6C63FF] transition-colors hover:text-[#5B56E8]"
              >
                {isLogin ? "Register" : "Login"}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Menu ─────────────────────────────────────────────────────────
function ProfileMenu({
  user,
  isOpen,
  onToggle,
  onLogin,
  onRegister,
  onLogout,
  onClose,
}: {
  user: User | null;
  isOpen: boolean;
  onToggle: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onLogout: () => void;
  onClose: () => void;
}) {
  const isAuthenticated = Boolean(user);
  const displayName = getUserDisplayName(user);
  const displayEmail = user?.email ?? "";

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        onClick={onToggle}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#64748B] shadow-[0_1px_4px_rgba(15,23,42,0.04)] transition-all hover:border-[#CFCFF7] hover:text-[#101827]"
      >
        <UserRound className="h-4.5 w-4.5" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
          >
            <div className="border-b border-[#F3F4F6] px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] text-white shadow-sm">
                  <UserRound className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94A3B8]">
                    {isAuthenticated ? "Signed in" : "Account"}
                  </div>
                  <div className="mt-1 truncate text-[14px] font-semibold text-[#101827]">
                    {isAuthenticated ? displayName : "Guest"}
                  </div>
                  <div className="truncate text-[12px] text-[#6B7280]">
                    {isAuthenticated ? displayEmail : "Sign in to continue"}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-2">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={onClose}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#101827] transition-colors hover:bg-[#F8F9FF]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F3FF] text-[#6C63FF]">
                      <UserRound className="h-4 w-4" />
                    </span>
                    <span>Account</span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#101827] transition-colors hover:bg-[#F8F9FF]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FEE2E2] text-[#EF4444]">
                      <LogIn className="h-4 w-4" />
                    </span>
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onLogin}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#101827] transition-colors hover:bg-[#F8F9FF]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F3FF] text-[#6C63FF]">
                      <LogIn className="h-4 w-4" />
                    </span>
                    <span>Login</span>
                  </button>
                  <button
                    onClick={onRegister}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#101827] transition-colors hover:bg-[#F8F9FF]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E6FBF7] text-[#00A88B]">
                      <UserPlus className="h-4 w-4" />
                    </span>
                    <span>Register</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Stats Screen ─────────────────────────────────────────────────────────
function StatsScreen({ authContext }: { authContext?: AuthRequestContext }) {
  const [realStats, setRealStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_BASE + "/stats")
      .then((res) => res.json())
      .then((data) => setRealStats(data))
      .catch((err) => console.error("Stats fetch failed:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#6C63FF] animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Conversations",
      value: realStats?.total_conversations ?? 0,
      icon: MessageCircleMore,
      color: "#6C63FF",
      delta: `~${realStats?.average_messages_per_conversation ?? 0} msgs avg`,
    },
    {
      label: "Messages",
      value: realStats?.total_messages ?? 0,
      icon: Send,
      color: "#00D4AA",
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
                <TrendingUp className="w-3.5 h-3.5 text-[#00D4AA]" />
              </div>
              <div className="text-[22px] font-bold text-[#1A1A2E] mb-0.5">
                {s.value.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#6B7280]">{s.label}</div>
              <div className="text-[11px] text-[#00D4AA] mt-1">{s.delta}</div>
            </motion.div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div className="text-center text-gray-400 py-8">
            Historical chart data coming soon
          </div>
        </div>

        {/* Total tokens */}
        {realStats?.total_tokens_used > 0 && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <h3 className="text-[14px] font-semibold text-[#1A1A2E] mb-2">
              Total Tokens Consumed
            </h3>
            <div className="text-[32px] font-bold text-[#6C63FF]">
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

// ─── Main App ─────────────────────────────────────────────────────────────
export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("chat");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<MemoryTab>("entities");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(DEFAULT_GENERAL_ASSISTANT_PERSONA);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  const [isWideDesktop, setIsWideDesktop] = useState(
    () => window.innerWidth >= 1280);
  const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthMenuOpen, setIsAuthMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [memoryTypeOverride, setMemoryTypeOverride] = useState<MemoryMode | "">("");
  const [authMessage, setAuthMessage] = useState<{ text: string; type: "error" | "success" | "info" } | null>(null);

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => setToast({ message, type });

  const isAuthenticated = Boolean(session?.user);
  const authContext = useMemo(
    () =>
      session?.access_token && user?.id
        ? { accessToken: session.access_token, userId: user.id }
        : undefined,
    [session?.access_token, user?.id]
  );

  const closeAuthMenu = useCallback(() => {
    setIsAuthMenuOpen(false);
  }, []);

  const syncAuthState = useCallback(async () => {
    const [{ data: userData }, { data: sessionData }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession(),
    ]);

    const nextSession = sessionData.session;
    const nextUser = userData.user ?? nextSession?.user ?? null;

    setSession(nextSession);
    setUser(nextUser);

    if (nextUser) {
      setCurrentScreen((screen) =>
        screen === "login" || screen === "register" ? "chat" : screen
      );
    }
  }, []);

  // ── Init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    void (async () => {
      await syncAuthState();
      if (!active) return;
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsAuthMenuOpen(false);

      if (nextSession?.user) {
        setCurrentScreen((screen) =>
          screen === "login" || screen === "register" ? "chat" : screen
        );
      } else {
        setCurrentScreen("chat");
        setSelectedConvId(null);
        setMessages([]);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [syncAuthState]);
  useEffect(() => {
    // Check backend health
    api
      .health()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));

    // Load personas
    api
      .listPersonas()
      .then((data) => {
        setPersonas(data);
        let defaultPersona = DEFAULT_GENERAL_ASSISTANT_PERSONA;
        for (const persona of data as Persona[]) {
          if (persona.id === "general_assistant" || persona.name === "General Assistant") {
            defaultPersona = persona;
            break;
          }
        }
        setSelectedPersona(defaultPersona);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = () => {
      setIsDesktop(window.innerWidth >= 1024);
      setIsWideDesktop(window.innerWidth >= 1280);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    setIsAuthMenuOpen(false);
  }, [currentScreen]);

  useEffect(() => {
    if (!isAuthenticated) {
      setConversations([]);
      setSelectedConvId(null);
      setMessages([]);
    }
  }, [isAuthenticated]);

  // ── Load conversations ────────────────────────────────────────────────
  const loadConversations = useCallback(
    async (search = "") => {
      if (!authContext) {
        setConversations([]);
        return;
      }
      setConversationsLoading(true);
      try {
        const data = await api.listConversations(search, false, authContext);
        setConversations(data);
      } catch {
        showToast("Could not load conversations", "error");
      } finally {
        setConversationsLoading(false);
      }
    },
    [authContext]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadConversations();
  }, [isAuthenticated, loadConversations]);

  // ── Load conversation messages ────────────────────────────────────────
  const loadConversation = useCallback(async (id: number) => {
    try {
      const data = await api.getConversation(id, authContext);
      const msgs: Message[] = (data.messages || []).map((m: any) => ({
        id: String(m.id),
        role: m.role as MessageRole,
        content: m.content,
        timestamp: new Date(m.created_at),
        token_count: m.token_count,
      }));
      setMessages(msgs);
    } catch {
      showToast("Could not load messages", "error");
    }
  }, [authContext]);

  const handleSelectConversation = useCallback(
    (id: number) => {
      setSelectedConvId(id);
      setCurrentScreen("chat");
      setSidebarOpen(false);
      loadConversation(id);
    },
    [loadConversation]
  );

  // ── Create conversation ───────────────────────────────────────────────
  const handleNewConversation = useCallback(async () => {
    try {
      const conv = await api.createConversation({
        title: "New Chat",
        persona_id: selectedPersona?.id || "general_assistant",
        memory_type: memoryTypeOverride || "buffer",
        user_id: user?.id,
      }, authContext);
      setConversations((prev) => [conv, ...prev]);
      setSelectedConvId(conv.id);
      setMessages([]);
      setCurrentScreen("chat");
      setSidebarOpen(false);
      showToast("New conversation created", "success");
    } catch {
      showToast("Please login or register to start a conversation.", "error");
    }
  }, [selectedPersona, memoryTypeOverride, user?.id, authContext]);

  // ── Send message ──────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || !selectedConvId) return;
    setIsTyping(false);
    const streamingId = `msg-${Date.now()}`;

    const userMsg: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setMessages((prev) => [...prev, {
      id: streamingId,
      role: "assistant" as const,
      content: "",
      timestamp: new Date()
    }]);
    setInputValue("");

    try {
      const res = await fetch(API_BASE + `/conversations/${selectedConvId}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to send message");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") break;
            try {
              const parsed = JSON.parse(raw);
              if (parsed.response) {
                setMessages((prev) => prev.map(m =>
                  m.id === streamingId
                    ? { ...m, content: parsed.response }
                    : m
                ));
              }
            } catch (e) {}
          }
        }
      }

      // Update conversation list title
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConvId
            ? {
                ...c,
                title:
                  c.title === "New Chat" ? text.slice(0, 50) : c.title,
                message_count: c.message_count + 2,
              }
            : c
        )
      );
    } catch (err: any) {
      showToast("Failed to get response. Is backend running?", "error");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id && m.id !== streamingId));
    } finally {
      setIsTyping(false);
    }
  }, [inputValue, selectedConvId, session]);

  // ── Pin conversation ──────────────────────────────────────────────────
  const handlePinConversation = useCallback(
    async (id: number) => {
      const conv = conversations.find((c) => c.id === id);
      if (!conv) return;
      try {
        await api.updateConversation(id, { is_pinned: !conv.is_pinned }, authContext);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, is_pinned: !c.is_pinned } : c
          )
        );
        showToast(conv.is_pinned ? "Unpinned" : "Pinned", "success");
      } catch {
        showToast("Failed to update", "error");
      }
    },
    [conversations, authContext]
  );

  // ── Delete conversation ───────────────────────────────────────────────
  const handleDeleteConversation = useCallback(
    async (id: number) => {
      try {
        await api.deleteConversation(id, authContext);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (selectedConvId === id) {
          setSelectedConvId(null);
          setMessages([]);
        }
        showToast("Conversation deleted", "success");
      } catch {
        showToast("Failed to delete", "error");
      }
    },
    [selectedConvId, authContext]
  );

  // ── Search conversations ──────────────────────────────────────────────
  const handleSearch = useCallback(
    (q: string) => {
      setSearchQuery(q);
      loadConversations(q);
    },
    [loadConversations]
  );

  // ── Export conversation ───────────────────────────────────────────────
  const handleExport = useCallback(
    async (format: "json" | "markdown") => {
      if (!selectedConvId) return;
      try {
        const data = await api.exportConversation(selectedConvId, format, authContext);
        const content =
          format === "json"
            ? JSON.stringify(data, null, 2)
            : data.markdown || "";
        const blob = new Blob([content], {
          type: format === "json" ? "application/json" : "text/markdown",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `conversation-${selectedConvId}.${
          format === "json" ? "json" : "md"
        }`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Exported as ${format.toUpperCase()}`, "success");
      } catch {
        showToast("Export failed", "error");
      }
    },
    [selectedConvId, authContext]
  );

  // ── Change memory type ─────────────────────────────────────────────────
  const handleChangeMemoryType = useCallback(
    async (memType: MemoryMode) => {
      if (!selectedConvId) {
        setMemoryTypeOverride(memType);
        return;
      }
      try {
        await api.updateConversation(selectedConvId, { memory_type: memType }, authContext);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConvId ? { ...c, memory_type: memType } : c
          )
        );
        showToast(`Memory switched to ${memType}`, "success");
      } catch {
        showToast("Failed to update memory type", "error");
      }
    },
    [selectedConvId, authContext]
  );

  // ── Delete persona ─────────────────────────────────────────────────────
  const handleDeletePersona = useCallback(async (id: string) => {
    try {
      await api.deletePersona(id);
      setPersonas((prev) => prev.filter((p) => p.id !== id));
      showToast("Persona deleted", "success");
    } catch {
      showToast("Cannot delete builtin persona", "error");
    }
  }, []);

  const handleAuthSubmit = useCallback(
    async (form: AuthFormValues) => {
      setAuthMessage(null);
      const isRegister = currentScreen === "register";

      try {
        if (isRegister) {
          if (!form.fullName || !form.email || !form.password || !form.confirmPassword) {
            setAuthMessage({ text: "Please fill in all fields to continue", type: "error" });
            return;
          }

          if (!/^[a-zA-Z\s]{2,50}$/.test(form.fullName)) {
            setAuthMessage({ text: "Please enter a valid name (letters only, minimum 2 characters). Numbers and special characters are not allowed.", type: "error" });
            return;
          }

          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            setAuthMessage({ text: "Please enter a valid email address (e.g. name@example.com)", type: "error" });
            return;
          }

          if (form.password.length < 8) {
            setAuthMessage({ text: "Password must be at least 8 characters long", type: "error" });
            return;
          }

          if (form.password !== form.confirmPassword) {
            setAuthMessage({ text: "Passwords do not match. Please try again", type: "error" });
            return;
          }

          const { data, error } = await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: {
              data: {
                full_name: form.fullName,
              },
            },
          });

          if (error) {
            setAuthMessage({ text: error.message, type: "error" });
            return;
          }

          setSession(data.session ?? null);
          setUser(data.user ?? data.session?.user ?? null);
          setAuthMessage({ text: "Account created! Please check your email to verify.", type: "success" });
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.password,
          });

          if (error) {
            setAuthMessage({ text: error.message, type: "error" });
            return;
          }

          setSession(data.session ?? null);
          setUser(data.user ?? data.session?.user ?? null);
          setAuthMessage({ text: "Welcome back!", type: "success" });
        }

        setIsAuthMenuOpen(false);
        setCurrentScreen("chat");
        showToast(isRegister ? "Registration successful" : "Login successful", "success");
      } catch {
        showToast("Authentication failed", "error");
      }
    },
    [currentScreen]
  );

  const handleLogout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        showToast(error.message, "error");
        return;
      }

      setSession(null);
      setUser(null);
      setSelectedConvId(null);
      setMessages([]);
      setIsAuthMenuOpen(false);
      setCurrentScreen("chat");
      showToast("Logged out", "info");
    } catch {
      showToast("Logout failed", "error");
    }
  }, []);

  const currentConversation = conversations.find((c) => c.id === selectedConvId);
  const pinnedConversations = conversations.filter((c) => c.is_pinned);
  const recentConversations = conversations.filter((c) => !c.is_pinned);
  const showSidebar = isDesktop ? !sidebarCollapsed : sidebarOpen;
  const authMode =
    currentScreen === "login" || currentScreen === "register"
      ? currentScreen
      : null;

  // Auth screen
  if (authMode) {
    return (
      <div className="flex h-[100dvh] w-full bg-[#F8F9FF] overflow-hidden font-[Inter,sans-serif] text-[#1A1A2E]">
        <div className="flex flex-1 min-w-0 flex-col">
          <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 sm:px-5 shrink-0 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-[#101827]">
                  ConversiQ
                </div>
                <div className="text-[11px] text-[#6B7280]">Secure auth</div>
              </div>
            </div>
          </header>
          <AuthScreen
            mode={authMode}
            onBack={() => setCurrentScreen("chat")}
            onSwitchMode={(mode) => setCurrentScreen(mode)}
            onSubmit={handleAuthSubmit}
            authMessage={authMessage}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-[#F8F9FF] overflow-hidden font-[Inter,sans-serif] text-[#1A1A2E]">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Backend offline warning */}
      {backendOnline === false && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-red-500 text-white text-[12px] py-2 text-center flex items-center justify-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          Backend offline — start Flask server on port 5000
        </div>
      )}

      {/* Mobile overlay */}
      <AnimatePresence>
        {!isDesktop && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── LEFT SIDEBAR ── */}
      <motion.aside
        initial={false}
        animate={
          isDesktop
            ? { width: sidebarCollapsed ? 64 : 260, x: 0 }
            : { width: sidebarOpen ? 260 : 0, x: 0 }
        }
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`${
          isDesktop ? "relative" : "fixed z-50 h-full"
        } bg-white border-r border-[#E5E7EB] flex flex-col shrink-0 overflow-hidden`}
      >
        {/* Logo */}
        <div className="px-3 py-3 border-b border-[#F3F4F6] flex items-center gap-2.5 shrink-0 min-h-[64px]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <span
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: "30px",
                fontWeight: "700",
                background: "linear-gradient(135deg, #7F1D1D, #C41E3A)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.3px",
              }}
            >
              ConversiQ
            </span>
          )}
          {!isDesktop && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto p-1 hover:bg-[#F3F4F6] rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-[#6B7280]" />
            </button>
          )}
        </div>

        {/* New chat + Search */}
        <div
          className={`px-3 py-3 border-b border-[#F3F4F6] shrink-0 ${
            sidebarCollapsed ? "flex justify-center" : ""
          }`}
        >
          {sidebarCollapsed ? (
            <button
              onClick={() => {
                handleNewConversation();
                setSidebarCollapsed(false);
              }}
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] flex items-center justify-center hover:shadow-md transition-all duration-200"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          ) : (
            <>
              <button
                onClick={handleNewConversation}
                className="w-full py-3 px-3.5 text-white text-[13px] font-semibold rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #6C63FF 0%, #00D4AA 100%)",
                }}
              >
                <Plus className="w-4 h-4" />
                New Conversation
              </button>
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full rounded-2xl border border-[#ECEEF6] bg-[#FAFBFF] py-2.5 pl-9 pr-3 text-[12px] text-[#101827] placeholder-[#98A2B3] focus:border-[#CFCFF7] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/15"
                />
              </div>
            </>
          )}
        </div>

        {/* Conversation list */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {conversationsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-[#6C63FF] animate-spin" />
              </div>
            ) : (
              <>
                {pinnedConversations.length > 0 && (
                  <div className={sidebarSectionClass}>
                    <div className="mb-2 flex items-center gap-1.5 px-1.5">
                      <Pin className="w-3 h-3 text-[#9CA3AF]" />
                      <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
                        Pinned
                      </span>
                    </div>
                    <div className="space-y-2">
                      {pinnedConversations.map((conv) => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          isSelected={selectedConvId === conv.id}
                          onClick={() => handleSelectConversation(conv.id)}
                          onPin={() => handlePinConversation(conv.id)}
                          onDelete={() => handleDeleteConversation(conv.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div className={sidebarSectionClass}>
                  <div className="mb-2 flex items-center gap-1.5 px-1.5">
                    <Clock className="w-3 h-3 text-[#9CA3AF]" />
                    <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
                      Recent
                    </span>
                  </div>
                  <div className="space-y-2">
                    {recentConversations.length === 0 && !pinnedConversations.length ? (
                      <div className="text-[12px] text-[#9CA3AF] text-center py-6">
                        No conversations yet.
                        <br />
                        Start one above!
                      </div>
                    ) : (
                      recentConversations.map((conv) => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          isSelected={selectedConvId === conv.id}
                          onClick={() => handleSelectConversation(conv.id)}
                          onPin={() => handlePinConversation(conv.id)}
                          onDelete={() => handleDeleteConversation(conv.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Bottom nav */}
        <div
          className={`border-t border-[#F3F4F6] p-2 shrink-0 ${
            sidebarCollapsed
              ? "flex flex-col gap-1 items-center"
              : "grid grid-cols-5 gap-1"
          }`}
        >
          {(
            [
              { id: "chat" as Screen, icon: MessageCircleMore, tip: "Chat" },
              { id: "graph" as Screen, icon: Workflow, tip: "Graph" },
              { id: "entities" as Screen, icon: Brain, tip: "Entities" },
              { id: "personas" as Screen, icon: UserRound, tip: "Personas" },
              { id: "stats" as Screen, icon: TrendingUp, tip: "Stats" },
            ] as const
          ).map(({ id, icon: Icon, tip }) => (
            <NavButton
              key={id}
              icon={Icon}
              active={currentScreen === id}
              onClick={() => setCurrentScreen(id)}
              tooltip={tip}
            />
          ))}
        </div>
      </motion.aside>

      {/* Collapse toggle */}
      {isDesktop && (
        <div className="relative">
          <button
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 flex h-12 w-6 items-center justify-center rounded-full border border-[#E5E7EB] bg-white shadow-sm transition-colors hover:bg-[#F8F9FF]"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3 h-3 text-[#6B7280]" />
            ) : (
              <ChevronLeft className="w-3 h-3 text-[#6B7280]" />
            )}
          </button>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 sm:px-5 shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {!isDesktop && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-[#F8F9FF] rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5 text-[#8A94A6]" />
              </button>
            )}

            {currentScreen === "chat" &&
              selectedConvId &&
              currentConversation && (
                <>
                  {selectedPersona && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8F9FF] rounded-full border border-[#E5E7EB] shrink-0">
                      <span className="text-lg">{selectedPersona.avatar}</span>
                      <span className="text-[13px] font-medium text-[#162033] hidden sm:inline">
                        {selectedPersona.name}
                      </span>
                    </div>
                  )}
                  {/* Memory type selector */}
                  <select
                    value={currentConversation.memory_type}
                    onChange={(e) =>
                      handleChangeMemoryType(e.target.value as MemoryMode)
                    }
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full border-0 focus:outline-none cursor-pointer"
                    style={{
                      color:
                        memoryConfig[currentConversation.memory_type]?.color ||
                        "#6C63FF",
                      backgroundColor:
                        memoryConfig[currentConversation.memory_type]?.bg ||
                        "#F0EFFF",
                    }}
                  >
                    <option value="buffer">Buffer Memory</option>
                    <option value="summary">Summary Memory</option>
                    <option value="entity">Entity Memory</option>
                    <option value="kg">KG Memory</option>
                    <option value="sequential">Sequential Chain</option>
                  </select>
                </>
              )}
          </div>

          <div className="flex items-center gap-1">
            {/* Export button */}
            {selectedConvId && (
              <div className="relative group">
                <button
                  className="p-2.5 hover:bg-[#F8F9FF] rounded-xl transition-colors"
                  title="Export"
                >
                  <Download className="w-4.5 h-4.5 text-[#8A94A6]" />
                </button>
                <div className="absolute right-0 top-10 z-50 hidden group-hover:block bg-white border border-[#E5E7EB] rounded-xl shadow-lg overflow-hidden">
                  <button
                    onClick={() => handleExport("json")}
                    className="block w-full text-left px-4 py-2.5 text-[12px] hover:bg-[#F8F9FF]"
                  >
                    Export as JSON
                  </button>
                  <button
                    onClick={() => handleExport("markdown")}
                    className="block w-full text-left px-4 py-2.5 text-[12px] hover:bg-[#F8F9FF]"
                  >
                    Export as Markdown
                  </button>
                </div>
              </div>
            )}
            <button
              className="p-2.5 hover:bg-[#F8F9FF] rounded-xl transition-colors"
              title="Settings"
            >
              <SlidersHorizontal className="w-4.5 h-4.5 text-[#8A94A6]" />
            </button>
            <button
              onClick={() => setIsMemoryPanelOpen((v) => !v)}
              className={`p-2.5 rounded-xl transition-colors ${
                isMemoryPanelOpen
                  ? "bg-[#F0EFFF] text-[#6C63FF]"
                  : "hover:bg-[#F8F9FF] text-[#8A94A6]"
              }`}
              title="Toggle memory panel"
            >
              <PanelRight className="w-4.5 h-4.5" />
            </button>
            <ProfileMenu
              user={user}
              isOpen={isAuthMenuOpen}
              onToggle={() => setIsAuthMenuOpen((v) => !v)}
              onLogin={() => {
                setCurrentScreen("login");
                setIsAuthMenuOpen(false);
              }}
              onRegister={() => {
                setCurrentScreen("register");
                setIsAuthMenuOpen(false);
              }}
              onLogout={handleLogout}
              onClose={closeAuthMenu}
            />
          </div>
        </header>

        {/* Screen content */}
        <div className="flex-1 overflow-hidden">
          {/* ── CHAT SCREEN ── */}
          {currentScreen === "chat" && (
            <div className="h-full flex bg-[#F8F9FF] pb-14 md:pb-0">
              <div className="flex-1 flex flex-col min-w-0">
                {!selectedConvId ? (
                  <WelcomeScreen onNewConversation={handleNewConversation} />
                ) : (
                  <>
                    {/* Messages */}
                    <div
                      className="flex-1 overflow-y-auto px-6 py-6"
                      style={{
                        backgroundColor: "#F8F9FF",
                        backgroundImage:
                          "radial-gradient(circle, #6C63FF15 1px, transparent 1px)",
                        backgroundSize: "24px 24px",
                      }}
                    >
                      <div className="max-w-2xl mx-auto space-y-5 px-0 sm:px-2 lg:px-0">
                        {messages.length === 0 && (
                          <div className="text-center py-12 text-[#9CA3AF]">
                            <div className="text-4xl mb-3">💬</div>
                            <div className="text-[14px]">
                              Start the conversation...
                            </div>
                          </div>
                        )}
                        <AnimatePresence initial={false}>
                          {messages.map((msg, i) => (
                            <MessageBubble key={msg.id} message={msg} index={i} />
                          ))}
                        </AnimatePresence>
                        <AnimatePresence>
                          {isTyping && <TypingIndicator />}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                      </div>
                    </div>

                    {/* Input */}
                    <div className="border-t border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 shrink-0">
                      <div className="max-w-2xl mx-auto">
                        <div className="flex items-end gap-3 bg-white border border-[#E5E7EB] rounded-[28px] px-4 py-3 focus-within:ring-2 focus-within:ring-[#6C63FF]/20 focus-within:border-[#6C63FF]/40 transition-all shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
                          <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => {
                              setInputValue(e.target.value);
                              e.target.style.height = "auto";
                              e.target.style.height =
                                Math.min(e.target.scrollHeight, 120) + "px";
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            placeholder="Type your message..."
                            rows={1}
                            disabled={isTyping}
                            className="flex-1 bg-transparent text-[14px] text-[#101827] placeholder-[#98A2B3] resize-none focus:outline-none leading-[1.55] max-h-[120px] overflow-y-auto disabled:opacity-60"
                          />
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isTyping}
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                            style={{
                              background:
                                "linear-gradient(135deg, #6C63FF 0%, #00D4AA 100%)",
                            }}
                          >
                            {isTyping ? (
                              <Loader2 className="w-4 h-4 text-white animate-spin" />
                            ) : (
                              <Send className="w-4 h-4 text-white" />
                            )}
                          </motion.button>
                        </div>
                        <p className="text-[11px] text-[#9CA3AF] mt-2 text-center">
                          Press{" "}
                          <kbd className="font-mono bg-[#F3F4F6] px-1 rounded text-[10px]">
                            Enter
                          </kbd>{" "}
                          to send ·{" "}
                          <kbd className="font-mono bg-[#F3F4F6] px-1 rounded text-[10px]">
                            Shift+Enter
                          </kbd>{" "}
                          for new line
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Memory panel (right) */}
              <div
                className={`${
                  isWideDesktop ? "block" : "hidden"
                } w-[300px] shrink-0 transition-all duration-300 ${
                  isMemoryPanelOpen
                    ? "opacity-100"
                    : "w-0 opacity-0 pointer-events-none overflow-hidden"
                }`}
              >
                <MemoryPanel
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  conversationId={selectedConvId}
                  authContext={authContext}
                />
              </div>
            </div>
          )}

          {/* ── GRAPH SCREEN ── */}
          {currentScreen === "graph" && (
            <GraphScreen conversationId={selectedConvId} authContext={authContext} />
          )}

          {/* ── ENTITIES SCREEN ── */}
          {currentScreen === "entities" && (
            <EntitiesScreen conversationId={selectedConvId} authContext={authContext} />
          )}

          {/* ── PERSONAS SCREEN ── */}
          {currentScreen === "personas" && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-5">
                <div>
                  <h2 className="text-[19px] font-bold text-[#1A1A2E]">
                    AI Personas
                  </h2>
                  <p className="text-[13px] text-[#6B7280] mt-0.5">
                    Choose the personality and memory mode for your conversations
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {personas.map((persona, i) => (
                    <motion.div
                      key={persona.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <PersonaCard
                        persona={persona}
                        isActive={selectedPersona?.id === persona.id}
                        onSelect={() => setSelectedPersona(persona)}
                        onDelete={
                          !persona.is_builtin
                            ? () => handleDeletePersona(persona.id)
                            : undefined
                        }
                      />
                    </motion.div>
                  ))}
                  {/* Create custom */}
                  <CreatePersonaCard
                    onCreated={(persona) => {
                      setPersonas((prev) => [...prev, persona]);
                      showToast("Persona created!", "success");
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STATS SCREEN ── */}
          {currentScreen === "stats" && <StatsScreen authContext={authContext} />}
        </div>
      </div>

      {/* Mobile memory panel sheet */}
      <AnimatePresence>
        {!isDesktop && isMemoryPanelOpen && currentScreen === "chat" && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setIsMemoryPanelOpen(false)}
            />
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed bottom-0 left-0 right-0 h-[72vh] bg-white rounded-t-2xl border-t border-[#E5E7EB] z-50"
            >
              <div className="w-10 h-1 bg-[#D1D5DB] rounded-full mx-auto mt-2 mb-1" />
              <MemoryPanel
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                conversationId={selectedConvId}
                authContext={authContext}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile bottom nav */}
      {!isDesktop && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E7EB] grid grid-cols-5 px-2 py-1">
          {(
            [
              { id: "chat" as Screen, icon: MessageCircleMore, tip: "Chat" },
              { id: "graph" as Screen, icon: Workflow, tip: "Graph" },
              {
                id: "entities" as Screen,
                icon: Brain,
                tip: "Entities",
              },
              {
                id: "personas" as Screen,
                icon: UserRound,
                tip: "Personas",
              },
              { id: "stats" as Screen, icon: TrendingUp, tip: "Stats" },
            ] as const
          ).map(({ id, icon: Icon, tip }) => (
            <NavButton
              key={id}
              icon={Icon}
              active={currentScreen === id}
              onClick={() => setCurrentScreen(id)}
              tooltip={tip}
            />
          ))}
        </div>
      )}

      <style>{`
        * { scrollbar-width: none; }
        *::-webkit-scrollbar { display: none; }

        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes typingBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.55; }
          40% { transform: translateY(-5px); opacity: 1; }
        }

        .slide-up-fade { animation: slideUpFade 300ms ease-out both; }
        .typing-dot { animation: typingBounce 900ms infinite ease-in-out; }
        .typing-dot:nth-child(1) { animation-delay: 0ms; }
        .typing-dot:nth-child(2) { animation-delay: 150ms; }
        .typing-dot:nth-child(3) { animation-delay: 300ms; }
      `}</style>
    </div>
  );
}

// ─── Graph Screen ─────────────────────────────────────────────────────────
function GraphScreen({
  conversationId,
  authContext,
}: {
  conversationId: number | null;
  authContext?: AuthRequestContext;
}) {
  const [triples, setTriples] = useState<KGTriple[]>([]);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    api
      .getGraph(conversationId, authContext)
      .then((data) => {
        setTriples(data.triples || []);
        const nodeMap: Record<string, GraphNode> = {};
        const edgeList: GraphEdge[] = [];
        let idx = 0;
        (data.triples || []).forEach((t: KGTriple) => {
          if (!nodeMap[t.subject]) {
            nodeMap[t.subject] = {
              id: t.subject,
              label: t.subject,
              type: "concept",
              x: 80 + (idx % 6) * 90,
              y: 80 + Math.floor(idx / 6) * 90,
            };
            idx++;
          }
          if (!nodeMap[t.object]) {
            nodeMap[t.object] = {
              id: t.object,
              label: t.object,
              type: "concept",
              x: 80 + (idx % 6) * 90,
              y: 80 + Math.floor(idx / 6) * 90,
            };
            idx++;
          }
          edgeList.push({ source: t.subject, target: t.object, label: t.predicate });
        });
        setNodes(Object.values(nodeMap));
        setEdges(edgeList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [conversationId, authContext]);

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center text-[#9CA3AF]">
        Select a conversation to view its knowledge graph.
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div
        className="flex-1 relative overflow-hidden bg-[#F8F9FF]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(108,99,255,0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#6C63FF] animate-spin" />
          </div>
        ) : nodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#9CA3AF] gap-3">
            <Workflow className="w-10 h-10 opacity-30" />
            <div className="text-[14px]">No graph data yet</div>
            <div className="text-[12px]">
              Switch to KG memory and chat to build relationships
            </div>
          </div>
        ) : (
          <ForceGraph2D
            graphData={{
              nodes: nodes.map((n) => ({
                id: n.id,
                label: n.label,
                type: n.type,
              })),
              links: edges.map((e) => ({
                source: e.source,
                target: e.target,
                label: e.label,
              })),
            }}
            nodeLabel="label"
            nodeColor={(node: any) => {
              const colors: Record<string, string> = {
                person: "#6C63FF",
                org: "#00D4AA",
                project: "#FF8A65",
                date: "#EC4899",
                concept: "#A78BFA",
              };
              return colors[node.type] || "#6C63FF";
            }}
            linkLabel="label"
            linkColor={() => "#374151"}
            backgroundColor="#0F0F1A"
            width={640}
            height={480}
          />
        )}
      </div>

      {/* Triples sidebar */}
      <div className="w-[280px] bg-white border-l border-[#E5E7EB] overflow-y-auto p-4">
        <h3 className="text-[13px] font-semibold text-[#101827] mb-3">
          Relationships ({triples.length})
        </h3>
        <div className="space-y-1.5">
          {triples.map((t) => (
            <div
              key={t.id}
              className="text-[11px] text-[#6B7280] px-2 py-1.5 rounded-xl bg-[#FAFBFF] border border-[#E5E7EB]"
            >
              <span className="font-medium text-[#101827]">{t.subject}</span>
              <span className="mx-1.5 text-[#9CA3AF]">→</span>
              <span className="text-[#6C63FF]">{t.predicate}</span>
              <span className="mx-1.5 text-[#9CA3AF]">→</span>
              <span className="font-medium text-[#101827]">{t.object}</span>
            </div>
          ))}
          {triples.length === 0 && (
            <div className="text-[12px] text-[#9CA3AF] text-center py-6">
              No triples yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Entities Screen ──────────────────────────────────────────────────────
function EntitiesScreen({
  conversationId,
  authContext,
}: {
  conversationId: number | null;
  authContext?: AuthRequestContext;
}) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

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

  const filtered = entities.filter(
    (e) =>
      !searchQuery ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                className="pl-9 pr-4 py-2 bg-white border border-[#E5E7EB] rounded-full text-[13px] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 w-48"
              />
            </div>
            <button
              onClick={handleSearchGlobal}
              className="px-3 py-2 rounded-full bg-[#6C63FF] text-white text-[12px] font-medium"
            >
              Search All
            </button>
          </div>
        </div>

        {/* Type filters */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(entityConfig).map(([type, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button
                key={type}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[12px] font-medium hover:border-[#D0CFFE] transition-colors"
                style={{ color: cfg.color }}
              >
                <Icon className="w-3.5 h-3.5" />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#6C63FF] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[#9CA3AF]">
            <Database className="w-10 h-10 mx-auto opacity-30 mb-3" />
            <div className="text-[14px]">No entities found</div>
            <div className="text-[12px]">
              Use Entity or KG memory mode and chat to extract entities
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create Persona Card ──────────────────────────────────────────────────
function CreatePersonaCard({
  onCreated,
}: {
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
      const persona = await api.createPersona(form);
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
        className="w-full min-h-[172px] rounded-xl border-2 border-dashed border-[#CFCFF7] bg-white text-[#6C63FF] flex flex-col items-center justify-center gap-2"
      >
        <div className="w-10 h-10 rounded-full bg-[#F0EFFF] flex items-center justify-center">
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
    <div className="rounded-xl border-2 border-[#6C63FF] bg-white p-4 space-y-3">
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
        className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20"
        placeholder="Name *"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
      />
      <input
        className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20"
        placeholder="Description"
        value={form.description}
        onChange={(e) =>
          setForm((f) => ({ ...f, description: e.target.value }))
        }
      />
      <textarea
        className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 resize-none"
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
          background: "linear-gradient(135deg, #6C63FF 0%, #00D4AA 100%)",
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