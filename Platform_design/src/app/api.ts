const API_BASE = "http://localhost:5000/api";

export type AuthRequestContext = {
  accessToken?: string | null;
  userId?: string | null;
};

function buildAuthHeaders(auth?: AuthRequestContext): HeadersInit {
  return {
    Authorization: `Bearer ${auth?.accessToken || ""}`,
    "X-User-Id": auth?.userId || "",
  };
}

export const api = {
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

  listPersonas: async (auth?: AuthRequestContext) => {
    const res = await fetch(`${API_BASE}/personas`, {
      headers: buildAuthHeaders(auth),
    });
    if (!res.ok) throw new Error("Failed to fetch personas");
    return res.json();
  },

  createPersona: async (data: object, auth?: AuthRequestContext) => {
    const res = await fetch(`${API_BASE}/personas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...buildAuthHeaders(auth) },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create persona");
    return res.json();
  },

  deletePersona: async (id: string, auth?: AuthRequestContext) => {
    const res = await fetch(`${API_BASE}/personas/${id}`, {
      method: "DELETE",
      headers: buildAuthHeaders(auth),
    });
    if (!res.ok) throw new Error("Failed to delete persona");
    return res.json();
  },

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

  health: async (auth?: AuthRequestContext) => {
    const res = await fetch(`${API_BASE}/health`, {
      headers: buildAuthHeaders(auth),
    });
    return res.json();
  },
};

export { API_BASE };
