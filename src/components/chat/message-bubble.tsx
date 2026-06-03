import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCheck, Check, Bot, FileText, Download } from 'lucide-react'

interface MessageBubbleProps {
  message: any
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound' || message.direction === 'ai'
  const isAI = message.direction === 'ai'
  
  return (
    <div className={`flex w-full mb-3 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[85%] md:max-w-[70%] rounded-xl px-2.5 py-1.5 flex flex-col relative shadow-sm ${
          isOutbound 
            ? 'bg-[#dcf8c6] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none' 
            : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none'
        }`}
      >
        {isAI && (
          <div className="flex items-center gap-1 text-[10px] opacity-80 mb-1 font-medium text-emerald-700 dark:text-emerald-400">
            <Bot className="w-3 h-3" /> Respuesta de IA
          </div>
        )}

        {/* Media Rendering */}
        {message.media_url && (
          <div className="mb-1 mt-0.5 -mx-1">
            {message.media_type?.startsWith('image/') ? (
              <img src={message.media_url} alt="adjunto" className="w-full max-w-sm rounded-lg object-contain bg-black/5" />
            ) : (
              <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 p-3 rounded-lg mx-1 mt-1">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 text-red-500 rounded flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">Documento Adjunto</p>
                  <a href={message.media_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5">
                    <Download className="w-3 h-3" /> Descargar
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="text-[15px] whitespace-pre-wrap break-words leading-snug pb-3 px-1">
          {message.content}
        </div>
        
        <div className={`absolute bottom-1 right-2 flex items-center gap-1 text-[11px] ${
          isOutbound ? 'text-[#667781] dark:text-[#8696a0]' : 'text-[#667781] dark:text-[#8696a0]'
        }`}>
          <span>{format(new Date(message.sent_at), 'HH:mm', { locale: es })}</span>
          
          {isOutbound && (
            <span>
              {message.status === 'read' ? (
                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="w-3.5 h-3.5" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
            </span>
          )}
        </div>

        {/* Tail (Pico WhatsApp) */}
        <div className={`absolute top-0 w-2 h-3 ${isOutbound ? '-right-2 text-[#dcf8c6] dark:text-[#005c4b]' : '-left-2 text-white dark:text-[#202c33]'}`}>
          {isOutbound ? (
            <svg viewBox="0 0 8 13" width="8" height="13" className="fill-current">
              <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 8 13" width="8" height="13" className="fill-current">
              <path d="M1.533 3.568L8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"/>
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}
