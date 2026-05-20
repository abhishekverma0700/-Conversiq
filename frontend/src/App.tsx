import { useEffect } from "react"
import { useChatStore } from "./stores/chatStore"
import { conversationsApi, personasApi } from "./services/api"
import Sidebar from "./components/sidebar/Sidebar"
import ChatWindow from "./components/chat/ChatWindow"
import MemoryPanel from "./components/memory/MemoryPanel"
import TopBar from "./components/ui/TopBar"

function App() {
  const {
    setConversations,
    setPersonas,
    setActivePersona,
    setActiveConversation,
    setMessages,
    isSidebarOpen,
    isMemoryPanelOpen,
  } = useChatStore()

  useEffect(() => {
    const init = async () => {
      try {
        const [convsRes, personasRes] = await Promise.all([
          conversationsApi.list(),
          personasApi.list(),
        ])

        // Conversations set karo
        setConversations(convsRes.data)

        // Personas set karo
        setPersonas(personasRes.data)
        if (personasRes.data.length > 0) {
          setActivePersona(personasRes.data[0])
        }

        // Pehli conversation auto-load karo
        if (convsRes.data.length > 0) {
          const first = convsRes.data[0]
          const detailRes = await conversationsApi.get(first.id)
          setActiveConversation(detailRes.data)
          setMessages(detailRes.data.messages || [])

          // Persona match karo
          const persona = personasRes.data.find(
            (p: any) => p.id === first.persona_id
          )
          if (persona) setActivePersona(persona)
        }

      } catch (err) {
        console.error("Init error:", err)
      }
    }
    init()
  }, [])

  return (
    <div className="flex flex-col h-screen bg-[#0F0F0F] text-[#E8E8E8] overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {isSidebarOpen && (
          <div className="w-64 flex-shrink-0 border-r border-[#2A2A2A]">
            <Sidebar />
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <ChatWindow />
        </div>
        {isMemoryPanelOpen && (
          <div className="w-80 flex-shrink-0 border-l border-[#2A2A2A]">
            <MemoryPanel />
          </div>
        )}
      </div>
    </div>
  )
}

export default App