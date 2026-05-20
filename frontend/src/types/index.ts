export interface Message {
  id: number
  conversation_id: number
  role: "user" | "assistant"
  content: string
  token_count: number
  created_at: string
}

export interface Conversation {
  id: number
  title: string
  persona_id: string
  memory_type: "buffer" | "summary" | "entity" | "kg" | "sequential"
  is_pinned: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
  message_count: number
  messages?: Message[]
}

export interface Entity {
  id: number
  conversation_id: number
  name: string
  entity_type: string
  description: string
  created_at: string
  updated_at: string
}

export interface KGTriple {
  id: number
  conversation_id: number
  subject: string
  predicate: string
  object: string
  created_at: string
}

export interface GraphData {
  nodes: { id: string; label: string }[]
  edges: { from: string; to: string; label: string }[]
}

export interface TokenInfo {
  system_prompt_tokens: number
  memory_tokens: number
  recent_message_tokens: number
  used_tokens: number
  total_budget: number
  usage_percentage: number
  is_near_limit: boolean
  is_over_limit: boolean
}

export interface Persona {
  id: string
  name: string
  description: string
  system_prompt: string
  memory_type: string
  temperature: number
  domain: string
  is_builtin: boolean
  avatar: string
}

export interface Stats {
  total_conversations: number
  total_messages: number
  total_entities: number
  total_kg_triples: number
  total_summaries: number
  total_tokens_used: number
  average_messages_per_conversation: number
}