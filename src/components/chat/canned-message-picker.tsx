'use client'

import { useState, useEffect, useRef } from 'react'
import { getCannedMessagesAction } from '@/actions/chat'
import type { CannedMessage } from '@/actions/chat'
import { Zap } from 'lucide-react'

interface CannedMessagePickerProps {
  query: string          // the current text in the input (starting with /)
  onSelect: (text: string) => void
  onClose: () => void
}

export function CannedMessagePicker({ query, onSelect, onClose }: CannedMessagePickerProps) {
  const [messages, setMessages] = useState<CannedMessage[]>([])
  const [filtered, setFiltered] = useState<CannedMessage[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getCannedMessagesAction().then(res => {
      if (res.success) setMessages(res.data)
    })
  }, [])

  useEffect(() => {
    const q = query.replace(/^\//, '').toLowerCase()
    const results = messages.filter(m =>
      m.title.toLowerCase().includes(q) ||
      (m.shortcut && m.shortcut.toLowerCase().includes(q)) ||
      m.content.toLowerCase().includes(q)
    )
    setFiltered(results)
    setSelectedIdx(0)
  }, [query, messages])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx(i => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter' && filtered[selectedIdx]) {
        e.preventDefault()
        onSelect(filtered[selectedIdx].content)
      }
      if (e.key === 'Tab' && filtered[selectedIdx]) {
        e.preventDefault()
        onSelect(filtered[selectedIdx].content)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filtered, selectedIdx, onSelect, onClose])

  if (filtered.length === 0) return null

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-1 bg-background border rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2"
      ref={listRef}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <Zap className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">
          Mensajes predefinidos — ↑↓ navegar · Enter seleccionar · Esc cancelar
        </span>
      </div>
      <div className="max-h-52 overflow-y-auto">
        {filtered.map((msg, idx) => (
          <button
            key={msg.id}
            className={`w-full text-left px-4 py-3 transition-colors border-b last:border-0 ${
              idx === selectedIdx
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted/50'
            }`}
            onClick={() => onSelect(msg.content)}
            onMouseEnter={() => setSelectedIdx(idx)}
          >
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-sm font-medium truncate">{msg.title}</span>
              {msg.shortcut && (
                <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                  /{msg.shortcut}
                </code>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">{msg.content}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
