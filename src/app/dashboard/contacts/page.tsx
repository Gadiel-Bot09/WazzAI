import type { Metadata } from 'next'
import { Users } from 'lucide-react'
import { ContactsTable } from '@/components/contacts/contacts-table'

export const metadata: Metadata = {
  title: 'Contactos — WazzAI',
  description: 'Gestiona todos tus contactos de WhatsApp en un solo lugar.',
}

export default function ContactsPage() {
  return (
    <div className="flex flex-col h-full p-6 gap-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Contactos</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Gestiona tu base de contactos. Los números que te escriban por WhatsApp se guardan automáticamente.
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ContactsTable />
      </div>
    </div>
  )
}
