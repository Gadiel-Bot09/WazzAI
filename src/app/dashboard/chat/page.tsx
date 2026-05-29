import { Suspense } from 'react'
import { getConversationsAction } from '@/actions/chat'
import { ChatLayout } from '@/components/chat/chat-layout'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Mensajes | WazzAI',
}

async function ChatDataFetcher() {
  const res = await getConversationsAction()

  if (!res.success) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        Error al cargar las conversaciones.
      </div>
    )
  }

  return <ChatLayout initialConversations={res.data.conversations} showAssignedAgent={res.data.showAssignedAgent} />
}

export default function ChatPage() {
  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background">
      <Suspense fallback={
        <div className="flex w-full h-full items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }>
        <ChatDataFetcher />
      </Suspense>
    </div>
  )
}
