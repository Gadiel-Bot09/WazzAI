'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Plus, Trash, Edit, ShieldAlert } from 'lucide-react'
import { getRolesAction, createRoleAction, updateRoleAction, deleteRoleAction } from '@/actions/role-actions'

const PERMISSION_GROUPS = [
  {
    category: 'Chat en Vivo',
    permissions: [
      { id: 'can_reply_chat', label: 'Responder chats (Chat en vivo)' },
      { id: 'can_close_chat', label: 'Cerrar chats' },
      { id: 'can_reopen_chat', label: 'Reabrir chats' },
      { id: 'can_transfer_chat', label: 'Transferir chat a otro agente' },
      { id: 'can_view_all_chats', label: 'Ver todos los chats de la organización (no solo los propios)' },
    ]
  },
  {
    category: 'Contactos y Analíticas',
    permissions: [
      { id: 'can_manage_contacts', label: 'Gestionar Contactos' },
      { id: 'can_view_analytics', label: 'Ver Analíticas y Reportes' },
    ]
  },
  {
    category: 'Configuración y Equipo',
    permissions: [
      { id: 'can_manage_team', label: 'Gestionar Usuarios y Roles' },
      { id: 'can_manage_departments', label: 'Gestionar Departamentos' },
      { id: 'can_manage_automations', label: 'Gestionar Automatizaciones (Flujos)' },
      { id: 'can_manage_settings', label: 'Acceder a Configuración y Facturación' },
    ]
  }
]

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<any>(null)
  const [formData, setFormData] = useState({ name: '', permissions: {} as Record<string, boolean> })
  
  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    setIsLoading(true)
    const res = await getRolesAction()
    if (res.success) {
      setRoles(res.data)
    } else {
      toast.error('Error al cargar roles', { description: res.error })
    }
    setIsLoading(false)
  }

  const openModal = (role?: any) => {
    if (role) {
      setEditingRole(role)
      setFormData({ name: role.name, permissions: role.permissions || {} })
    } else {
      setEditingRole(null)
      setFormData({ name: '', permissions: {} })
    }
    setIsModalOpen(true)
  }

  const handleTogglePermission = (id: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [id]: checked
      }
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return toast.error('El nombre es obligatorio')

    if (editingRole) {
      const res = await updateRoleAction(editingRole.id, formData)
      if (res.success) {
        toast.success('Rol actualizado')
        fetchRoles()
        setIsModalOpen(false)
      } else {
        toast.error('Error al actualizar', { description: res.error })
      }
    } else {
      const res = await createRoleAction(formData)
      if (res.success) {
        toast.success('Rol creado exitosamente')
        fetchRoles()
        setIsModalOpen(false)
      } else {
        toast.error('Error al crear', { description: res.error })
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este rol? Los usuarios con este rol podrían perder acceso a ciertas funciones.')) return
    const res = await deleteRoleAction(id)
    if (res.success) {
      toast.success('Rol eliminado')
      fetchRoles()
    } else {
      toast.error('Error al eliminar', { description: res.error })
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            Roles y Permisos
          </h1>
          <p className="text-muted-foreground mt-1">Crea roles personalizados y limita el acceso de tus agentes</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Rol
        </Button>
      </div>

      <div className="border rounded-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground text-xs uppercase font-medium">
            <tr>
              <th className="px-4 py-3">Nombre del Rol</th>
              <th className="px-4 py-3">Permisos Activos</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="h-24 text-center">Cargando...</td>
              </tr>
            ) : roles.length === 0 ? (
              <tr>
                <td colSpan={3} className="h-24 text-center text-muted-foreground">No hay roles creados.</td>
              </tr>
            ) : (
              roles.map((role) => {
                const activePermsCount = Object.values(role.permissions || {}).filter(Boolean).length
                return (
                  <tr key={role.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{role.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{activePermsCount} permiso(s)</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openModal(role)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(role.id)}>
                        <Trash className="w-4 h-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Editar Rol' : 'Nuevo Rol'}</DialogTitle>
            <DialogDescription>Configura los permisos detallados para este perfil.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Nombre del Rol</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                placeholder="Ej. Asesor Comercial, Soporte Nivel 1"
              />
            </div>
            
            <div className="space-y-4">
              <Label className="text-sm font-semibold">Permisos del Sistema</Label>
              
              {PERMISSION_GROUPS.map((group, idx) => (
                <div key={idx} className="space-y-3 border rounded-md p-4 bg-muted/30">
                  <h3 className="font-medium text-sm text-primary">{group.category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.permissions.map(perm => (
                      <div key={perm.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={perm.id} 
                          checked={!!formData.permissions[perm.id]}
                          onCheckedChange={(checked) => handleTogglePermission(perm.id, checked as boolean)}
                        />
                        <label 
                          htmlFor={perm.id} 
                          className="text-sm font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {perm.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
