'use client'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageBubble } from './message-bubble'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2, Phone, Image as ImageIcon, Bot, Lock, Smile, Paperclip, X } from 'lucide-react'
import { getMessagesAction, sendChatMessageAction } from '@/actions/chat'
import { takeConversationAction } from '@/actions/conversation-actions'
import { toggleConversationAIAction } from '@/actions/ai'
import { Switch } from '@/components/ui/switch'
import { NativeEmojiPicker } from './native-emoji-picker'
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [takingChat, setTakingChat] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleTakeChat = async () => {
    setTakingChat(true)
    const res = await takeConversationAction(conversationId)
    setTakingChat(false)
    if (!res.success) {
      toast.error(res.error || 'Error al tomar el chat')
    } else {
      toast.success('Chat asignado exitosamente')
    }
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async () => {
    const res = await getMessagesAction(conversationId)
    if (res.success) {
      // Deduplicate by id to prevent any UI duplicates
      const seen = new Set()
      const unique = (res.data as any[]).filter(m => {
        if (seen.has(m.id)) return false
        seen.add(m.id)
        return true
      })
      setMessages(unique)
    }
    setLoading(false)
    scrollToBottom()
  }, [conversationId])

  useEffect(() => {
    setLoading(true)
    setConvStatus(initialStatus)
    setAiActive(initialAIActive)
    fetchMessages()
  }, [fetchMessages, initialStatus, initialAIActive])

  // Listen for realtime new messages directly from Supabase
  useEffect(() => {
    if (!conversationId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`chat-msgs-${conversationId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new as any
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          scrollToBottom()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const updatedMsg = payload.new as any
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m))
        }
      )
      .subscribe((status) => {
        console.log(`[ChatWindow] Realtime channel status: ${status} for conv ${conversationId}`)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  // Fallback: Listen for realtime new message events from the global listener
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
    if ((!inputText.trim() && !file) || sending || convStatus === 'closed') return

    const textToSend = inputText.trim()
    const fileToSend = file
    setInputText('')
    setShowCannedPicker(false)
    setShowEmojiPicker(false)
    setFile(null)
    setSending(true)

    let mediaUrl: string | undefined
    let mediaType: string | undefined

    if (fileToSend) {
      toast.loading('Subiendo archivo...', { id: 'upload' })
      try {
        const form = new FormData()
        form.append('file', fileToSend)
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: form,
        })
        const uploadData = await uploadRes.json()
        if (uploadRes.ok && uploadData.url) {
          mediaUrl = uploadData.url
          mediaType = fileToSend.type
          toast.success('Archivo subido correctamente', { id: 'upload' })
        } else {
          toast.error(uploadData.error || 'Error al subir el archivo', { id: 'upload' })
          setSending(false)
          return
        }
      } catch (err) {
        toast.error('Error de red al subir el archivo', { id: 'upload' })
        setSending(false)
        return
      }
    }

    // Optimistic message
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      content: textToSend,
      direction: 'outbound',
      status: 'sending',
      sent_at: new Date().toISOString(),
      media_url: mediaUrl,
      media_type: mediaType
    }])
    scrollToBottom()

    const res = await sendChatMessageAction(conversationId, textToSend, mediaUrl, mediaType)

    if (!res.success) {
      console.error(res.error)
      toast.error(res.error)
    } else {
      await fetchMessages()
    }

    setSending(false)
  }

  const isClosed = convStatus === 'closed'

  const onEmojiClick = (emoji: string) => {
    setInputText((prev) => prev + emoji)
    setShowEmojiPicker(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#EFEAE2] dark:bg-[#0b141a] relative wa-bg">
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
          {!assignedUser && !isClosed && (
            <Button size="sm" onClick={handleTakeChat} disabled={takingChat} variant="default" className="h-8">
              Tomar Chat
            </Button>
          )}
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
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
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
          <div className="flex flex-col w-full relative">
            {/* File preview */}
            {file && (
              <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-muted p-2 rounded-lg shadow-md border flex items-center gap-3 w-64 animate-in fade-in slide-in-from-bottom-2">
                <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center shrink-0">
                  {file.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover rounded" />
                  ) : (
                    <Paperclip className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 truncate text-sm">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button type="button" onClick={() => setFile(null)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 left-0 z-50 animate-in fade-in slide-in-from-bottom-2">
                <NativeEmojiPicker onEmojiClick={onEmojiClick} onClose={() => setShowEmojiPicker(false)} />
              </div>
            )}

            <form onSubmit={handleSend} className="flex items-end gap-2 w-full">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
                <Button type="button" variant="ghost" size="icon" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                  <Smile className="w-6 h-6" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                  <Paperclip className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 relative bg-white dark:bg-[#2a3942] rounded-3xl flex items-center border border-border/50 shadow-sm overflow-visible px-4 py-2">
                {showCannedPicker && (
                  <div className="absolute bottom-full left-0 w-full mb-2 z-50">
                    <CannedMessagePicker
                      query={inputText}
                      onSelect={text => {
                        setInputText(text)
                        setShowCannedPicker(false)
                      }}
                      onClose={() => setShowCannedPicker(false)}
                    />
                  </div>
                )}
                <Input
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={e => {
                    if (e.key === 'Escape') {
                      setShowCannedPicker(false)
                      setShowEmojiPicker(false)
                    }
                  }}
                  placeholder="Escribe un mensaje… (/ para predefinidos)"
                  className="w-full bg-transparent border-0 focus-visible:ring-0 shadow-none px-0 py-0 h-8 text-[15px]"
                />
              </div>

              <Button
                type="submit"
                disabled={sending || (!inputText.trim() && !file)}
                size="icon"
                className="shrink-0 rounded-full w-12 h-12 bg-primary hover:bg-primary/90 text-white shadow-sm flex items-center justify-center transition-transform active:scale-95"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
