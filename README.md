# ConversiQ — Conversational AI Platform

A production-grade AI chatbot platform with persistent memory, 
LangChain chains, and knowledge graph visualization.

## Live Demo
- Frontend: https://conversiq.vercel.app
- Backend: https://conversiq-2.onrender.com

## Tech Stack
**Backend:** Flask, LangChain 0.2, Groq/LLaMA, SQLite, SQLAlchemy, Gunicorn  
**Frontend:** React 18, TypeScript, Tailwind CSS, Framer Motion, Supabase Auth  
**Deployed:** Vercel (frontend) + Render (backend)

## Memory Types
- **Buffer Memory** — Full conversation history, truncated at token limit
- **Summary Memory** — Auto-summarizes every 5 messages
- **Entity Memory** — Extracts and tracks people, orgs, projects, dates
- **Knowledge Graph** — Subject-predicate-object relationship triples
- **Sequential Chain** — Intent classification → context enrichment → response

## Local Setup

### Backend
cd backend
pip install -r requirements.txt
# Create .env file with required variables
python app.py

### Frontend
cd Platform_design
npm install
npm run dev

## Environment Variables

### Backend (.env)
GROQ_API_KEY=your_groq_api_key
FLASK_SECRET_KEY=your_secret_key
FLASK_DEBUG=True
DATABASE_URL=sqlite:///conversational_ai.db
SUMMARY_INTERVAL=5
MAX_BUFFER_MESSAGES=20
TOKEN_BUDGET=4000

### Frontend (.env)
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

## API Endpoints
- POST /api/conversations
- GET /api/conversations
- POST /api/conversations/{id}/message
- GET /api/conversations/{id}/entities
- GET /api/conversations/{id}/graph
- GET /api/conversations/{id}/summary
- GET /api/conversations/{id}/tokens
- GET /api/personas
- GET /api/stats
- GET /api/health