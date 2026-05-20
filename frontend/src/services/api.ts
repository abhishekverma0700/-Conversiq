import axios from "axios"
import type { Conversation, Entity, KGTriple, GraphData, TokenInfo, Persona, Stats } from "../types"

const api = axios.create({
  baseURL: "http://localhost:5000",
  headers: { "Content-Type": "application/json" } 
})

// ── Conversations ──
export const conversationsApi = {
  list: () => api.get<Conversation[]>("/api/conversations"),
  create: (data: { title?: string; persona_id?: string; memory_type?: string }) =>
    api.post<Conversation>("/api/conversations", data),
  get: (id: number) => api.get<Conversation>("/api/conversations/" + id),
  update: (id: number, data: Partial<Conversation>) =>
    api.put<Conversation>("/api/conversations/" + id, data),
  delete: (id: number) => api.delete("/api/conversations/" + id),
}

// ── Messages ──
export const messagesApi = {
  send: (convId: number, message: string) =>
    api.post("/api/conversations/" + convId + "/message", { message }),
  getTokenInfo: (convId: number) =>
    api.get<TokenInfo>("/api/conversations/" + convId + "/tokens"),
}

// ── Memory ──
export const memoryApi = {
  getEntities: (convId: number) =>
    api.get<{ entities: Entity[]; total: number }>("/api/conversations/" + convId + "/entities"),
  getGraph: (convId: number) =>
    api.get<{ triples: KGTriple[]; graph: GraphData; total: number }>("/api/conversations/" + convId + "/graph"),
  getSummary: (convId: number) =>
    api.get("/api/conversations/" + convId + "/summary"),
  compareMemory: (data: { conversation_id: number; test_message: string; memory_type_a: string; memory_type_b: string }) =>
    api.post("/api/compare/memory", data),
  getStats: () => api.get<Stats>("/api/stats"),
}

// ── Personas ──
export const personasApi = {
  list: () => api.get<Persona[]>("/api/personas"),
  create: (data: Partial<Persona>) => api.post<Persona>("/api/personas", data),
  get: (id: string) => api.get<Persona>("/api/personas/" + id),
  update: (id: string, data: Partial<Persona>) =>
    api.put<Persona>("/api/personas/" + id, data),
  delete: (id: string) => api.delete("/api/personas/" + id),
}

export default api