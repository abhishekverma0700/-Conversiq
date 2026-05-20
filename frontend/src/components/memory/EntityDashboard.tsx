import { useChatStore } from "../../stores/chatstore"
import { Brain, User, Building, FolderOpen, Calendar, Tag } from "lucide-react"

const ENTITY_TYPE_ICONS: Record<string, any> = {
  person: User,
  organization: Building,
  project: FolderOpen,
  date: Calendar,
  general: Tag,
}

const ENTITY_TYPE_COLORS: Record<string, string> = {
  person: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  organization: "text-green-400 bg-green-400/10 border-green-400/20",
  project: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  date: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  general: "text-gray-400 bg-gray-400/10 border-gray-400/20",
}

export default function EntityDashboard() {
  const { entities } = useChatStore()

  if (entities.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[#555] p-4">
        <Brain size={28} className="mb-2 opacity-30" />
        <p className="text-sm text-center">No entities tracked yet</p>
        <p className="text-xs text-center mt-1">
          Use Entity or Sequential memory type and start chatting
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[#555] uppercase tracking-wider font-medium">
          Tracked Entities
        </span>
        <span className="text-xs bg-[#6C63FF]/20 text-[#6C63FF] px-2 py-0.5 rounded-full border border-[#6C63FF]/30">
          {entities.length}
        </span>
      </div>

      {entities.map((entity) => {
        const Icon = ENTITY_TYPE_ICONS[entity.entity_type] || Tag
        const colorClass = ENTITY_TYPE_COLORS[entity.entity_type] || ENTITY_TYPE_COLORS.general

        return (
          <div
            key={entity.id}
            className="bg-[#1F1F1F] border border-[#2A2A2A] rounded-xl p-3 hover:border-[#333] transition-colors"
          >
            {/* Entity Header */}
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1 rounded-lg border ${colorClass}`}>
                <Icon size={12} />
              </div>
              <span className="text-sm font-semibold text-[#E8E8E8] flex-1 truncate">
                {entity.name}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${colorClass}`}>
                {entity.entity_type}
              </span>
            </div>

            {/* Description */}
            {entity.description && (
              <p className="text-xs text-[#888] leading-relaxed">
                {entity.description}
              </p>
            )}

            {/* Updated time */}
            <p className="text-xs text-[#555] mt-2">
              Updated {new Date(entity.updated_at).toLocaleTimeString()}
            </p>
          </div>
        )
      })}
    </div>
  )
}