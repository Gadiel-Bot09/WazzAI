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
import { ArrowLeft, Save, Loader2, MessageSquare, ShieldAlert, KeyRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ui/switch'

const initialNodes: Node[] = [
  {
    id: 'trigger-1',
    type: 'default',
    data: { label: 'Inicio del Flujo' },
    position: { x: 250, y: 100 },
    style: { border: '1px solid #10b981', background: '#ecfdf5', borderRadius: '8px', padding: '10px' },
  },
]

export function FlowBuilder({ initialData }: { initialData: AutomationFlow }) {
  const router = useRouter()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes?.length ? initialData.nodes : initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges || [])
  const [saving, setSaving] = useState(false)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [flowMeta, setFlowMeta] = useState({
    name: initialData.name,
    description: initialData.description || '',
    trigger_type: initialData.trigger_type,
    trigger_keywords: initialData.trigger_keywords.join(', '),
  })

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const addNode = (type: string, label: string) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type: 'default',
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 200 },
      data: { label, actionType: type, content: '' },
      style: { borderRadius: '8px', padding: '10px', minWidth: '150px' }
    }
    setNodes((nds) => nds.concat(newNode))
  }

  const handleSave = async () => {
    setSaving(true)
    const keywordsArray = flowMeta.trigger_keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0)

    const res = await updateFlowAction(initialData.id, {
      name: flowMeta.name,
      description: flowMeta.description,
      trigger_type: flowMeta.trigger_type,
      trigger_keywords: keywordsArray,
      nodes,
      edges,
    })
    
    setSaving(false)
    if (res.success) {
      alert('Flujo guardado exitosamente')
    } else {
      alert(res.error)
    }
  }

  const updateSelectedNodeData = (key: string, value: string) => {
    if (!selectedNode) return
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          const newData = { ...n.data, [key]: value }
          // If label gets updated, reflect in UI
          if (key === 'content' && selectedNode.data.actionType === 'message') {
             newData.label = value ? `Mensaje: ${value.substring(0,20)}...` : 'Enviar Mensaje'
          }
          return { ...n, data: newData }
        }
        return n
      })
    )
    setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, [key]: value } } : null)
  }

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
              <Button variant="outline" className="justify-start text-sm h-10" onClick={() => addNode('message', 'Enviar Mensaje')}>
                <MessageSquare className="w-4 h-4 mr-2 text-blue-500" />
                Mensaje Texto
              </Button>
              <Button variant="outline" className="justify-start text-sm h-10" onClick={() => addNode('handoff', 'Transferir a Humano')}>
                <ShieldAlert className="w-4 h-4 mr-2 text-orange-500" />
                Transferir Agente
              </Button>
              <Button variant="outline" className="justify-start text-sm h-10" onClick={() => addNode('condition', 'Condición (If/Else)')}>
                <KeyRound className="w-4 h-4 mr-2 text-purple-500" />
                Condición
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Config. Trigger</h3>
            <div className="space-y-4">
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
        <div className="flex-1 h-full relative">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
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
                  <Label className="text-xs">Contenido del Mensaje</Label>
                  <Textarea 
                    value={selectedNode.data.content as string || ''} 
                    onChange={e => updateSelectedNodeData('content', e.target.value)}
                    placeholder="Escribe el mensaje que enviará el bot..."
                    className="text-sm min-h-[100px]"
                  />
                </div>
              )}

              {selectedNode.data.actionType === 'handoff' && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    Este nodo detendrá el flujo y marcará la conversación para que un humano la atienda (notificando en la bandeja de entrada).
                  </p>
                </div>
              )}

              {selectedNode.data.actionType === 'condition' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Palabra Clave Esperada</Label>
                  <Input 
                    value={selectedNode.data.keyword as string || ''} 
                    onChange={e => updateSelectedNodeData('keyword', e.target.value)}
                    placeholder="ej: si, no, comprar"
                    className="h-8 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    El flujo se pausará aquí hasta que el usuario responda. Si coincide, irá por la rama principal. (V1 soporta flujo lineal tras condición).
                  </p>
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
