import { QRScanner } from '@/components/whatsapp/qr-scanner'

export default function WhatsAppConfigPage() {
  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configuración de WhatsApp</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona la conexión de tu número de WhatsApp con la Inteligencia Artificial.
        </p>
      </div>
      
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <QRScanner />
      </div>
    </div>
  )
}
