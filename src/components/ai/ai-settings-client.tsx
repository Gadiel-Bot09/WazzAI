'use client'

import { useState } from 'react'
import {
  updateAIConfigAction,
  addKnowledgeDocumentAction,
  deleteKnowledgeDocumentAction,
  toggleAIActiveAction,
} from '@/actions/ai'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Bot,
  Brain,
  FileText,
  Plus,
  Trash2,
  Loader2,
  Upload,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Settings2,
} from 'lucide-react'

interface AISettingsClientProps {
  instanceId: string
  initialConfig: any
  initialDocs: any[]
}

export function AISettingsClient({ instanceId, initialConfig, initialDocs }: AISettingsClientProps) {
  // ── AI Config State ──────────────────────────────────────────────────────────
  const [config, setConfig] = useState({
    is_active: initialConfig?.is_active ?? false,
    model: initialConfig?.model ?? 'gpt-4o-mini',
    tone: initialConfig?.tone ?? 'professional',
    temperature: initialConfig?.temperature ?? 0.7,
    context_messages: initialConfig?.context_messages ?? 10,
    system_prompt: initialConfig?.system_prompt ?? '',
    welcome_message: initialConfig?.welcome_message ?? '',
    fallback_message: initialConfig?.fallback_message ?? 'Lo siento, un agente humano te atenderá pronto. ¡Gracias por tu paciencia! 🙏',
    transfer_keywords: (initialConfig?.transfer_keywords ?? ['humano', 'persona', 'agente', 'operador', 'help', 'ayuda']).join(', '),
  })
  const [configSaving, setConfigSaving] = useState(false)
  const [configStatus, setConfigStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // ── Knowledge Base State ─────────────────────────────────────────────────────
  const [docs, setDocs] = useState(initialDocs)
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newDocContent, setNewDocContent] = useState('')
  const [docAdding, setDocAdding] = useState(false)
  const [docStatus, setDocStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [docError, setDocError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleSaveConfig() {
    setConfigSaving(true)
    setConfigStatus('idle')
    const res = await updateAIConfigAction(instanceId, {
      is_active: config.is_active,
      model: config.model,
      tone: config.tone,
      temperature: Number(config.temperature),
      context_messages: Number(config.context_messages),
      system_prompt: config.system_prompt || null,
      welcome_message: config.welcome_message || null,
      fallback_message: config.fallback_message,
      transfer_keywords: config.transfer_keywords.split(',').map((k: string) => k.trim()).filter(Boolean),
    })
    setConfigSaving(false)
    setConfigStatus(res.success ? 'success' : 'error')
    setTimeout(() => setConfigStatus('idle'), 3000)
  }

  async function handleToggleAI(checked: boolean) {
    setConfig(prev => ({ ...prev, is_active: checked }))
    await toggleAIActiveAction(instanceId, checked)
  }

  async function handleAddDoc() {
    if (!newDocTitle.trim() || !newDocContent.trim()) return
    setDocAdding(true)
    setDocStatus('idle')
    setDocError('')
    const res = await addKnowledgeDocumentAction(newDocTitle, newDocContent, instanceId)
    if (res.success) {
      setDocStatus('success')
      setNewDocTitle('')
      setNewDocContent('')
      // Refresh doc list
      setDocs(prev => [
        { id: Date.now().toString(), title: newDocTitle, source_filename: null, chunk_index: 0, total_chunks: res.data.chunksCreated, is_active: true, created_at: new Date().toISOString() },
        ...prev,
      ])
    } else {
      setDocStatus('error')
      setDocError(res.error)
    }
    setDocAdding(false)
    setTimeout(() => setDocStatus('idle'), 4000)
  }

  async function handleDeleteDoc(title: string, id: string) {
    setDeletingId(id)
    const res = await deleteKnowledgeDocumentAction(title)
    if (res.success) {
      setDocs(prev => prev.filter(d => d.title !== title))
    }
    setDeletingId(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-6 bg-background">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h1 className="font-semibold">Configuración de IA</h1>
            <p className="text-xs text-muted-foreground">Personaliza el asistente inteligente de WazzAI</p>
          </div>
        </div>

        {/* Global AI toggle */}
        <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-xl border">
          <Sparkles className={`w-4 h-4 ${config.is_active ? 'text-violet-500' : 'text-muted-foreground'}`} />
          <Label htmlFor="ai-global-toggle" className="text-sm font-medium cursor-pointer select-none">
            IA {config.is_active ? <span className="text-violet-500">Activa</span> : <span className="text-muted-foreground">Inactiva</span>}
          </Label>
          <Switch
            id="ai-global-toggle"
            checked={config.is_active}
            onCheckedChange={handleToggleAI}
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Configuración General
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <Brain className="w-4 h-4" /> Base de Conocimiento
              <Badge variant="secondary" className="ml-1">{docs.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: Config ────────────────────────────────────────────────────── */}
          <TabsContent value="config" className="space-y-6 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Modelo y Comportamiento</CardTitle>
                <CardDescription>Define cómo responderá el asistente IA a tus clientes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Modelo de IA</Label>
                    <Select value={config.model} onValueChange={(v: string) => setConfig(p => ({ ...p, model: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini (Rápido)</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o (Potente)</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Económico)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tono de Respuesta</Label>
                    <Select value={config.tone} onValueChange={(v: string) => setConfig(p => ({ ...p, tone: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Profesional</SelectItem>
                        <SelectItem value="friendly">Amigable 😊</SelectItem>
                        <SelectItem value="concise">Conciso</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Temperatura <span className="text-muted-foreground text-xs">(creatividad: 0-1)</span></Label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={config.temperature}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig(p => ({ ...p, temperature: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mensajes de contexto <span className="text-muted-foreground text-xs">(últimos N)</span></Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={config.context_messages}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig(p => ({ ...p, context_messages: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Prompt del Sistema</Label>
                  <Textarea
                    value={config.system_prompt}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setConfig(p => ({ ...p, system_prompt: e.target.value }))}
                    placeholder="Ej: Eres el asistente virtual de [Empresa]. Tu misión es ayudar a los clientes con sus consultas sobre nuestros productos y servicios..."
                    className="min-h-32 resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Define la identidad y las reglas de comportamiento del asistente. Si lo dejas vacío, se usa un prompt genérico.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mensajes Especiales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Mensaje de Bienvenida <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                  <Textarea
                    value={config.welcome_message}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setConfig(p => ({ ...p, welcome_message: e.target.value }))}
                    placeholder="¡Hola! 👋 Soy el asistente de [Empresa]. ¿En qué puedo ayudarte hoy?"
                    className="min-h-20 resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mensaje de Fallback <span className="text-muted-foreground text-xs">(cuando la IA no sabe o detecta transferencia)</span></Label>
                  <Textarea
                    value={config.fallback_message}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setConfig(p => ({ ...p, fallback_message: e.target.value }))}
                    className="min-h-20 resize-none"
                  />
                  <p className="text-xs text-amber-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Al enviar este mensaje, la IA se desactivará automáticamente para ese chat.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Palabras clave para transferir a humano <span className="text-muted-foreground text-xs">(separadas por coma)</span></Label>
                  <Input
                    value={config.transfer_keywords}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig(p => ({ ...p, transfer_keywords: e.target.value }))}
                    placeholder="humano, agente, persona, ayuda, operador"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              {configStatus === 'success' && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" /> Guardado correctamente
                </span>
              )}
              {configStatus === 'error' && (
                <span className="flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle className="w-4 h-4" /> Error al guardar
                </span>
              )}
              <Button onClick={handleSaveConfig} disabled={configSaving}>
                {configSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Guardar Configuración
              </Button>
            </div>
          </TabsContent>

          {/* ── TAB 2: Knowledge Base ─────────────────────────────────────────────── */}
          <TabsContent value="knowledge" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add Document */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Añadir Documento
                  </CardTitle>
                  <CardDescription>
                    Pega texto plano. El sistema lo dividirá en chunks, generará embeddings y lo guardará en la base de conocimiento vectorial.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título del Documento</Label>
                    <Input
                      value={newDocTitle}
                      onChange={e => setNewDocTitle(e.target.value)}
                      placeholder="Ej: Políticas de Garantía"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contenido</Label>
                    <Textarea
                      value={newDocContent}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewDocContent(e.target.value)}
                      placeholder="Pega aquí el texto del documento. Puede ser un FAQ, política, catálogo de servicios, etc."
                      className="min-h-48 resize-none font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      {newDocContent.length} caracteres · ~{Math.ceil(newDocContent.length / 1500)} chunk{Math.ceil(newDocContent.length / 1500) > 1 ? 's' : ''}
                    </p>
                  </div>

                  {docStatus === 'success' && (
                    <p className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" /> Documento añadido con éxito
                    </p>
                  )}
                  {docStatus === 'error' && (
                    <p className="flex items-center gap-1 text-sm text-red-500">
                      <AlertCircle className="w-4 h-4" /> {docError}
                    </p>
                  )}

                  <Button
                    onClick={handleAddDoc}
                    disabled={docAdding || !newDocTitle.trim() || !newDocContent.trim()}
                    className="w-full"
                  >
                    {docAdding ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generando embeddings...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Añadir a la Base de Conocimiento
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Document List */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider px-1">
                  Documentos ({docs.length})
                </h3>
                {docs.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <Brain className="w-10 h-10 text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">Sin documentos aún</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Añade documentos para que la IA pueda responder preguntas específicas de tu negocio.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  docs.map(doc => (
                    <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-violet-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.total_chunks} chunk{doc.total_chunks > 1 ? 's' : ''} · {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          disabled={deletingId === doc.id}
                          onClick={() => handleDeleteDoc(doc.title, doc.id)}
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
