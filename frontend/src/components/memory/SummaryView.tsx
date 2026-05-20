import { useChatStore } from "../../stores/chatstore"
import { FileText } from "lucide-react"

export default function SummaryView() {
  const { summary} = useChatStore()

  if (!summary) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[#555] p-4">
        <FileText size={28} className="mb-2 opacity-30" />
        <p className="text-sm text-center">No summary yet</p>
        <p className="text-xs text-center mt-1">
          Use Summary memory type. Summary generates after {5} messages.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[#555] uppercase tracking-wider font-medium">
          Conversation Summary
        </span>
      </div>

      <div className="bg-[#1F1F1F] border border-[#2A2A2A] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={14} className="text-[#6C63FF]" />
          <span className="text-xs font-medium text-[#888]">Auto-generated summary</span>
        </div>
        <p className="text-sm text-[#E8E8E8] leading-relaxed">{summary}</p>
      </div>

      <div className="mt-3 p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
        <p className="text-xs text-[#555]">
          Summary is automatically updated every 5 messages to keep context within token limits.
        </p>
      </div>
    </div>
  )
}