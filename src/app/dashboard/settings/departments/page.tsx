'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus, Trash, Edit, Building } from 'lucide-react'
import { getDepartmentsAction, createDepartmentAction, deleteDepartmentAction, updateDepartmentAction } from '@/actions/team-actions'

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<any>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })
  
  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    setIsLoading(true)
    const res = await getDepartmentsAction()
    if (res.success) {
      setDepartments(res.data)
    } else {
      toast.error('Error al cargar departamentos', { description: res.error })
    }
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
        fetchDepartments()
        setIsModalOpen(false)
      } else {
        toast.error('Error', { description: res.error })
      }
    } else {
      const res = await createDepartmentAction(formData)
      if (res.success) {
        toast.success('Departamento creado')
        fetchDepartments()
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
      fetchDepartments()
    } else {
      toast.error('Error al eliminar', { description: res.error })
    }
  }

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
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="h-24 text-center">Cargando...</td>
              </tr>
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={3} className="h-24 text-center text-muted-foreground">No hay departamentos creados.</td>
              </tr>
            ) : (
              departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{dept.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{dept.description || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openModal(dept)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(dept.id)}>
                      <Trash className="w-4 h-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))
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
    </div>
  )
}
