import { useState, useRef, useEffect } from "react"
import { useChatStore } from "../../stores/chatstore"
import { messagesApi, memoryApi } from "../../services/api"
import { Send, Bot, User, Zap, MessageSquare } from "lucide-react"
import ReactMarkdown from "react-markdown"
import type { Message } from "../../types"

export default function ChatWindow() {
  const {
    activeConversation,
    messages,
    addMessage,
    isLoading,
    setIsLoading,
    setEntities,
    setKgTriples,
    setSummary,
    setTokenInfo,
    activePersona,
  } = useChatStore()

  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const refreshMemory = async (convId: number) => {
    try {
      const entitiesRes = await memoryApi.getEntities(convId)
      setEntities(entitiesRes.data.entities || [])

      const graphRes = await memoryApi.getGraph(convId)
      setKgTriples(graphRes.data.triples || [])

      const tokenRes = await messagesApi.getTokenInfo(convId)
      setTokenInfo(tokenRes.data)

      const summaryRes = await memoryApi.getSummary(convId)
      if (summaryRes.data?.summary_text) {
        setSummary(summaryRes.data.summary_text)
      }
    } catch (err) {
      console.error("Memory refresh error:", err)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || !activeConversation || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setIsLoading(true)

    // User message optimistically add karo
    const tempUserMsg: Message = {
      id: Date.now(),
      conversation_id: activeConversation.id,
      role: "user",
      content: userMessage,
      token_count: 0,
      created_at: new Date().toISOString(),
    }
    addMessage(tempUserMsg)

    try {
      const res = await messagesApi.send(activeConversation.id, userMessage)

      // AI response add karo
      const aiMsg: Message = {
        id: Date.now() + 1,
        conversation_id: activeConversation.id,
        role: "assistant",
        content: res.data.response,
        token_count: 0,
        created_at: new Date().toISOString(),
      }
      addMessage(aiMsg)

      // Token info update
      if (res.data.token_info) {
        setTokenInfo(res.data.token_info)
      }

      // Memory refresh
      await refreshMemory(activeConversation.id)

    } catch (err) {
      console.error("Send error:", err)
      const errMsg: Message = {
        id: Date.now() + 1,
        conversation_id: activeConversation.id,
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        token_count: 0,
        created_at: new Date().toISOString(),
      }
      addMessage(errMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!activeConversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#1A1A1A] text-[#888]">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] flex items-center justify-center mb-4">
          <Zap size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-[#E8E8E8] mb-2">Welcome to Conversiq</h2>
        <p className="text-sm text-center max-w-xs">
          Select a conversation from the sidebar or create a new one to get started
        </p>
        <div className="mt-6 flex gap-3 flex-wrap justify-center">
          {["Buffer", "Summary", "Entity", "KG"].map((type) => (
            <div key={type} className="px-3 py-1.5 bg-[#1F1F1F] rounded-full border border-[#2A2A2A] text-xs text-[#888]">
              {type} Memory
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#1A1A1A]">

      {/* Chat Header */}
      <div className="px-6 py-3 border-b border-[#2A2A2A] flex items-center gap-3 bg-[#141414]">
        <MessageSquare size={16} className="text-[#6C63FF]" />
        <h2 className="font-semibold text-sm flex-1 truncate">
          {activeConversation.title}
        </h2>
        <div className="text-xs text-[#555]">
          {messages.length} messages
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-[#555]">
            <Bot size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Start the conversation!</p>
            <p className="text-xs mt-1">
              Using {activePersona?.name || "General Assistant"} with{" "}
              {activeConversation.memory_type} memory
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Loading dots */}
        {isLoading && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-[#1F1F1F] border border-[#2A2A2A] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-5">
                <div className="w-2 h-2 bg-[#6C63FF] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-[#6C63FF] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-[#6C63FF] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 py-4 border-t border-[#2A2A2A] bg-[#141414]">
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-xs text-[#555]">
            {activePersona?.name || "General Assistant"} •
          </span>
          <span className="text-xs text-[#555]">
            {activeConversation.memory_type} memory
          </span>
          <span className="text-xs text-[#555] ml-auto">
            Shift+Enter for new line
          </span>
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex-1 bg-[#1F1F1F] border border-[#2A2A2A] rounded-2xl px-4 py-3 focus-within:border-[#6C63FF]/50 transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full bg-transparent text-sm outline-none resize-none placeholder-[#555] text-[#E8E8E8] max-h-32"
              style={{ lineHeight: "1.5" }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"

  return (
    <div className={`flex gap-3 items-start ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser
          ? "bg-[#2A2A2A] border border-[#333]"
          : "bg-gradient-to-br from-[#6C63FF] to-[#00D4AA]"
      }`}>
        {isUser
          ? <User size={14} className="text-[#888]" />
          : <Bot size={14} className="text-white" />
        }
      </div>

      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
        isUser
          ? "bg-[#6C63FF]/20 border border-[#6C63FF]/30 rounded-tr-sm text-[#E8E8E8]"
          : "bg-[#1F1F1F] border border-[#2A2A2A] rounded-tl-sm text-[#E8E8E8]"
      }`}>
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}