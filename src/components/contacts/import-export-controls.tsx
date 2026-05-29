'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { importContactsAction, exportContactsAction } from '@/actions/contacts'

interface ImportExportControlsProps {
  onImportSuccess: () => void
}

export function ImportExportControls({ onImportSuccess }: ImportExportControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  function showFeedback(type: 'success' | 'error', message: string) {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4000)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      showFeedback('error', 'Por favor selecciona un archivo .csv')
      return
    }

    setImporting(true)
    const text = await file.text()
    const res = await importContactsAction(text)
    setImporting(false)

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''

    if (!res.success) {
      showFeedback('error', res.error ?? 'Error al importar')
    } else {
      showFeedback(
        'success',
        `✓ ${res.data.imported} importados · ${res.data.skipped} omitidos (duplicados o sin teléfono)`
      )
      onImportSuccess()
    }
  }

  async function handleExport() {
    setExporting(true)
    const res = await exportContactsAction()
    setExporting(false)

    if (!res.success) {
      showFeedback('error', 'Error al exportar contactos')
      return
    }

    // Download the CSV
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `contactos_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showFeedback('success', 'Exportación descargada correctamente')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          id="import-csv-input"
          onChange={handleFileChange}
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          {importing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Importar CSV
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Exportar CSV
        </Button>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div
          className={`flex items-center gap-2 text-xs px-3 py-2 rounded-md transition-all ${
            feedback.type === 'success'
              ? 'bg-green-500/10 text-green-700 dark:text-green-400'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          {feedback.message}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        El CSV debe tener columnas:{' '}
        <code className="bg-muted px-1 py-0.5 rounded text-[11px]">
          name, phone_number, email, notes, tags
        </code>
        . Las etiquetas múltiples separadas con punto y coma (;).
      </p>
    </div>
  )
}
