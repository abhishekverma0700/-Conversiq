# 🚀 ConversiQ

## 📋 Pull Request Summary

Complete implementation of a **production-grade Conversational AI Platform** with persistent memory, LangChain chains, multi-session context, and knowledge graph visualization — deployed live on Vercel + Render.

---

## 🌐 Live Links

| Service | URL |
|---------|-----|
| 🎨 Frontend (Vercel) | https://conversiq.vercel.app |
| ⚙️ Backend (Render) | https://conversiq-2.onrender.com |
| 📮 Postman Collection | [View API Docs](https://vermaabhishek2791-2818678.postman.co/workspace/verma-abhishek's-Workspace~7f99b154-09bf-444a-8c5f-8c93198fe398/collection/51005825-a47b085b-95b0-428a-9577-0937627cf864?action=share&source=copy-link&creator=51005825) |

---

## ✅ What's Implemented

### 🧠 Memory Types (All 4 Required)

| Memory Type | Status | Description |
|-------------|--------|-------------|
| Buffer Memory | ✅ Working | Full conversation history with token truncation |
| Summary Memory | ✅ Working | Auto-summarizes every N messages (configurable) |
| Entity Memory | ✅ Working | Extracts & tracks people, orgs, projects, dates |
| Knowledge Graph Memory | ✅ Working | Subject-predicate-object triples with graph viz |
| Sequential Chain | ✅ Working | Intent classify → context enrich → generate → update |

---

### ⛓️ LangChain Chain Architecture (LCEL)

- **Simple Chain** — `prompt | llm | StrOutputParser()` for buffer memory
- **Summary Chain** — conversation summary injected into system prompt
- **Entity Chain** — entity context injected, extraction after response
- **KG Chain** — relationship triples injected as context
- **Sequential Chain** — multi-step: intent classification → entity/KG context → response generation

---

### 🗄️ Database (SQLAlchemy + SQLite)

5 tables implemented:
- `conversations` — title, persona_id, memory_type, pinned, archived
- `messages` — role, content, token_count, conversation_id
- `conversation_summaries` — summary_text, messages_covered
- `entities` — name, entity_type, description, source_message_id
- `kg_triples` — subject, predicate, object, source_message_id

---

### 🔌 REST API Endpoints (15+)

| Method | Endpoint | Status |
|--------|----------|--------|
| POST | /api/conversations | ✅ |
| GET | /api/conversations | ✅ |
| GET | /api/conversations/{id} | ✅ |
| PUT | /api/conversations/{id} | ✅ |
| DELETE | /api/conversations/{id} | ✅ |
| POST | /api/conversations/{id}/message | ✅ |
| GET | /api/conversations/{id}/entities | ✅ |
| GET | /api/conversations/{id}/graph | ✅ |
| GET | /api/conversations/{id}/summary | ✅ |
| GET | /api/conversations/{id}/tokens | ✅ |
| GET | /api/personas | ✅ |
| POST | /api/compare/memory | ✅ |
| GET | /api/entities/search | ✅ |
| GET | /api/stats | ✅ |
| GET | /api/health | ✅ |

---

### 🎨 Frontend (React + TypeScript + Tailwind)

- **3-panel layout** — Sidebar + Chat + Memory Inspector
- **5 screens** — Chat, Knowledge Graph, Entities, Personas, Stats
- **Memory Inspector** — 4 tabs: Entities, Graph, Summary, Tokens
- **Knowledge Graph Visualization** — Canvas-based force graph with nodes & edges
- **Token Usage Bar** — Real-time segmented progress bar
- **Animations** — Framer Motion throughout (message entrance, tab switch, sidebar collapse)
- **Responsive** — Desktop (1440px), Tablet (1024px), Mobile (375px)
- **Authentication** — Supabase Auth integration
- **Design** — Professional light theme, Dancing Script cursive logo, purple-teal gradient

---

### 🔐 Authentication
- Supabase Auth (email/password)
- JWT token validation on backend via `SUPABASE_JWT_SECRET`
- Protected routes on frontend

---

### 🤖 Chatbot Personas (5 Built-in)

| Persona | Memory Type | Domain |
|---------|-------------|--------|
| General Assistant | Entity | General |
| Code Helper | KG | Engineering |
| Creative Writer | Buffer | Content |
| Business Analyst | Summary | Business |
| Study Buddy | Sequential | Education |

---

### 📊 Context Window Management

- **Token Budget System** — 4000 total tokens
  - System Prompt: 500
  - Memory: 1000
  - Recent Messages: 1500
  - Generation Reserved: 1000
- Smart truncation — removes oldest messages first
- Auto-summarization trigger at 80% budget
- Real-time token counter in UI

---

## 🛠️ Tech Stack

**Backend:**
- Flask + Flask-CORS + Flask-SQLAlchemy
- LangChain 0.2.16 (LCEL chains)
- LangChain-Groq (LLM provider)
- SQLite + SQLAlchemy ORM
- Gunicorn (production server)
- Deployed on **Render**

**Frontend:**
- React 18 + TypeScript + Vite
- Tailwind CSS
- Framer Motion (animations)
- Recharts (stats visualization)
- Zustand (state management)
- Supabase (authentication)
- Deployed on **Vercel**

---

## 📁 Project Structure

```
Conversiq/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   ├── routes/
│   │   ├── conversations.py
│   │   └── memory.py
│   ├── services/
│   │   ├── buffer_memory.py
│   │   ├── summary__memory.py
│   │   ├── entity_memory.py
│   │   ├── kg_memory.py
│   │   ├── chain_builder.py
│   │   ├── context_manager.py
│   │   └── llm_client.py
│   └── models/
│       └── database.py
└── frontend/
    └── src/
        ├── App.tsx
        ├── components/
        │   ├── chat/
        │   ├── memory/
        │   └── sidebar/
        ├── stores/
        │   └── chatstore.ts
        └── services/
            └── api.ts
```

---

## 🧪 Testing

All APIs tested via Postman — [Collection Link](https://vermaabhishek2791-2818678.postman.co/workspace/verma-abhishek's-Workspace~7f99b154-09bf-444a-8c5f-8c93198fe398/collection/51005825-a47b085b-95b0-428a-9577-0937627cf864)

Tested flows:
- ✅ Create conversation → Send messages → Verify memory persistence
- ✅ Buffer memory — full history in prompt
- ✅ Summary memory — auto-summarization after 5 messages
- ✅ Entity memory — entities extracted & injected
- ✅ KG memory — triples extracted, graph rendered
- ✅ Sequential chain — intent classification working
- ✅ Token budget — real-time counter updating

---

## 🚀 How to Run Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
# Add GROQ_API_KEY in .env
python app.py

# Frontend
cd frontend
npm install
# Add VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY in .env
npm run dev
```

---

## 📝 Assignment Coverage

| Requirement | Status |
|-------------|--------|
| Buffer Memory | ✅ Complete |
| Summary Memory | ✅ Complete |
| Entity Memory | ✅ Complete |
| Knowledge Graph Memory | ✅ Complete |
| Sequential Chain (LCEL) | ✅ Complete |
| Context Window Management | ✅ Complete |
| Persistent Storage (SQLite) | ✅ Complete |
| Multiple Conversations | ✅ Complete |
| 5 Chatbot Personas | ✅ Complete |
| Entity Dashboard | ✅ Complete |
| Knowledge Graph Visualization | ✅ Complete |
| React Frontend | ✅ Complete |
| REST API (15+ endpoints) | ✅ Complete |
| Deployed (Vercel + Render) | ✅ Complete |
| Authentication (Supabase) | ✅ Complete |

---

*Built by Abhishek Verma *
