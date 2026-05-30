'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Trash, Edit, Building } from 'lucide-react'
import { useOrg } from '@/components/auth/org-provider'
import { getDepartmentsAction, createDepartmentAction, deleteDepartmentAction, updateDepartmentAction } from '@/actions/team-actions'

export default function DepartmentsPage() {
  const { org } = useOrg()
  const { toast } = useToast()
  
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newDeptName, setNewDeptName] = useState('')
  const [newDeptDesc, setNewDeptDesc] = useState('')

  useEffect(() => {
    if (org?.id) loadDepartments()
  }, [org?.id])

  async function loadDepartments() {
    if (!org) return
    setLoading(true)
    const res = await getDepartmentsAction(org.id)
    if (res.success) {
      setDepartments(res.data)
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleCreate() {
    if (!org || !newDeptName.trim()) return
    const res = await createDepartmentAction(org.id, { name: newDeptName, description: newDeptDesc })
    if (res.success) {
      toast({ title: 'Departamento creado' })
      setIsCreating(false)
      setNewDeptName('')
      setNewDeptDesc('')
      loadDepartments()
    } else {
      toast({ title: 'Error al crear', description: res.error, variant: 'destructive' })
    }
  }

  async function handleDelete(id: string) {
    if (!org || !confirm('¿Estás seguro de eliminar este departamento?')) return
    const res = await deleteDepartmentAction(id, org.id)
    if (res.success) {
      toast({ title: 'Departamento eliminado' })
      loadDepartments()
    } else {
      toast({ title: 'Error al eliminar', description: res.error, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h3 className="text-lg font-medium">Departamentos</h3>
        <p className="text-sm text-muted-foreground">
          Crea áreas (ej. Ventas, Soporte) para enrutar chats a equipos específicos.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Departamentos Activos</CardTitle>
            <CardDescription>Lista de departamentos en tu organización.</CardDescription>
          </div>
          <Button onClick={() => setIsCreating(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Departamento
          </Button>
        </CardHeader>
        <CardContent>
          {isCreating && (
            <div className="mb-6 p-4 border rounded-md space-y-4 bg-muted/30">
              <div className="space-y-2">
                <Label>Nombre del Departamento</Label>
                <Input value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="Ej. Soporte Técnico" />
              </div>
              <div className="space-y-2">
                <Label>Descripción (Opcional)</Label>
                <Input value={newDeptDesc} onChange={e => setNewDeptDesc(e.target.value)} placeholder="Atención a clientes..." />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={!newDeptName.trim()}>Guardar</Button>
                <Button variant="outline" onClick={() => setIsCreating(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-4">Cargando...</div>
          ) : departments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
              <Building className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No tienes departamentos creados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map(dept => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="text-muted-foreground">{dept.description}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(dept.id)}>
                        <Trash className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
