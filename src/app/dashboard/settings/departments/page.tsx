'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Trash, Edit, Building, Users } from 'lucide-react'
import { 
  getDepartmentsAction, 
  createDepartmentAction, 
  deleteDepartmentAction, 
  updateDepartmentAction,
  getTeamMembersAction,
  assignUserToDepartmentAction
} from '@/actions/team-actions'

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<any>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assigningDept, setAssigningDept] = useState<any>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    const [deptsRes, teamRes] = await Promise.all([
      getDepartmentsAction(),
      getTeamMembersAction()
    ])
    if (deptsRes.success) setDepartments(deptsRes.data)
    else toast.error('Error al cargar departamentos')
    
    if (teamRes.success) setMembers(teamRes.data)
    else toast.error('Error al cargar agentes')
    
    setIsLoading(false)
  }

  const openModal = (dept?: any) => {
    if (dept) {
      setEditingDept(dept)
      setFormData({ name: dept.name, description: dept.description || '' })
    } else {
      setEditingDept(null)
      setFormData({ name: '', description: '' })
    }
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return toast.error('El nombre es obligatorio')

    if (editingDept) {
      const res = await updateDepartmentAction(editingDept.id, formData)
      if (res.success) {
        toast.success('Departamento actualizado')
        fetchData()
        setIsModalOpen(false)
      } else {
        toast.error('Error', { description: res.error })
      }
    } else {
      const res = await createDepartmentAction(formData)
      if (res.success) {
        toast.success('Departamento creado')
        fetchData()
        setIsModalOpen(false)
      } else {
        toast.error('Error', { description: res.error })
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este departamento?')) return
    const res = await deleteDepartmentAction(id)
    if (res.success) {
      toast.success('Departamento eliminado')
      fetchData()
    } else {
      toast.error('Error al eliminar', { description: res.error })
    }
  }

  const openAssignModal = (dept: any) => {
    setAssigningDept(dept)
    setSelectedUserId('')
    setIsAssignModalOpen(true)
  }

  const handleAssignAgent = async () => {
    if (!selectedUserId) return toast.error('Selecciona un agente primero')
    const userToAssign = members.find(m => m.user_id === selectedUserId)
    if (!userToAssign) return
    
    const res = await assignUserToDepartmentAction(selectedUserId, assigningDept.id)
    if (res.success) {
      toast.success('Agente asignado al departamento')
      setSelectedUserId('')
      fetchData()
    } else {
      toast.error('Error al asignar', { description: res.error })
    }
  }

  const handleRemoveAgent = async (userId: string) => {
    const res = await assignUserToDepartmentAction(userId, null)
    if (res.success) {
      toast.success('Agente removido del departamento')
      fetchData()
    } else {
      toast.error('Error al remover', { description: res.error })
    }
  }

  // Derived state for Assignment Modal
  const assignedMembers = members.filter(m => m.department_id === assigningDept?.id)
  const availableMembers = members.filter(m => m.department_id !== assigningDept?.id)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building className="w-6 h-6 text-primary" />
            Departamentos
          </h1>
          <p className="text-muted-foreground mt-1">Organiza a tu equipo por áreas de atención</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Departamento
        </Button>
      </div>

      <div className="border rounded-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground text-xs uppercase font-medium">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Agentes</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="h-24 text-center">Cargando...</td>
              </tr>
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={4} className="h-24 text-center text-muted-foreground">No hay departamentos creados.</td>
              </tr>
            ) : (
              departments.map((dept) => {
                const deptAgentsCount = members.filter(m => m.department_id === dept.id).length
                return (
                  <tr key={dept.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{dept.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{dept.description || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{deptAgentsCount} agente(s)</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openAssignModal(dept)} title="Gestionar Agentes">
                        <Users className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openModal(dept)} title="Editar Depto">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(dept.id)} title="Eliminar Depto">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Editar Departamento' : 'Nuevo Departamento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                placeholder="Ej. Ventas, Soporte, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input 
                value={formData.description} 
                onChange={e => setFormData({ ...formData, description: e.target.value })} 
                placeholder="Opcional..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Agentes en {assigningDept?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            
            <div className="border rounded-md">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground text-xs uppercase font-medium">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {assignedMembers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">Ningún agente asignado.</td>
                    </tr>
                  ) : (
                    assignedMembers.map(m => (
                      <tr key={m.id}>
                        <td className="px-4 py-3">{m.users?.full_name || m.users?.email}</td>
                        <td className="px-4 py-3">{m.roles?.name || 'Desconocido'}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveAgent(m.user_id)} className="text-red-500 h-8 px-2">
                            Remover
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 bg-muted/30 p-4 rounded-md border">
              <Label>Añadir agente al departamento</Label>
              <div className="flex gap-2">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar agente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.length === 0 ? (
                      <SelectItem value="none" disabled>No hay agentes disponibles</SelectItem>
                    ) : (
                      availableMembers.map(m => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.users?.full_name || m.users?.email} {m.department_id ? `(Depto actual: ${m.departments?.name})` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button onClick={handleAssignAgent} disabled={!selectedUserId || selectedUserId === 'none'}>Asignar</Button>
              </div>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
