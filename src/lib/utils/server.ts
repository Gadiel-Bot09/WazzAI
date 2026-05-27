/**
 * Utility: Server Action Result wrapper
 * Consistent return type for all Server Actions
 */

export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { success: true, data, message }
}

export function err(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { success: false, error, fieldErrors }
}

/**
 * Utility: Generate a URL-safe slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, '')   // remove special chars
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/-+/g, '-')            // deduplicate hyphens
    .slice(0, 50)
}

/**
 * Utility: Check if a plan limit is exceeded
 * -1 means unlimited
 */
export function isLimitExceeded(current: number, limit: number): boolean {
  if (limit === -1) return false
  return current >= limit
}

/**
 * Utility: Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Utility: Sanitize a phone number to E.164 format
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

/**
 * Utility: Extract JID from Evolution API phone number
 * Evolution uses the format: 5219991234567@s.whatsapp.net
 */
export function phoneToJid(phone: string, suffix = '@s.whatsapp.net'): string {
  const cleaned = phone.replace(/[^\d]/g, '')
  return `${cleaned}${suffix}`
}

export function jidToPhone(jid: string): string {
  return '+' + jid.split('@')[0]
}

/**
 * Utility: Chunk an array into smaller arrays
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Utility: Wait for N milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Utility: Validate HMAC-SHA256 signature
 */
export async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const signatureBuffer = hexToBuffer(signature.replace('sha256=', ''))
    const payloadBuffer = encoder.encode(payload)

    return await crypto.subtle.verify('HMAC', key, signatureBuffer, payloadBuffer)
  } catch {
    return false
  }
}

export async function computeHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return bufferToHex(signature)
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, 2), 16)
  }
  return bytes.buffer
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
