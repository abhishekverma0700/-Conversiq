import { useChatStore } from "../../stores/chatstore"
import { Gauge, AlertTriangle, RefreshCw } from "lucide-react"
import { messagesApi } from "../../services/api"

export default function TokenUsage() {
  const { tokenInfo, activeConversation, setTokenInfo } = useChatStore()

  const handleRefresh = async () => {
    if (!activeConversation) return
    try {
      const res = await messagesApi.getTokenInfo(activeConversation.id)
      setTokenInfo(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  if (!tokenInfo) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[#555] p-4">
        <Gauge size={28} className="mb-2 opacity-30" />
        <p className="text-sm text-center">No token data yet</p>
        <p className="text-xs text-center mt-1">Send a message to see token usage</p>
        <button
          onClick={handleRefresh}
          className="mt-3 px-3 py-1.5 bg-[#1F1F1F] border border-[#2A2A2A] rounded-lg text-xs text-[#888] hover:text-[#E8E8E8] flex items-center gap-1"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>
    )
  }

  const percentage = tokenInfo.usage_percentage || 0
  const barColor = percentage > 80
    ? "bg-red-500"
    : percentage > 60
    ? "bg-yellow-500"
    : "bg-[#6C63FF]"

  const segments = [
    {
      label: "System Prompt",
      value: tokenInfo.system_prompt_tokens || 0,
      color: "bg-blue-500",
      textColor: "text-blue-400"
    },
    {
      label: "Memory",
      value: tokenInfo.memory_tokens || 0,
      color: "bg-green-500",
      textColor: "text-green-400"
    },
    {
      label: "Messages",
      value: tokenInfo.recent_message_tokens || 0,
      color: "bg-purple-500",
      textColor: "text-purple-400"
    },
    {
      label: "Reserved",
      value: tokenInfo.generation_reserved || 0,
      color: "bg-gray-500",
      textColor: "text-gray-400"
    },
  ]

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#555] uppercase tracking-wider font-medium">
          Token Budget
        </span>
        <div className="flex items-center gap-2">
          {tokenInfo.is_near_limit && (
            <div className="flex items-center gap-1 text-yellow-400 text-xs">
              <AlertTriangle size={12} />
              Near limit
            </div>
          )}
          <button
            onClick={handleRefresh}
            className="p-1 rounded hover:bg-[#2A2A2A] text-[#555] hover:text-[#888]"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Main Progress Bar */}
      <div className="bg-[#1F1F1F] border border-[#2A2A2A] rounded-xl p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-lg font-bold text-[#E8E8E8]">
            {(tokenInfo.used_tokens || 0).toLocaleString()}
          </span>
          <span className="text-xs text-[#555]">
            / {(tokenInfo.total_budget || 4000).toLocaleString()} tokens
          </span>
        </div>

        <div className="w-full bg-[#2A2A2A] rounded-full h-4 mb-2">
          <div
            className={`h-4 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        <div className="flex justify-between">
          <span className={`text-xs font-medium ${
            percentage > 80 ? "text-red-400" :
            percentage > 60 ? "text-yellow-400" : "text-[#6C63FF]"
          }`}>
            {percentage}% used
          </span>
          <span className="text-xs text-[#555]">
            {(tokenInfo.available_for_generation || 0).toLocaleString()} available
          </span>
        </div>
      </div>

      {/* Breakdown */}
      <p className="text-xs text-[#555] uppercase tracking-wider font-medium">
        Breakdown
      </p>

      {segments.map((seg) => (
        <div key={seg.label} className="bg-[#1F1F1F] border border-[#2A2A2A] rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-[#888]">{seg.label}</span>
            <span className={`text-xs font-bold ${seg.textColor}`}>
              {seg.value.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-[#2A2A2A] rounded-full h-2">
            <div
              className={`h-2 rounded-full ${seg.color}`}
              style={{
                width: `${Math.min(
                  ((seg.value / (tokenInfo.total_budget || 4000)) * 100),
                  100
                )}%`
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}