'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageBubble } from './message-bubble'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2, Phone, MoreVertical, Image as ImageIcon, Bot } from 'lucide-react'
import { getMessagesAction, sendChatMessageAction } from '@/actions/chat'
import { toggleConversationAIAction } from '@/actions/ai'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { REALTIME_NEW_MESSAGE_EVENT } from './realtime-listener'

interface ChatWindowProps {
  conversationId: string
  contactName: string
  contactPhone: string
  isAIActive?: boolean
}

export function ChatWindow({ conversationId, contactName, contactPhone, isAIActive: initialAIActive = false }: ChatWindowProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [aiActive, setAiActive] = useState(initialAIActive)
  const [togglingAI, setTogglingAI] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async () => {
    const res = await getMessagesAction(conversationId)
    if (res.success) {
      setMessages(res.data)
    }
    setLoading(false)
    scrollToBottom()
  }, [conversationId])

  useEffect(() => {
    setLoading(true)
    fetchMessages()
  }, [fetchMessages])

  // I1-FIX: Listen for realtime new message events from RealtimeListener
  useEffect(() => {
    function handleNewMessage(e: Event) {
      const event = e as CustomEvent
      if (event.detail?.conversationId === conversationId) {
        fetchMessages()
      }
    }
    window.addEventListener(REALTIME_NEW_MESSAGE_EVENT, handleNewMessage)
    return () => window.removeEventListener(REALTIME_NEW_MESSAGE_EVENT, handleNewMessage)
  }, [conversationId, fetchMessages])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  async function handleToggleAI(checked: boolean) {
    setTogglingAI(true)
    setAiActive(checked)
    await toggleConversationAIAction(conversationId, checked)
    setTogglingAI(false)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || sending) return

    const textToSend = inputText.trim()
    setInputText('') // Optimistic clear
    setSending(true)

    // Add optimistic message
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      content: textToSend,
      direction: 'outbound',
      status: 'sending',
      sent_at: new Date().toISOString()
    }])
    scrollToBottom()

    const res = await sendChatMessageAction(conversationId, textToSend)
    
    if (!res.success) {
      // Si falla, podríamos marcar el mensaje como fallido en UI
      console.error(res.error)
    } else {
      // Re-fetch para tener el id real y timestamps
      await fetchMessages()
    }
    
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-background">
      {/* Header */}
      <div className="h-16 border-b flex items-center justify-between px-6 bg-white dark:bg-muted/30 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {contactName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold">{contactName}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" /> {contactPhone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-sm">
                  <Bot className={`w-4 h-4 ${aiActive ? 'text-violet-500' : 'text-muted-foreground'}`} />
                  <Switch
                    checked={aiActive}
                    onCheckedChange={handleToggleAI}
                    disabled={togglingAI}
                    aria-label="Toggle AI"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {aiActive ? 'IA activa — click para desactivar y tomar control manual' : 'IA inactiva — click para reactivar la respuesta automática'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50 dark:bg-background/50">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center p-6 bg-white dark:bg-muted/50 rounded-xl shadow-sm border border-border/50 max-w-sm">
              <p className="text-muted-foreground text-sm">
                No hay mensajes previos con este contacto. Envía el primer mensaje para iniciar la conversación.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-muted/30 border-t">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
            <ImageIcon className="w-5 h-5" />
          </Button>
          <div className="flex-1 relative">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="w-full bg-muted/50 border-transparent focus-visible:ring-1 focus-visible:ring-primary/30 shadow-none px-4 py-6 rounded-xl"
              autoComplete="off"
            />
          </div>
          <Button 
            type="submit" 
            disabled={!inputText.trim() || sending}
            className="shrink-0 h-12 w-12 rounded-xl"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </form>
      </div>
    </div>
  )
}
