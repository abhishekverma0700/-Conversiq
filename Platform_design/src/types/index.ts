import type { ElementType } from "react";
import {
  UserRound,
  Building,
  FolderKanban,
  CalendarDays,
  Atom,
  Sparkles,
} from "lucide-react";

export type MemoryMode = "buffer" | "summary" | "entity" | "kg" | "sequential" | "hybrid"| "parallel" | "branching";;
export type EntityType = "person" | "org" | "project" | "date" | "concept" | "general";
export type MessageRole = "user" | "assistant";
export type Screen =
  | "chat"
  | "graph"
  | "entities"
  | "comparison"
  | "personas"
  | "stats"
  | "login"
  | "register";
export type AuthView = "login" | "register";
export type MemoryTab = "entities" | "graph" | "summary" | "tokens";

export interface AuthRequestContext {
  accessToken?: string | null;
  userId?: string | null;
}

export interface AuthFormValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface TokenInfo {
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

export interface KGTriple {
  id: number;
  subject: string;
  predicate: string;
  object: string;
  conversation_id: number;
  created_at: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  token_count?: number;
}

export interface Conversation {
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

export interface Entity {
  id: number;
  name: string;
  entity_type: EntityType;
  description: string;
  conversation_id: number;
  created_at: string;
  updated_at: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: EntityType;
  x: number;
  y: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface Persona {
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

export const memoryConfig: Record<
  string,
  { color: string; bg: string; label: string; dot: string }
> = {
  buffer: { color: "#7A1F2B", bg: "#F7E9EB", label: "Buffer", dot: "#7A1F2B" },
  summary: {
    color: "#F59E0B",
    bg: "#FFFBEB",
    label: "Summary",
    dot: "#F59E0B",
  },
  entity: { color: "#C8A96A", bg: "#FBF2DF", label: "Entity", dot: "#C8A96A" },
  kg: { color: "#9B4B5A", bg: "#F8EDEF", label: "KG", dot: "#9B4B5A" },
  sequential: {
    color: "#B76E4E",
    bg: "#FBECE6",
    label: "Sequential",
    dot: "#B76E4E",
  },
  hybrid: {
    color: "#5B7CFA",
    bg: "#EAF0FF",
    label: "Hybrid",
    dot: "#5B7CFA",
  },
  parallel: {
  color: "#10B981",
  bg: "#ECFDF5",
  label: "Parallel",
  dot: "#10B981",
},
branching: {
  color: "#8B5CF6",
  bg: "#F5F3FF",
  label: "Branching",
  dot: "#8B5CF6",
},
};

export const entityConfig: Record<
  string,
  {
    color: string;
    bg: string;
    icon: ElementType;
    label: string;
  }
> = {
  person: { color: "#7A1F2B", bg: "#F7E9EB", icon: UserRound, label: "Person" },
  org: { color: "#C8A96A", bg: "#FBF2DF", label: "Org", icon: Building },
  project: {
    color: "#B76E4E",
    bg: "#FBECE6",
    label: "Project",
    icon: FolderKanban,
  },
  date: { color: "#A15B68", bg: "#F9E9EB", label: "Date", icon: CalendarDays },
  concept: { color: "#9B4B5A", bg: "#F8EDEF", label: "Concept", icon: Atom },
  general: { color: "#64748B", bg: "#F1F5F9", label: "General", icon: Sparkles },
};
