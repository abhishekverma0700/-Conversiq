import { create } from "zustand"
import type { Conversation, Message, Entity, KGTriple, TokenInfo, Persona } from "../types"

interface ChatStore {
  // Conversations
  conversations: Conversation[]
  activeConversation: Conversation | null
  setConversations: (convs: Conversation[]) => void
  setActiveConversation: (conv: Conversation | null) => void
  addConversation: (conv: Conversation) => void
  updateConversation: (id: number, data: Partial<Conversation>) => void
  removeConversation: (id: number) => void

  // Messages
  messages: Message[]
  setMessages: (msgs: Message[]) => void
  addMessage: (msg: Message) => void

  // Memory
  entities: Entity[]
  kgTriples: KGTriple[]
  summary: string
  tokenInfo: TokenInfo | null
  setEntities: (entities: Entity[]) => void
  setKgTriples: (triples: KGTriple[]) => void
  setSummary: (summary: string) => void
  setTokenInfo: (info: TokenInfo | null) => void

  // UI State
  isLoading: boolean
  isSidebarOpen: boolean
  isMemoryPanelOpen: boolean
  activeMemoryTab: "entities" | "graph" | "summary" | "tokens"
  setIsLoading: (loading: boolean) => void
  setIsSidebarOpen: (open: boolean) => void
  setIsMemoryPanelOpen: (open: boolean) => void
  setActiveMemoryTab: (tab: "entities" | "graph" | "summary" | "tokens") => void

  // Personas
  personas: Persona[]
  activePersona: Persona | null
  setPersonas: (personas: Persona[]) => void
  setActivePersona: (persona: Persona | null) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  // Conversations
  conversations: [],
  activeConversation: null,
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (activeConversation) => set({ activeConversation }),
  addConversation: (conv) => set((state) => ({
    conversations: [conv, ...state.conversations]
  })),
  updateConversation: (id, data) => set((state) => ({
    conversations: state.conversations.map((c) => c.id === id ? { ...c, ...data } : c),
    activeConversation: state.activeConversation?.id === id
      ? { ...state.activeConversation, ...data }
      : state.activeConversation
  })),
  removeConversation: (id) => set((state) => ({
    conversations: state.conversations.filter((c) => c.id !== id),
    activeConversation: state.activeConversation?.id === id ? null : state.activeConversation
  })),

  // Messages
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),

  // Memory
  entities: [],
  kgTriples: [],
  summary: "",
  tokenInfo: null,
  setEntities: (entities) => set({ entities }),
  setKgTriples: (kgTriples) => set({ kgTriples }),
  setSummary: (summary) => set({ summary }),
  setTokenInfo: (tokenInfo) => set({ tokenInfo }),

  // UI State
  isLoading: false,
  isSidebarOpen: true,
  isMemoryPanelOpen: true,
  activeMemoryTab: "entities",
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setIsMemoryPanelOpen: (isMemoryPanelOpen) => set({ isMemoryPanelOpen }),
  setActiveMemoryTab: (activeMemoryTab) => set({ activeMemoryTab }),

  // Personas
  personas: [],
  activePersona: null,
  setPersonas: (personas) => set({ personas }),
  setActivePersona: (activePersona) => set({ activePersona }),
}))