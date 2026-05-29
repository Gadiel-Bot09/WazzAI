export interface EvolutionInstance {
  instance: {
    instanceName: string
    owner: string
    profileName: string
    profilePictureUrl: string
    status?: 'open' | 'connecting' | 'close'
    state?: 'open' | 'connecting' | 'close'
  }
}

export interface EvolutionCreateInstanceResponse {
  instance: {
    instanceName: string
    status: string
  }
  hash: {
    qrcode: string // base64
  }
  qrcode: {
    base64: string
  }
}

export interface EvolutionConnectionUpdate {
  instance: string
  data: {
    state: 'open' | 'connecting' | 'close'
    statusReason: number
  }
  sender: string
}

export interface EvolutionMessagePayload {
  instance: string
  data: {
    key: {
      remoteJid: string
      fromMe: boolean
      id: string
    }
    pushName: string
    message: {
      conversation?: string // Text message
      extendedTextMessage?: {
        text: string
      }
      imageMessage?: {
        caption?: string
        url: string
        mimetype: string
      }
    }
    messageType: 'conversation' | 'extendedTextMessage' | 'imageMessage' | 'audioMessage' | 'videoMessage' | 'documentMessage'
    messageTimestamp: number
  }
  sender: string
}

export interface EvolutionSendMessageResponse {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
  message: Record<string, unknown>
  messageTimestamp: number
  status: string
}
