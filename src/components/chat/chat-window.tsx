'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageBubble } from './message-bubble'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2, Phone, Image as ImageIcon, Bot, Lock } from 'lucide-react'
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
import { ConversationActionsMenu } from './conversation-actions-menu'
import { CannedMessagePicker } from './canned-message-picker'

interface ChatWindowProps {
  conversationId: string
  contactName: string
  contactPhone: string
  isAIActive?: boolean
  status?: 'open' | 'closed' | 'pending'
  assignedUser?: { full_name: string, avatar_url: string } | null
  showAssignedAgent?: boolean
  currentUser?: any
}

export function ChatWindow({
  conversationId,
  contactName,
  contactPhone,
  isAIActive: initialAIActive = false,
  status: initialStatus = 'open',
  assignedUser,
  showAssignedAgent = false,
  currentUser,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [aiActive, setAiActive] = useState(initialAIActive)
  const [togglingAI, setTogglingAI] = useState(false)
  const [convStatus, setConvStatus] = useState<'open' | 'closed' | 'pending'>(initialStatus)
  const [showCannedPicker, setShowCannedPicker] = useState(false)

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
    setConvStatus(initialStatus)
    fetchMessages()
  }, [fetchMessages, initialStatus])

  // Listen for realtime new message events
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

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInputText(val)
    setShowCannedPicker(val.startsWith('/'))
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || sending || convStatus === 'closed') return

    const textToSend = inputText.trim()
    setInputText('')
    setShowCannedPicker(false)
    setSending(true)

    // Optimistic message
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
      console.error(res.error)
    } else {
      await fetchMessages()
    }

    setSending(false)
  }

  const isClosed = convStatus === 'closed'

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-background relative">
      {/* Header */}
      <div className="h-16 border-b flex items-center justify-between px-6 bg-white dark:bg-muted/30 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {contactName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">{contactName}</h2>
              {isClosed && (
                <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full border font-medium">
                  CERRADA
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" /> {contactPhone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Agent Display */}
          {showAssignedAgent && assignedUser && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-full border border-primary/10">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                {assignedUser.avatar_url ? (
                  <img src={assignedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-medium text-primary">
                    {assignedUser.full_name?.charAt(0)?.toUpperCase() || 'A'}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-primary">
                Atendido por {assignedUser.full_name?.split(' ')[0]}
              </span>
            </div>
          )}

          {/* AI Toggle */}
          {!isClosed && (
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
                  {aiActive ? 'IA activa — click para desactivar' : 'IA inactiva — click para activar'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <ConversationActionsMenu
            conversationId={conversationId}
            status={convStatus}
            onStatusChange={() => {
              // Reload to reflect new status
              fetchMessages()
              // Force status update - parent should ideally re-fetch
              if (convStatus === 'closed') setConvStatus('open')
              else setConvStatus('closed')
            }}
          />
        </div>
      </div>

      {/* Closed banner */}
      {isClosed && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-medium">
          <Lock className="w-3.5 h-3.5" />
          Esta conversación está cerrada. Abre el menú (⋮) para reactivarla.
        </div>
      )}

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
        {isClosed ? (
          <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground text-sm">
            <Lock className="w-4 h-4" />
            <span>La conversación está cerrada — no se pueden enviar mensajes</span>
          </div>
        ) : aiActive ? (
          <div className="flex flex-col items-center justify-center gap-3 py-4 text-muted-foreground text-sm bg-primary/5 border border-primary/10 rounded-xl">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">El asistente virtual está atendiendo este chat</span>
            </div>
            <p className="text-center max-w-md text-xs">
              La conversación es de solo lectura mientras la IA esté activa. Si deseas intervenir, puedes tomar el control del chat.
            </p>
            <Button 
              onClick={async () => {
                if (!currentUser?.id) return
                toast.loading('Tomando control del chat...', { id: 'takeover' })
                const { takeoverConversationAction } = await import('@/actions/conversation-actions')
                const res = await takeoverConversationAction(conversationId, currentUser.id)
                if (res.success) {
                  setAiActive(false)
                  toast.success('Has tomado el control del chat', { id: 'takeover' })
                } else {
                  toast.error(res.error || 'Error al tomar el chat', { id: 'takeover' })
                }
              }}
            >
              Tomar Chat y Pausar IA
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
              <ImageIcon className="w-5 h-5" />
            </Button>
            <div className="flex-1 relative">
              {showCannedPicker && (
                <CannedMessagePicker
                  query={inputText}
                  onSelect={text => {
                    setInputText(text)
                    setShowCannedPicker(false)
                  }}
                  onClose={() => setShowCannedPicker(false)}
                />
              )}
              <Input
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={e => {
                  if (e.key === 'Escape' && showCannedPicker) {
                    setShowCannedPicker(false)
                  }
                }}
                placeholder="Escribe un mensaje… o escribe / para mensajes predefinidos"
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
        )}
      </div>
    </div>
  )
}
