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

  private getInstanceName(orgId: string): string {
    return `wazzai_${orgId.replace(/-/g, '')}`
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
  async createInstance(orgId: string): Promise<EvolutionCreateInstanceResponse> {
    const instanceName = this.getInstanceName(orgId)
    const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/evolution`

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

    const response = await fetch(`${this.baseUrl}/instance/create`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Error creating Evolution instance: ${error}`)
    }

    return response.json()
  }

  /**
   * Obtiene el código QR base64 de una instancia para conectarla
   */
  async getQRCode(orgId: string): Promise<{ base64: string } | null> {
    const instanceName = this.getInstanceName(orgId)

    const response = await fetch(`${this.baseUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: this.headers,
    })

    if (!response.ok) {
      if (response.status === 404) return null
      const error = await response.text()
      throw new Error(`Error fetching QR code: ${error}`)
    }

    const data = await response.json()
    // Si la instancia ya está conectada, Evolution puede no devolver base64
    const qrBase64 = data.base64 || data.qrcode?.base64
    if (!qrBase64 && data.instance?.state === 'open') {
      return null
    }

    return { base64: qrBase64 }
  }

  /**
   * Obtiene el estado de conexión de la instancia
   */
  async getConnectionState(orgId: string): Promise<EvolutionInstance['instance'] | null> {
    const instanceName = this.getInstanceName(orgId)

    const response = await fetch(`${this.baseUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: this.headers,
    })

    if (!response.ok) {
      if (response.status === 404) return null
      const error = await response.text()
      throw new Error(`Error fetching connection state: ${error}`)
    }

    const data = await response.json()
    return data.instance || data
  }

  /**
   * Envía un mensaje de texto
   */
  async sendTextMessage(
    orgId: string, 
    phone: string, 
    text: string
  ): Promise<EvolutionSendMessageResponse> {
    const instanceName = this.getInstanceName(orgId)

    const response = await fetch(`${this.baseUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        number: phone,
        options: { delay: 1200 }, // Delay humano
        textMessage: { text },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Error sending text message: ${error}`)
    }

    return response.json()
  }

  /**
   * Cierra sesión (desconecta) la instancia
   */
  async logoutInstance(orgId: string): Promise<boolean> {
    const instanceName = this.getInstanceName(orgId)

    const response = await fetch(`${this.baseUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: this.headers,
    })

    return response.ok
  }
}

export const evolutionClient = new EvolutionClient()
