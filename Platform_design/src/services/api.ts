import axios from "axios"

// Backend ka URL
const BASE_URL = "https://conversiq-2.onrender.com/api"

type AuthRequestContext = {
  accessToken?: string | null
  userId?: string | null
}

function authHeaders(auth?: AuthRequestContext) {
  const headers: Record<string, string> = {}

  if (auth?.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`
  }

  if (auth?.userId) {
    headers["X-User-Id"] = auth.userId
  }

  return headers
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" }
})

// ── Conversations ──
export const conversationsApi = {
  list: (auth?: AuthRequestContext) => api.get("/api/conversations", { headers: authHeaders(auth) }),
  create: (data: { title: string; persona_id: string; memory_type: string; user_id?: string }, auth?: AuthRequestContext) =>
    api.post("/api/conversations", data, { headers: authHeaders(auth) }),
  get: (id: number, auth?: AuthRequestContext) => api.get(`/api/conversations/${id}`, { headers: authHeaders(auth) }),
  update: (id: number, data: any, auth?: AuthRequestContext) => api.put(`/api/conversations/${id}`, data, { headers: authHeaders(auth) }),
  delete: (id: number, auth?: AuthRequestContext) => api.delete(`/api/conversations/${id}`, { headers: authHeaders(auth) }),
}

// ── Messages ──
export const messagesApi = {
  send: (convId: number, message: string, auth?: AuthRequestContext) =>
    api.post(`/api/conversations/${convId}/message`, { message }, { headers: authHeaders(auth) }),
  getTokenInfo: (convId: number, auth?: AuthRequestContext) =>
    api.get(`/api/conversations/${convId}/tokens`, { headers: authHeaders(auth) }),
}

// ── Memory ──
export const memoryApi = {
  getEntities: (convId: number, auth?: AuthRequestContext) =>
    api.get(`/api/conversations/${convId}/entities`, { headers: authHeaders(auth) }),
  getGraph: (convId: number, auth?: AuthRequestContext) =>
    api.get(`/api/conversations/${convId}/graph`, { headers: authHeaders(auth) }),
  getSummary: (convId: number, auth?: AuthRequestContext) =>
    api.get(`/api/conversations/${convId}/summary`, { headers: authHeaders(auth) }),
  getStats: (auth?: AuthRequestContext) => api.get("/api/stats", { headers: authHeaders(auth) }),
  compareMemory: (data: any, auth?: AuthRequestContext) => api.post("/api/compare/memory", data, { headers: authHeaders(auth) }),
  searchEntities: (query: string, auth?: AuthRequestContext) => api.get(`/api/entities/search?q=${encodeURIComponent(query)}`, { headers: authHeaders(auth) }),
}

// ── Personas ──
export const personasApi = {
  list: () => api.get("/api/personas"),
  create: (data: any) => api.post("/api/personas", data),
  update: (id: string, data: any) => api.put(`/api/personas/${id}`, data),
  delete: (id: string) => api.delete(`/api/personas/${id}`),
}

export default api