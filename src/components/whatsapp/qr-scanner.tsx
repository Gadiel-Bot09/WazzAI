'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { getWhatsAppQRAction, disconnectWhatsAppAction } from '@/actions/whatsapp'
import { Button } from '@/components/ui/button'
import {
  Loader2, RefreshCcw, CheckCircle2, Wifi, WifiOff, Smartphone, LogOut
} from 'lucide-react'

type State = 'loading' | 'connecting' | 'open' | 'error'

interface WhatsAppConnectionStatusProps {
  orgId?: string
}

export function WhatsAppConnectionStatus({ orgId }: WhatsAppConnectionStatusProps) {
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [state, setState] = useState<State>('loading')
  const [error, setError] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)

  const fetchStatus = useCallback(async () => {
    const res = await getWhatsAppQRAction()
    if (res.success) {
      if (res.data.state === 'open') {
        setState('open')
      } else {
        setQrBase64(res.data.base64)
        setState('connecting')
      }
    } else {
      setState('error')
      setError(res.error)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Poll every 5s while connecting
  useEffect(() => {
    if (state !== 'connecting') return
    const timer = setInterval(() => {
      setPollCount((c) => c + 1)
      fetchStatus()
    }, 5000)
    return () => clearInterval(timer)
  }, [state, fetchStatus])

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Verificando estado de conexión...</p>
      </div>
    )
  }

  if (state === 'open') {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-6">
        <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Wifi className="w-4 h-4 text-green-500" />
            <h3 className="font-semibold text-green-600 dark:text-green-400">WhatsApp Conectado</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Tu número está activo y recibiendo mensajes en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setState('loading'); fetchStatus() }}
          >
            <RefreshCcw className="w-3.5 h-3.5 mr-2" />
            Verificar conexión
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              setState('loading')
              await disconnectWhatsAppAction()
              fetchStatus()
            }}
          >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            Desconectar
          </Button>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <WifiOff className="w-8 h-8 text-red-500" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold">Error de conexión</h3>
          <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={() => { setState('loading'); setError(null); fetchStatus() }}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Intentar de nuevo
        </Button>
      </div>
    )
  }

  // Connecting — show QR
  return (
    <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
      {/* QR Code */}
      <div className="flex-shrink-0">
        <div className="relative w-64 h-64 bg-white rounded-2xl border-2 border-border shadow-sm flex items-center justify-center overflow-hidden">
          {!qrBase64 ? (
            <div className="flex flex-col items-center text-muted-foreground gap-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-xs">Generando QR...</span>
            </div>
          ) : (
            <Image
              src={qrBase64.startsWith('data:image') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
              alt="WhatsApp QR Code"
              width={256}
              height={256}
              className="w-full h-full object-contain p-3"
            />
          )}
        </div>
        {qrBase64 && (
          <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Actualizando cada 5 segundos...
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="flex-1 space-y-5">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-[#25D366]" />
          <h3 className="font-semibold">Escanea con tu WhatsApp</h3>
        </div>

        <ol className="space-y-4">
          {[
            { step: 1, text: 'Abre WhatsApp en tu teléfono.' },
            { step: 2, text: 'Toca el menú (⋮) o "Configuración" en iOS.' },
            { step: 3, text: 'Selecciona "Dispositivos vinculados".' },
            { step: 4, text: 'Toca "Vincular un dispositivo".' },
            { step: 5, text: 'Apunta tu cámara a este código QR.' },
          ].map(({ step, text }) => (
            <li key={step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#25D366]/10 text-[#25D366] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {step}
              </div>
              <span className="text-sm text-muted-foreground">{text}</span>
            </li>
          ))}
        </ol>

        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
          ⚠️ El código QR expira en 60 segundos. Si expira, haz clic en "Actualizar QR".
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => { setState('loading'); fetchStatus() }}
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Actualizar QR
        </Button>
      </div>
    </div>
  )
}
