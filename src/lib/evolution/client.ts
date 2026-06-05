import { env } from '@/env'
import type { 
  EvolutionCreateInstanceResponse, 
  EvolutionInstance, 
  EvolutionSendMessageResponse 
} from '@/types/evolution'

export class EvolutionClient {
  private baseUrl: string
  private apiKey: string

  constructor() {
    // Evitar que el cliente intente inicializarse en el navegador (client-side)
    if (typeof window !== 'undefined') {
      throw new Error('EvolutionClient must only be used on the server.')
    }
    
    // Fallback vacíos temporales si en build time no están definidos
    this.baseUrl = env.EVOLUTION_API_URL || 'http://localhost:8080'
    this.apiKey = env.EVOLUTION_API_KEY || 'apikey'
  }

  private getInstanceName(instanceId: string): string {
    return `wazzai_${instanceId.replace(/-/g, '')}`
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'apikey': this.apiKey,
    }
  }

  /**
   * Crea una nueva instancia de WhatsApp para una organización
   */
  async createInstance(instanceId: string): Promise<EvolutionCreateInstanceResponse> {
    const instanceName = this.getInstanceName(instanceId)
    let appUrl = env.NEXT_PUBLIC_APP_URL
    if (!appUrl || appUrl.includes('localhost')) {
      if (process.env.VERCEL_URL) {
        appUrl = `https://${process.env.VERCEL_URL}`
      } else {
        // Fallback for local development, though Evolution can't reach localhost
        appUrl = 'http://localhost:3000'
      }
    }
    const webhookUrl = `${appUrl}/api/webhooks/evolution`

    const payload = {
      instanceName,
      token: instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: {
        url: webhookUrl,
        byEvents: false,
        base64: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
      },
      // Habilitar sincronización de mensajes antiguos si Evolution lo permite
      options: {
        syncFullHistory: true, // Solicita el historial completo de mensajes
      }
    }

    const res = await fetch(`${this.baseUrl}/instance/create`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload)
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('Error creating evolution instance:', res.status, errorText)
      throw new Error(`Failed to create instance: ${res.statusText}`)
    }

    return res.json()
  }

  /**
   * Obtiene el código QR base64 de una instancia para conectarla
   */
  async getQRCode(instanceId: string) {
    const instanceName = this.getInstanceName(instanceId)
    const res = await fetch(`${this.baseUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: this.headers,
    })
    
    if (!res.ok) {
      if (res.status === 404) return null
      throw new Error('Failed to get QR code')
    }

    return res.json()
  }

  /**
   * Obtiene el estado de conexión de la instancia
   */
  async getConnectionState(instanceId: string) {
    const instanceName = this.getInstanceName(instanceId)
    const res = await fetch(`${this.baseUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: this.headers,
    })
    
    if (!res.ok) {
      if (res.status === 404) return null // Instancia no existe
      throw new Error('Failed to get connection state')
    }

    const data = await res.json()
    return data?.instance || data
  }

  /**
   * Envía un mensaje de texto
   */
  async sendTextMessage(
    instanceId: string, 
    phone: string, 
    text: string
  ): Promise<EvolutionSendMessageResponse> {
    const instanceName = this.getInstanceName(instanceId)

    const response = await fetch(`${this.baseUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        number: phone,
        options: { delay: 1200 }, // Delay humano
        text: text,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Error sending text message: ${error}`)
    }

    return response.json()
  }

  /**
   * Muestra el indicador "Escribiendo..." en WhatsApp antes de enviar un mensaje.
   * @param instanceId ID de la instancia de Evolution
   * @param phone Número de WhatsApp del destinatario (formato internacional sin @)
   * @param durationMs Cuánto tiempo esperar antes de enviar el mensaje real (en ms)
   */
  async sendTyping(instanceId: string, phone: string, durationMs: number = 1500): Promise<void> {
    const instanceName = this.getInstanceName(instanceId)
    // Evolution API espera el número SIN @s.whatsapp.net en el campo number
    const number = phone.replace('@s.whatsapp.net', '').replace('@c.us', '')

    try {
      const res = await fetch(`${this.baseUrl}/chat/sendPresence/${instanceName}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          number,          // ← top-level, sin @s.whatsapp.net
          presence: 'composing', // ← top-level, NO dentro de options
          delay: durationMs,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.warn(`[Evolution] sendTyping HTTP ${res.status}: ${errText}`)
      }

      // Esperar la duración para que el usuario vea "Escribiendo..." antes del mensaje
      await new Promise(resolve => setTimeout(resolve, durationMs))
    } catch (err) {
      // Non-fatal: si falla el typing, igual se envía el mensaje
      console.warn('[Evolution] sendTyping failed (non-fatal):', err)
    }
  }

  /**
   * Envia un mensaje de tipo Media (Imagen/Audio/Video/Documento) a un número
   */
  async sendMedia(instanceId: string, phone: string, mediaUrl: string, mediaType: 'image' | 'audio' | 'video' | 'document', caption?: string): Promise<any> {
    const instanceName = this.getInstanceName(instanceId)

    const response = await fetch(`${this.baseUrl}/message/sendMedia/${instanceName}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        number: phone,
        options: { delay: 1200 },
        mediaMessage: {
          mediatype: mediaType,
          caption: caption || '',
          media: mediaUrl,
        }
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Error sending media message: ${error}`)
    }

    return response.json()
  }

  /**
   * Cierra sesión (desconecta) la instancia
   */
  async logoutInstance(instanceId: string): Promise<boolean> {
    const instanceName = this.getInstanceName(instanceId)

    const response = await fetch(`${this.baseUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: this.headers,
    })

    // Also completely delete the instance to clear webhooks
    try {
      await fetch(`${this.baseUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: this.headers,
      })
    } catch (e) {
      console.log('Error deleting instance, ignoring', e)
    }

    return response.ok
  }
}

export const evolutionClient = new EvolutionClient()
