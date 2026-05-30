import React from 'react'
import { Handle, Position, NodeProps, useUpdateNodeInternals } from '@xyflow/react'
import { useEffect } from 'react'
import { MessageSquare, ShieldAlert, KeyRound, Clock, Image as ImageIcon, ListOrdered } from 'lucide-react'

// Icon helper
const getNodeIcon = (type: string) => {
  switch (type) {
    case 'message': return <MessageSquare className="w-4 h-4 text-blue-500" />
    case 'handoff': return <ShieldAlert className="w-4 h-4 text-orange-500" />
    case 'condition': return <KeyRound className="w-4 h-4 text-purple-500" />
    case 'delay': return <Clock className="w-4 h-4 text-gray-500" />
    case 'image': return <ImageIcon className="w-4 h-4 text-pink-500" />
    case 'menu': return <ListOrdered className="w-4 h-4 text-indigo-500" />
    default: return null
  }
}

export function CustomNode({ id, data, isConnectable }: NodeProps) {
  const isTrigger = data.label === 'Inicio del Flujo'
  const actionType = data.actionType as string
  const updateNodeInternals = useUpdateNodeInternals()
  const optionsString = JSON.stringify(data.options)

  useEffect(() => {
    updateNodeInternals(id)
  }, [optionsString, id, updateNodeInternals])

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm w-[200px] overflow-hidden text-sm">
      {!isTrigger && (
        <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-3 h-3" />
      )}
      
      <div className="p-3 border-b bg-muted/30 flex items-center gap-2">
        {getNodeIcon(actionType)}
        <span className="font-semibold truncate">{data.label as string}</span>
      </div>

      <div className="p-3 text-xs text-muted-foreground flex flex-col gap-1">
        {actionType === 'message' && <div className="truncate">{data.content ? data.content as string : 'Sin contenido'}</div>}
        {actionType === 'delay' && <div>Retardo: {(data.seconds as number) || 5}s</div>}
        {actionType === 'image' && <div className="truncate">{data.url ? 'Imagen cargada' : 'Sin imagen'}</div>}
        {actionType === 'handoff' && <div>Detiene IA y transfiere</div>}
        
        {/* Simple nodes description */}
        {(actionType !== 'condition' && actionType !== 'menu') && (
          <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-3 h-3" />
        )}

        {/* Condition Node Handles */}
        {actionType === 'condition' && (
          <div className="flex flex-col gap-2 mt-2">
            <div className="relative flex justify-between items-center bg-muted p-1 rounded">
              <span>Match</span>
              <Handle type="source" position={Position.Right} id="true" isConnectable={isConnectable} className="w-3 h-3 top-1/2 right-[-8px] translate-y-[-50%]" />
            </div>
            <div className="relative flex justify-between items-center bg-muted p-1 rounded">
              <span>No Match</span>
              <Handle type="source" position={Position.Right} id="false" isConnectable={isConnectable} className="w-3 h-3 top-1/2 right-[-8px] translate-y-[-50%]" />
            </div>
          </div>
        )}

        {/* Menu Node Handles */}
        {actionType === 'menu' && (
          <div className="flex flex-col gap-2 mt-2">
            {(data.options as string[] || ['1', '2', '3']).map((opt, i) => (
              <div key={i} className="relative flex justify-between items-center bg-muted p-1 rounded">
                <span className="truncate pr-4">{opt}</span>
                <Handle type="source" position={Position.Right} id={`opt-${i}`} isConnectable={isConnectable} className="w-3 h-3 top-1/2 right-[-8px] translate-y-[-50%]" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
