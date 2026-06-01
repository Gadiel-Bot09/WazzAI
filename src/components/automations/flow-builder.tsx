'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  Node,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AutomationFlow, updateFlowAction } from '@/actions/automations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, Loader2, MessageSquare, ShieldAlert, KeyRound, Trash, Smile } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { CustomNode } from './custom-node'
import { getDepartmentsAction } from '@/actions/team-actions'
import { DeletableEdge } from './deletable-edge'
import { getUploadUrlAction } from '@/actions/storage'
import { getInstancesListAction } from '@/actions/whatsapp'
import dynamic from 'next/dynamic'
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const nodeTypes = {
  custom: CustomNode,
}

const edgeTypes = {
  deletable: DeletableEdge,
}

const initialNodes: Node[] = [
  {
    id: 'trigger-1',
    type: 'custom',
    data: { label: 'Inicio del Flujo', actionType: 'trigger' },
    position: { x: 250, y: 100 },
  },
]

export function FlowBuilder({ initialData }: { initialData: AutomationFlow }) {
  const router = useRouter()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes?.length ? initialData.nodes : initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges || [])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [flowMeta, setFlowMeta] = useState({
    name: initialData.name,
    description: initialData.description || '',
    trigger_type: initialData.trigger_type,
    trigger_keywords: initialData.trigger_keywords?.join(', ') || '',
    instance_id: initialData.instance_id || '',
    is_active: initialData.is_active,
  })
  const [departments, setDepartments] = useState<any[]>([])

  useEffect(() => {
    getDepartmentsAction().then(res => {
      if (res.success && res.data) {
        setDepartments(res.data)
      }
    })
  }, [])
  const [instances, setInstances] = useState<{id: string, name: string}[]>([])
  const [rfInstance, setRfInstance] = useState<any>(null)

  useEffect(() => {
    getInstancesListAction().then(res => {
      if (res.success && res.data) {
        setInstances(res.data)
      }
    })
  }, [])

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, type: 'deletable' }, eds)), [setEdges])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const addNode = (type: string, label: string) => {
    // If we have an instance, place it in the center of the current view roughly
    let position = { x: Math.random() * 200 + 100, y: Math.random() * 200 + 200 }
    
    if (rfInstance) {
      const { x, y, zoom } = rfInstance.getViewport()
      position = {
        x: (-x + window.innerWidth / 2 - 300) / zoom,
        y: (-y + window.innerHeight / 2) / zoom,
      }
    }

    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type: 'custom',
      position,
      data: { label, actionType: type, content: '', options: type === 'menu' ? ['1', '2', '3'] : undefined },
    }
    setNodes((nds) => nds.concat(newNode))
  }

  const onDragStart = (event: React.DragEvent, type: string, label: string) => {
    event.dataTransfer.setData('application/reactflow/type', type)
    event.dataTransfer.setData('application/reactflow/label', label)
    event.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow/type')
      const label = event.dataTransfer.getData('application/reactflow/label')

      if (typeof type === 'undefined' || !type || !rfInstance) {
        return
      }

      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: 'custom',
        position,
        data: { label, actionType: type, content: '', options: type === 'menu' ? ['1', '2', '3'] : undefined },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [rfInstance, setNodes]
  )

  const handleSave = async () => {
    if (!flowMeta.instance_id) {
      alert('Por favor, selecciona una Instancia de WhatsApp para este flujo.')
      return
    }

    setSaving(true)
    const keywordsArray = flowMeta.trigger_keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0)

    const payload = {
      name: flowMeta.name,
      description: flowMeta.description,
      trigger_type: flowMeta.trigger_type,
      trigger_keywords: keywordsArray,
      instance_id: flowMeta.instance_id,
      nodes,
      edges,
    }

    const res = await updateFlowAction(initialData.id, payload)
    
    setSaving(false)
    if (res.success) {
      alert('Flujo guardado exitosamente')
    } else {
      alert(res.error)
    }
  }

  const updateSelectedNodeData = (key: string, value: any) => {
    if (!selectedNode) return
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          const newData = { ...n.data, [key]: value }
          if (key === 'content' && selectedNode.data.actionType === 'message') {
             newData.label = value ? `Mensaje: ${String(value).substring(0,20)}...` : 'Enviar Mensaje'
          }
          if (key === 'content' && selectedNode.data.actionType === 'menu') {
             newData.label = value ? `Menú: ${String(value).substring(0,20)}...` : 'Menú Numérico'
          }
          return { ...n, data: newData }
        }
        return n
      })
    )
    setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, [key]: value } } : null)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    setUploading(true)
    try {
      const res = await getUploadUrlAction(file.name, file.type)
      if (!res.success) throw new Error(res.error || 'Error al obtener URL')
      if (!res.data) throw new Error('Error al obtener URL')
      
      const { uploadUrl, publicUrl } = res.data

      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })

      updateSelectedNodeData('url', publicUrl)
    } catch (err) {
      console.error(err)
      alert('Error al subir la imagen. Verifica la configuración de MinIO.')
    } finally {
      setUploading(false)
    }
  }

  const EmojiButton = ({ onEmojiSelect }: { onEmojiSelect: (emoji: string) => void }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground">
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="end" side="right">
        <EmojiPicker onEmojiClick={(e) => onEmojiSelect(e.emoji)} width="100%" />
      </PopoverContent>
    </Popover>
  )

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/automations')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Input 
              value={flowMeta.name} 
              onChange={e => setFlowMeta(p => ({ ...p, name: e.target.value }))}
              className="h-8 font-medium w-64 border-transparent hover:border-input focus-visible:border-input"
            />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar Flujo
        </Button>
      </div>

      {/* Main Builder Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar - Nodes Palette */}
        <div className="w-64 border-r bg-muted/20 p-4 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Añadir Nodo</h3>
            <div className="grid gap-2">
              <Button 
                variant="outline" 
                className="justify-start text-sm h-10 cursor-grab active:cursor-grabbing" 
                draggable
                onDragStart={(e) => onDragStart(e, 'message', 'Enviar Mensaje')}
                onClick={() => addNode('message', 'Enviar Mensaje')}
              >
                <MessageSquare className="w-4 h-4 mr-2 text-blue-500" />
                Mensaje Texto
              </Button>
              <Button 
                variant="outline" 
                className="justify-start text-sm h-10 cursor-grab active:cursor-grabbing" 
                draggable
                onDragStart={(e) => onDragStart(e, 'image', 'Enviar Imagen')}
                onClick={() => addNode('image', 'Enviar Imagen')}
              >
                <svg className="w-4 h-4 mr-2 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Imagen/Media
              </Button>
              <Button 
                variant="outline" 
                className="justify-start text-sm h-10 cursor-grab active:cursor-grabbing" 
                draggable
                onDragStart={(e) => onDragStart(e, 'menu', 'Menú Numérico')}
                onClick={() => addNode('menu', 'Menú Numérico')}
              >
                <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Menú Numérico
              </Button>
              <Button 
                variant="outline" 
                className="justify-start text-sm h-10 cursor-grab active:cursor-grabbing" 
                draggable
                onDragStart={(e) => onDragStart(e, 'delay', 'Retardo (Delay)')}
                onClick={() => addNode('delay', 'Retardo (Delay)')}
              >
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Retardo
              </Button>
              <Button 
                variant="outline" 
                className="justify-start text-sm h-10 cursor-grab active:cursor-grabbing" 
                draggable
                onDragStart={(e) => onDragStart(e, 'condition', 'Condición (If/Else)')}
                onClick={() => addNode('condition', 'Condición (If/Else)')}
              >
                <KeyRound className="w-4 h-4 mr-2 text-purple-500" />
                Condición
              </Button>
              <Button 
                variant="outline" 
                className="justify-start text-sm h-10 cursor-grab active:cursor-grabbing" 
                draggable
                onDragStart={(e) => onDragStart(e, 'handoff', 'Transferir a Humano')}
                onClick={() => addNode('handoff', 'Transferir a Humano')}
              >
                <ShieldAlert className="w-4 h-4 mr-2 text-orange-500" />
                Transferir Agente
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Config. Trigger</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-red-500 font-semibold">Instancia de WhatsApp *</Label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={flowMeta.instance_id}
                  onChange={e => setFlowMeta(p => ({ ...p, instance_id: e.target.value }))}
                >
                  <option value="" disabled>Selecciona una instancia...</option>
                  {instances.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">Requerido. El flujo se activará exclusivamente en esta instancia.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Tipo de Activador</Label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={flowMeta.trigger_type}
                  onChange={e => setFlowMeta(p => ({ ...p, trigger_type: e.target.value as any }))}
                >
                  <option value="keyword">Palabras Clave</option>
                  <option value="welcome">Mensaje de Bienvenida (Primer contacto)</option>
                  <option value="both">Ambos</option>
                </select>
              </div>

              {(flowMeta.trigger_type === 'keyword' || flowMeta.trigger_type === 'both') && (
                <div className="space-y-2">
                  <Label className="text-xs">Palabras Clave (separadas por coma)</Label>
                  <Textarea 
                    className="text-xs min-h-[60px]"
                    placeholder="ej: ayuda, soporte, precios"
                    value={flowMeta.trigger_keywords}
                    onChange={e => setFlowMeta(p => ({ ...p, trigger_keywords: e.target.value }))}
                  />
                  <p className="text-[10px] text-muted-foreground">El flujo se activará si el mensaje contiene alguna de estas palabras y la IA está desactivada.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 h-full relative" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlowProvider>
            <ReactFlow
              onInit={setRfInstance}
              nodes={nodes}
              edges={edges.map(e => ({ ...e, type: 'deletable' }))}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              fitView
              attributionPosition="bottom-right"
            >
              <Background color="#ccc" gap={16} />
              <Controls />
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        {/* Right Sidebar - Node Properties */}
        {selectedNode && (
          <div className="w-72 border-l bg-card p-4 flex flex-col gap-4 overflow-y-auto animate-in slide-in-from-right-2">
            <h3 className="font-semibold border-b pb-2">Propiedades del Nodo</h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">ID Nodo</Label>
                <Input value={selectedNode.id} disabled className="h-8 text-xs bg-muted/50" />
              </div>
              
              {selectedNode.data.actionType === 'message' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Contenido del Mensaje</Label>
                    <EmojiButton onEmojiSelect={(emoji) => updateSelectedNodeData('content', (selectedNode.data.content as string || '') + emoji)} />
                  </div>
                  <Textarea 
                    value={selectedNode.data.content as string || ''} 
                    onChange={e => updateSelectedNodeData('content', e.target.value)}
                    placeholder="Escribe el mensaje que enviará el bot..."
                    className="text-sm min-h-[100px]"
                  />
                </div>
              )}

              {selectedNode.data.actionType === 'handoff' && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Este nodo detendrá el flujo y marcará la conversación para que un humano la atienda.
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Asignar a un Departamento (Opcional)</Label>
                    <select 
                      className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={selectedNode.data.department_id as string || ''}
                      onChange={e => updateSelectedNodeData('department_id', e.target.value)}
                    >
                      <option value="">Cualquier Departamento</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {selectedNode.data.actionType === 'condition' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Validación de Palabra</Label>
                  <select 
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={selectedNode.data.operator as string || 'contains'}
                    onChange={e => updateSelectedNodeData('operator', e.target.value)}
                  >
                    <option value="contains">Contiene</option>
                    <option value="equals">Es exactamente</option>
                    <option value="startsWith">Comienza con</option>
                  </select>
                  <Input 
                    value={selectedNode.data.keyword as string || ''} 
                    onChange={e => updateSelectedNodeData('keyword', e.target.value)}
                    placeholder="ej: si, comprar"
                    className="h-8 text-sm mt-2"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Compara el próximo mensaje del usuario. El flujo irá por la rama "Match" o "No Match".
                  </p>
                </div>
              )}

              {selectedNode.data.actionType === 'delay' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Segundos a esperar</Label>
                  <Input 
                    type="number"
                    min="1"
                    max="60"
                    value={selectedNode.data.seconds as number || 5} 
                    onChange={e => updateSelectedNodeData('seconds', parseInt(e.target.value))}
                    className="h-8 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Simula que el bot está escribiendo.</p>
                </div>
              )}

              {selectedNode.data.actionType === 'image' && (
                <div className="space-y-3">
                  <Label className="text-xs">Subir Imagen</Label>
                  <Input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="text-xs"
                  />
                  {uploading && <p className="text-xs text-blue-500 animate-pulse">Subiendo a MinIO...</p>}
                  {Boolean(selectedNode.data.url) && (
                    <div className="mt-2 border rounded p-1">
                      <img src={selectedNode.data.url as string} alt="Preview" className="w-full h-auto max-h-32 object-contain" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Mensaje adjunto (Caption)</Label>
                      <EmojiButton onEmojiSelect={(emoji) => updateSelectedNodeData('content', (selectedNode.data.content as string || '') + emoji)} />
                    </div>
                    <Textarea 
                      value={selectedNode.data.content as string || ''} 
                      onChange={e => updateSelectedNodeData('content', e.target.value)}
                      placeholder="Opcional..."
                      className="text-sm min-h-[60px]"
                    />
                  </div>
                </div>
              )}

              {selectedNode.data.actionType === 'menu' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Mensaje del menú</Label>
                      <EmojiButton onEmojiSelect={(emoji) => updateSelectedNodeData('content', (selectedNode.data.content as string || '') + emoji)} />
                    </div>
                    <Textarea 
                      value={selectedNode.data.content as string || ''} 
                      onChange={e => updateSelectedNodeData('content', e.target.value)}
                      placeholder="1. Opción 1\n2. Opción 2..."
                      className="text-sm min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Opciones del Menú</Label>
                    {(selectedNode.data.options as string[] || ['1', '2', '3']).map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <Input 
                          value={opt}
                          onChange={e => {
                            const newOpts = [...(selectedNode.data.options as string[] || ['1', '2', '3'])]
                            newOpts[i] = e.target.value
                            updateSelectedNodeData('options', newOpts)
                          }}
                          className="h-8 text-sm"
                        />
                        <EmojiButton onEmojiSelect={(emoji) => {
                          const newOpts = [...(selectedNode.data.options as string[] || ['1', '2', '3'])]
                          newOpts[i] = (newOpts[i] || '') + emoji
                          updateSelectedNodeData('options', newOpts)
                        }} />
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 shrink-0"
                          onClick={() => {
                            const newOpts = [...(selectedNode.data.options as string[] || ['1', '2', '3'])]
                            newOpts.splice(i, 1)
                            updateSelectedNodeData('options', newOpts)
                          }}
                        >
                          <Trash className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => {
                        const currentOpts = selectedNode.data.options as string[] || ['1', '2', '3']
                        updateSelectedNodeData('options', [...currentOpts, `Nueva Opción`])
                      }}
                    >
                      Añadir Opción
                    </Button>
                    <p className="text-[10px] text-muted-foreground mt-2">El flujo esperará por uno de estos textos/números y seguirá la rama correspondiente.</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-auto pt-4 border-t">
              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  setNodes(nds => nds.filter(n => n.id !== selectedNode.id))
                  setSelectedNode(null)
                }}
              >
                Eliminar Nodo
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
