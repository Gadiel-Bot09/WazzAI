import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.wazzai.com'),
  title: {
    template: '%s | WazzAI',
    default: 'WazzAI — Gestión de WhatsApp con IA',
  },
  description:
    'Plataforma SaaS para gestionar múltiples cuentas de WhatsApp con inteligencia artificial. Automatiza conversaciones, agenda citas y convierte leads en clientes.',
  keywords: [
    'WhatsApp',
    'IA',
    'CRM',
    'chatbot',
    'automatización',
    'agendamiento',
    'ventas',
    'SaaS',
  ],
  authors: [{ name: 'WazzAI' }],
  creator: 'WazzAI',
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    siteName: 'WazzAI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'WazzAI — Gestión de WhatsApp con IA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@wazzai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#22c55e' },
    { media: '(prefers-color-scheme: dark)', color: '#16a34a' },
  ],
  width: 'device-width',
  initialScale: 1,
}

import { Toaster } from 'sonner'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head />
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
