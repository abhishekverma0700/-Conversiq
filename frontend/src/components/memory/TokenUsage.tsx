import { useChatStore } from "../../stores/chatstore"
import { Gauge, AlertTriangle } from "lucide-react"

export default function TokenUsage() {
  const { tokenInfo } = useChatStore()

  if (!tokenInfo) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[#555] p-4">
        <Gauge size={28} className="mb-2 opacity-30" />
        <p className="text-sm text-center">No token data yet</p>
        <p className="text-xs text-center mt-1">Send a message to see token usage</p>
      </div>
    )
  }

  const percentage = tokenInfo.usage_percentage
  const barColor = percentage > 80 ? "bg-red-500" : percentage > 60 ? "bg-yellow-500" : "bg-[#6C63FF]"

  const segments = [
    {
      label: "System Prompt",
      value: tokenInfo.system_prompt_tokens,
      color: "bg-blue-500",
      textColor: "text-blue-400"
    },
    {
      label: "Memory",
      value: tokenInfo.memory_tokens,
      color: "bg-green-500",
      textColor: "text-green-400"
    },
    {
      label: "Messages",
      value: tokenInfo.recent_message_tokens,
      color: "bg-purple-500",
      textColor: "text-purple-400"
    },
    {
      label: "Reserved",
      value: tokenInfo.generation_reserved,
      color: "bg-gray-500",
      textColor: "text-gray-400"
    },
  ]

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">

      <div className="flex items-center justify-between">
        <span className="text-xs text-[#555] uppercase tracking-wider font-medium">
          Token Budget
        </span>
        {tokenInfo.is_near_limit && (
          <div className="flex items-center gap-1 text-yellow-400 text-xs">
            <AlertTriangle size={12} />
            Near limit
          </div>
        )}
      </div>

      {/* Main Progress Bar */}
      <div className="bg-[#1F1F1F] border border-[#2A2A2A] rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-[#E8E8E8]">
            {tokenInfo.used_tokens.toLocaleString()}
          </span>
          <span className="text-xs text-[#555]">
            / {tokenInfo.total_budget.toLocaleString()} tokens
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#2A2A2A] rounded-full h-3 mb-2">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        <div className="flex justify-between">
          <span className="text-xs text-[#555]">{percentage}% used</span>
          <span className="text-xs text-[#555]">
            {tokenInfo.available_for_generation.toLocaleString()} available
          </span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        <span className="text-xs text-[#555] uppercase tracking-wider font-medium">
          Breakdown
        </span>
        {segments.map((seg) => (
          <div key={seg.label} className="bg-[#1F1F1F] border border-[#2A2A2A] rounded-lg p-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-[#888]">{seg.label}</span>
              <span className={`text-xs font-medium ${seg.textColor}`}>
                {seg.value.toLocaleString()} tokens
              </span>
            </div>
            <div className="w-full bg-[#2A2A2A] rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${seg.color}`}
                style={{ width: `${Math.min((seg.value / tokenInfo.total_budget) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}