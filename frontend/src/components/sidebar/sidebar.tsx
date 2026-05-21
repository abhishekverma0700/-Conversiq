import { useState } from "react"
import { useChatStore } from "../../stores/chatstore"
import { conversationsApi } from "../../services/api"
import {
  Plus, Search, Pin, Trash2,
  MessageSquare, ChevronDown
} from "lucide-react"
import type { Conversation } from "../../types"

const MEMORY_DOTS: Record<string, string> = {
  buffer: "bg-blue-400",
  summary: "bg-yellow-400",
  entity: "bg-green-400",
  kg: "bg-purple-400",
  sequential: "bg-orange-400",
}

export default function Sidebar() {
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    setMessages,
    addConversation,
    updateConversation,
    removeConversation,
    setEntities,
    setKgTriples,
    setSummary,
    setTokenInfo,
    personas,
    setActivePersona,
  } = useChatStore()

  const [search, setSearch] = useState("")
  const [showNewForm, setShowNewForm] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newMemoryType, setNewMemoryType] = useState("buffer")
  const [newPersonaId, setNewPersonaId] = useState("general_assistant")

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  const pinned = filtered.filter((c) => c.is_pinned)
  const unpinned = filtered.filter((c) => !c.is_pinned && !c.is_archived)

  const handleSelectConversation = async (conv: Conversation) => {
    try {
      const res = await conversationsApi.get(conv.id)
      setActiveConversation(res.data)
      setMessages(res.data.messages || [])
      setEntities([])
      setKgTriples([])
      setSummary("")
      setTokenInfo(null)
      const persona = personas.find((p) => p.id === conv.persona_id)
      if (persona) setActivePersona(persona)
    } catch (err) {
      console.error(err)
    }
  }

  const handleNewConversation = async () => {
    if (!newTitle.trim()) return
    try {
      const res = await conversationsApi.create({
        title: newTitle,
        memory_type: newMemoryType,
        persona_id: newPersonaId || "general_assistant",
      })

      addConversation(res.data)

      // Detail fetch karo aur active karo
      const detailRes = await conversationsApi.get(res.data.id)
      setActiveConversation(detailRes.data)
      setMessages(detailRes.data.messages || [])
      setEntities([])
      setKgTriples([])
      setSummary("")
      setTokenInfo(null)

      const persona = personas.find(
        (p) => p.id === (newPersonaId || "general_assistant")
      )
      if (persona) setActivePersona(persona)

      setNewTitle("")
      setShowNewForm(false)
    } catch (err) {
      console.error("Create error:", err)
    }
  }

  const handlePin = async (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation()
    try {
      await conversationsApi.update(conv.id, { is_pinned: !conv.is_pinned })
      updateConversation(conv.id, { is_pinned: !conv.is_pinned })
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation()
    if (!confirm("Delete this conversation?")) return
    try {
      await conversationsApi.delete(conv.id)
      removeConversation(conv.id)
      if (activeConversation?.id === conv.id) {
        setActiveConversation(null)
        setMessages([])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const ConversationItem = ({ conv }: { conv: Conversation }) => (
    <div
      onClick={() => handleSelectConversation(conv)}
      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
        activeConversation?.id === conv.id
          ? "bg-[#6C63FF]/20 border border-[#6C63FF]/30"
          : "hover:bg-[#1F1F1F] border border-transparent"
      }`}
    >
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${MEMORY_DOTS[conv.memory_type] || "bg-gray-400"}`} />

      <div className="flex-1 min-w-0">
        <p className="text-sm truncate font-medium">{conv.title}</p>
        <p className="text-xs text-[#888] truncate">
          {conv.message_count} messages • {conv.memory_type}
        </p>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => handlePin(e, conv)}
          className={`p-1 rounded hover:bg-[#2A2A2A] ${conv.is_pinned ? "text-yellow-400" : "text-[#888]"}`}
        >
          <Pin size={12} />
        </button>
        <button
          onClick={(e) => handleDelete(e, conv)}
          className="p-1 rounded hover:bg-red-500/20 text-[#888] hover:text-red-400"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )

  return (
    <div className="h-full bg-[#141414] flex flex-col">

      <div className="p-4 border-b border-[#2A2A2A]">
        <div className="flex items-center gap-2 bg-[#1F1F1F] rounded-lg px-3 py-2 border border-[#2A2A2A]">
          <Search size={14} className="text-[#888]" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm flex-1 outline-none placeholder-[#555] text-[#E8E8E8]"
          />
        </div>
      </div>

      <div className="px-3 py-2">
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          New Conversation
          <ChevronDown size={14} className={`ml-auto transition-transform ${showNewForm ? "rotate-180" : ""}`} />
        </button>

        {showNewForm && (
          <div className="mt-2 p-3 bg-[#1F1F1F] rounded-lg border border-[#2A2A2A] space-y-2">
            <input
              type="text"
              placeholder="Conversation title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNewConversation()}
              className="w-full bg-[#2A2A2A] text-sm px-3 py-2 rounded-lg outline-none placeholder-[#555] text-[#E8E8E8] border border-[#333]"
            />

            <select
              value={newMemoryType}
              onChange={(e) => setNewMemoryType(e.target.value)}
              className="w-full bg-[#2A2A2A] text-sm px-3 py-2 rounded-lg outline-none text-[#E8E8E8] border border-[#333]"
            >
              <option value="buffer">Buffer Memory</option>
              <option value="summary">Summary Memory</option>
              <option value="entity">Entity Memory</option>
              <option value="kg">Knowledge Graph</option>
              <option value="sequential">Sequential Chain</option>
            </select>

            <select
              value={newPersonaId}
              onChange={(e) => setNewPersonaId(e.target.value)}
              className="w-full bg-[#2A2A2A] text-sm px-3 py-2 rounded-lg outline-none text-[#E8E8E8] border border-[#333]"
            >
              {personas.length > 0 ? (
                personas.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))
              ) : (
                <option value="general_assistant">General Assistant</option>
              )}
            </select>

            <button
              onClick={handleNewConversation}
              className="w-full py-2 bg-[#6C63FF] hover:bg-[#5A52E0] text-white text-sm rounded-lg transition-colors font-medium"
            >
              Create
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">

        {pinned.length > 0 && (
          <div className="mb-2">
            <p className="text-xs text-[#555] px-3 py-1 uppercase tracking-wider font-medium">
              Pinned
            </p>
            {pinned.map((conv) => (
              <ConversationItem key={conv.id} conv={conv} />
            ))}
          </div>
        )}

        {unpinned.length > 0 && (
          <div>
            <p className="text-xs text-[#555] px-3 py-1 uppercase tracking-wider font-medium">
              Recent
            </p>
            {unpinned.map((conv) => (
              <ConversationItem key={conv.id} conv={conv} />
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-[#555]">
            <MessageSquare size={32} className="mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs">Create one to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}