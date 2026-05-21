import { useEffect } from "react"
import { useChatStore } from "../../stores/chatstore"
import { Brain, Network, FileText, Gauge } from "lucide-react"
import { memoryApi, messagesApi } from "../../services/api"
import EntityDashboard from "./EntityDashboard"
import KnowledgeGraph from "./KnowledgeGraph"
import SummaryView from "./SummaryView"
import TokenUsage from "./TokenUsage"

const TABS = [
  { id: "entities", label: "Entities", icon: Brain },
  { id: "graph", label: "Graph", icon: Network },
  { id: "summary", label: "Summary", icon: FileText },
  { id: "tokens", label: "Tokens", icon: Gauge },
] as const

export default function MemoryPanel() {
  const {
    activeMemoryTab,
    setActiveMemoryTab,
    activeConversation,
    setEntities,
    setKgTriples,
    setSummary,
    setTokenInfo,
    entities,
    kgTriples,
  } = useChatStore()

  // Conversation change hone pe memory fetch karo
  useEffect(() => {
    if (!activeConversation) return
    fetchAllMemory(activeConversation.id)
  }, [activeConversation?.id])

  const fetchAllMemory = async (convId: number) => {
  try {
    console.log("Fetching memory for conv:", convId)

    const entitiesRes = await memoryApi.getEntities(convId)
    console.log("Entities:", entitiesRes.data)
    setEntities(entitiesRes.data.entities || [])

    const graphRes = await memoryApi.getGraph(convId)
    console.log("Graph:", graphRes.data)
    setKgTriples(graphRes.data.triples || [])

    const tokenRes = await messagesApi.getTokenInfo(convId)
    console.log("Tokens:", tokenRes.data)
    setTokenInfo(tokenRes.data)

    const summaryRes = await memoryApi.getSummary(convId)
    console.log("Summary:", summaryRes.data)
    if (summaryRes.data?.summary_text) {
      setSummary(summaryRes.data.summary_text)
    }

  } catch (err) {
    console.error("Memory fetch error:", err)
  }
}
      

  if (!activeConversation) {
    return (
      <div className="h-full bg-[#141414] flex items-center justify-center text-[#555]">
        <div className="text-center">
          <Brain size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Select a conversation</p>
          <p className="text-xs">to view memory</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-[#141414] flex flex-col">

      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2A2A2A] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#E8E8E8] flex items-center gap-2">
          <Brain size={14} className="text-[#6C63FF]" />
          Memory Inspector
        </h3>
        {/* Live counts */}
        <div className="flex gap-2">
          <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20">
            {entities.length} entities
          </span>
          <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
            {kgTriples.length} relations
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2A2A2A]">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveMemoryTab(tab.id)
                fetchAllMemory(activeConversation.id)
              }}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                activeMemoryTab === tab.id
                  ? "text-[#6C63FF] border-b-2 border-[#6C63FF]"
                  : "text-[#555] hover:text-[#888]"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeMemoryTab === "entities" && <EntityDashboard />}
        {activeMemoryTab === "graph" && <KnowledgeGraph />}
        {activeMemoryTab === "summary" && <SummaryView />}
        {activeMemoryTab === "tokens" && <TokenUsage />}
      </div>
    </div>
  )
}