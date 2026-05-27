import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'
import { es, enUS } from 'date-fns/locale'

/**
 * Merge Tailwind CSS classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a datetime string for display in chat
 */
export function formatChatTime(dateStr: string | null, locale = 'es'): string {
  if (!dateStr) return ''
  const date = parseISO(dateStr)
  const dateFnsLocale = locale === 'es' ? es : enUS

  if (isToday(date)) {
    return format(date, 'HH:mm', { locale: dateFnsLocale })
  }
  if (isYesterday(date)) {
    return locale === 'es' ? 'Ayer' : 'Yesterday'
  }
  return format(date, 'dd/MM/yyyy', { locale: dateFnsLocale })
}

/**
 * Format relative time (e.g. "hace 5 minutos")
 */
export function formatRelativeTime(dateStr: string | null, locale = 'es'): string {
  if (!dateStr) return ''
  return formatDistanceToNow(parseISO(dateStr), {
    addSuffix: true,
    locale: locale === 'es' ? es : enUS,
  })
}

/**
 * Format currency (MXN by default)
 */
export function formatCurrency(
  amount: number,
  currency = 'MXN',
  locale = 'es-MX'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Truncate a string to a max length
 */
export function truncate(str: string, maxLength = 80): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

/**
 * Get user initials for avatars
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '??'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Format a phone number for display
 */
export function formatPhone(phone: string): string {
  // Remove non-digits
  const digits = phone.replace(/\D/g, '')
  // Basic formatting — adjust for your region
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 12 && digits.startsWith('52')) {
    return `+52 (${digits.slice(2, 5)}) ${digits.slice(5, 8)}-${digits.slice(8)}`
  }
  return phone
}

/**
 * Generate a color from a string (for avatars/tags)
 */
export function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 50%)`
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Check if a value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Convert a file to base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
  })
}

/**
 * Download a string as a CSV file
 */
export function downloadCSV(data: string, filename: string) {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Convert an array of objects to CSV string
 */
export function arrayToCSV<T extends Record<string, unknown>>(data: T[]): string {
  if (data.length === 0) return ''
  const headers = Object.keys(data[0])
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h]
        if (val === null || val === undefined) return ''
        const str = String(val)
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      })
      .join(',')
  )
  return [headers.join(','), ...rows].join('\n')
}
