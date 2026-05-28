'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getWhatsAppQRAction } from '@/actions/whatsapp'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCcw, CheckCircle2 } from 'lucide-react'

export function QRScanner({ onConnected }: { onConnected?: () => void }) {
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [state, setState] = useState<'loading' | 'connecting' | 'open' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  const fetchQR = async () => {
    setState('loading')
    setError(null)
    
    const res = await getWhatsAppQRAction()
    
    if (res.success) {
      if (res.data.state === 'open') {
        setState('open')
        if (onConnected) onConnected()
      } else {
        setQrBase64(res.data.base64)
        setState('connecting')
      }
    } else {
      setState('error')
      setError(res.error)
    }
  }

  useEffect(() => {
    fetchQR()
    
    // Polling cada 5 segundos si está conectando para comprobar si el usuario escaneó
    const interval = setInterval(() => {
      if (state === 'connecting') {
        fetchQR()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [state])

  if (state === 'open') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 bg-green-500/10 rounded-xl border border-green-500/20">
        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-semibold text-green-600 dark:text-green-400">¡WhatsApp Conectado!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Tu número ya está vinculado a WazzAI exitosamente.
          </p>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <p className="text-sm text-red-500">{error}</p>
        <Button variant="outline" onClick={fetchQR} size="sm">
          <RefreshCcw className="w-4 h-4 mr-2" /> Intentar de nuevo
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6">
      <div className="relative w-64 h-64 bg-white rounded-xl flex items-center justify-center overflow-hidden border-2 border-border shadow-sm p-4">
        {state === 'loading' || !qrBase64 ? (
          <div className="flex flex-col items-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <span className="text-sm">Generando código QR...</span>
          </div>
        ) : (
          <Image 
            src={qrBase64.startsWith('data:image') ? qrBase64 : `data:image/png;base64,${qrBase64}`} 
            alt="WhatsApp QR Code" 
            width={256} 
            height={256}
            className="w-full h-full object-contain"
          />
        )}
      </div>
      
      <div className="text-center space-y-2 max-w-sm">
        <h3 className="font-medium">Escanea este código con WhatsApp</h3>
        <ol className="text-sm text-muted-foreground text-left list-decimal list-inside space-y-1">
          <li>Abre WhatsApp en tu teléfono</li>
          <li>Toca Menú (tres puntos) o Configuración</li>
          <li>Selecciona "Dispositivos vinculados"</li>
          <li>Toca "Vincular un dispositivo" y apunta la cámara a esta pantalla</li>
        </ol>
      </div>
    </div>
  )
}
