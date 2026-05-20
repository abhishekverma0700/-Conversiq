import { useEffect, useRef } from "react"
import { useChatStore } from "../../stores/chatstore"
import { Network } from "lucide-react"

export default function KnowledgeGraph() {
  const { kgTriples } = useChatStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || kgTriples.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#1A1A1A"
    ctx.fillRect(0, 0, width, height)

    // Build nodes
    const nodeMap = new Map<string, { x: number; y: number; label: string }>()

    kgTriples.forEach((t) => {
      if (!nodeMap.has(t.subject)) {
        nodeMap.set(t.subject, {
          x: Math.random() * (width - 80) + 40,
          y: Math.random() * (height - 80) + 40,
          label: t.subject,
        })
      }
      if (!nodeMap.has(t.object)) {
        nodeMap.set(t.object, {
          x: Math.random() * (width - 80) + 40,
          y: Math.random() * (height - 80) + 40,
          label: t.object,
        })
      }
    })

    // Draw edges
    kgTriples.forEach((t) => {
      const from = nodeMap.get(t.subject)
      const to = nodeMap.get(t.object)
      if (!from || !to) return

      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.strokeStyle = "#2A2A2A"
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Edge label
      const mx = (from.x + to.x) / 2
      const my = (from.y + to.y) / 2
      ctx.fillStyle = "#555"
      ctx.font = "9px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(t.predicate, mx, my - 4)
    })

    // Draw nodes
    nodeMap.forEach((node) => {
      // Circle
      ctx.beginPath()
      ctx.arc(node.x, node.y, 20, 0, Math.PI * 2)
      ctx.fillStyle = "#6C63FF"
      ctx.fill()
      ctx.strokeStyle = "#00D4AA"
      ctx.lineWidth = 2
      ctx.stroke()

      // Label
      ctx.fillStyle = "#E8E8E8"
      ctx.font = "bold 10px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      const label = node.label.length > 10 ? node.label.substring(0, 10) + ".." : node.label
      ctx.fillText(label, node.x, node.y)
    })

  }, [kgTriples])

  if (kgTriples.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[#555] p-4">
        <Network size={28} className="mb-2 opacity-30" />
        <p className="text-sm text-center">No relationships yet</p>
        <p className="text-xs text-center mt-1">
          Use KG memory type and start chatting to build the graph
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[#555] uppercase tracking-wider font-medium">
          Knowledge Graph
        </span>
        <span className="text-xs bg-[#6C63FF]/20 text-[#6C63FF] px-2 py-0.5 rounded-full border border-[#6C63FF]/30">
          {kgTriples.length} relations
        </span>
      </div>

      {/* Canvas Graph */}
      <div className="flex-1 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={280}
          height={300}
          className="w-full h-full"
        />
      </div>

      {/* Triples List */}
      <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
        {kgTriples.slice(0, 10).map((t) => (
          <div key={t.id} className="flex items-center gap-1 text-xs bg-[#1F1F1F] px-2 py-1.5 rounded-lg border border-[#2A2A2A]">
            <span className="text-blue-400 font-medium truncate max-w-[60px]">{t.subject}</span>
            <span className="text-[#555]">→</span>
            <span className="text-[#6C63FF] truncate max-w-[60px]">{t.predicate}</span>
            <span className="text-[#555]">→</span>
            <span className="text-green-400 font-medium truncate max-w-[60px]">{t.object}</span>
          </div>
        ))}
      </div>
    </div>
  )
}