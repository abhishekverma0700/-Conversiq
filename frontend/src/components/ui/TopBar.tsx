import { useChatStore } from "../../stores/chatstore"
import { PanelLeft, PanelRight, Bot, Zap } from "lucide-react"

const MEMORY_COLORS: Record<string, string> = {
  buffer: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  summary: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  entity: "bg-green-500/20 text-green-400 border-green-500/30",
  kg: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  sequential: "bg-orange-500/20 text-orange-400 border-orange-500/30",
}

const MEMORY_LABELS: Record<string, string> = {
  buffer: "Buffer",
  summary: "Summary",
  entity: "Entity",
  kg: "Knowledge Graph",
  sequential: "Sequential",
}

export default function TopBar() {
  const {
    activeConversation,
    activePersona,
    isSidebarOpen,
    isMemoryPanelOpen,
    setIsSidebarOpen,
    setIsMemoryPanelOpen,
  } = useChatStore()

  const memoryType = activeConversation?.memory_type || "buffer"

  return (
    <div className="h-14 bg-[#141414] border-b border-[#2A2A2A] flex items-center px-4 gap-4 flex-shrink-0">

      {/* Left: Sidebar toggle + Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1.5 rounded-lg hover:bg-[#2A2A2A] transition-colors text-[#888]"
        >
          <PanelLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-bold text-sm bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] bg-clip-text text-transparent">
            Conversiq
          </span>
        </div>
      </div>

      {/* Center: Active persona + memory type */}
      <div className="flex-1 flex items-center justify-center gap-3">
        {activePersona && (
          <div className="flex items-center gap-2 bg-[#1F1F1F] px-3 py-1.5 rounded-full border border-[#2A2A2A]">
            <Bot size={14} className="text-[#6C63FF]" />
            <span className="text-xs font-medium">{activePersona.name}</span>
          </div>
        )}

        {activeConversation && (
          <div className={`text-xs px-3 py-1 rounded-full border font-medium ${MEMORY_COLORS[memoryType]}`}>
            {MEMORY_LABELS[memoryType]} Memory
          </div>
        )}
      </div>

      {/* Right: Memory panel toggle */}
      <button
        onClick={() => setIsMemoryPanelOpen(!isMemoryPanelOpen)}
        className="p-1.5 rounded-lg hover:bg-[#2A2A2A] transition-colors text-[#888]"
      >
        <PanelRight size={18} />
      </button>
    </div>
  )
}