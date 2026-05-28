import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCheck, Check, Bot } from 'lucide-react'

interface MessageBubbleProps {
  message: any
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound' || message.direction === 'ai'
  const isAI = message.direction === 'ai'
  
  return (
    <div className={`flex w-full mb-4 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-2 flex flex-col relative ${
          isOutbound 
            ? 'bg-primary text-primary-foreground rounded-tr-sm' 
            : 'bg-muted border border-border rounded-tl-sm'
        }`}
      >
        {isAI && (
          <div className="flex items-center gap-1 text-[10px] opacity-70 mb-1 font-medium">
            <Bot className="w-3 h-3" /> Respuesta Automática IA
          </div>
        )}
        
        <div className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
        
        <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isOutbound ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          <span>{format(new Date(message.sent_at), 'HH:mm', { locale: es })}</span>
          
          {isOutbound && (
            <span>
              {message.status === 'read' ? (
                <CheckCheck className="w-3 h-3 text-blue-300" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="w-3 h-3" />
              ) : (
                <Check className="w-3 h-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
