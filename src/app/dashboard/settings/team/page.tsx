'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { UserPlus, Trash, User } from 'lucide-react'
import { getTeamMembersAction, inviteTeamMemberAction, removeTeamMemberAction, updateTeamMemberAction, getDepartmentsAction } from '@/actions/team-actions'

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteData, setInviteData] = useState({ email: '', role: 'agent', departmentId: 'none' })
  
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    const [teamRes, deptsRes] = await Promise.all([
      getTeamMembersAction(),
      getDepartmentsAction()
    ])
    
    if (teamRes.success) setMembers(teamRes.data)
    else toast.error('Error al cargar equipo', { description: teamRes.error })

    if (deptsRes.success) setDepartments(deptsRes.data)
    else toast.error('Error al cargar departamentos', { description: deptsRes.error })
    
    setIsLoading(false)
  }

  const handleInvite = async () => {
    if (!inviteData.email.trim()) return toast.error('El correo es obligatorio')
    
    const res = await inviteTeamMemberAction(
      inviteData.email,
      inviteData.role,
      inviteData.departmentId === 'none' ? undefined : inviteData.departmentId
    )

    if (res.success) {
      toast.success('Miembro invitado exitosamente')
      setIsInviteModalOpen(false)
      fetchData()
    } else {
      toast.error('No se pudo invitar', { description: res.error })
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar a este miembro del equipo?')) return
    const res = await removeTeamMemberAction(id)
    if (res.success) {
      toast.success('Miembro eliminado')
      fetchData()
    } else {
      toast.error('Error al eliminar', { description: res.error })
    }
  }

  const handleRoleChange = async (id: string, newRole: string) => {
    const res = await updateTeamMemberAction(id, { role: newRole })
    if (res.success) fetchData()
    else toast.error('Error al cambiar rol', { description: res.error })
  }

  const handleDepartmentChange = async (id: string, newDeptId: string) => {
    const res = await updateTeamMemberAction(id, { department_id: newDeptId === 'none' ? undefined : newDeptId })
    if (res.success) fetchData()
    else toast.error('Error al cambiar departamento', { description: res.error })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Equipo
          </h1>
          <p className="text-muted-foreground mt-1">Gestiona los agentes y administradores de tu organización.</p>
        </div>
        <Button onClick={() => setIsInviteModalOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invitar Miembro
        </Button>
      </div>

      <div className="border rounded-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground text-xs uppercase font-medium">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Departamento</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="h-24 text-center">Cargando...</td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={5} className="h-24 text-center text-muted-foreground">No hay miembros en el equipo.</td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{m.users?.full_name || 'Sin nombre'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.users?.email}</td>
                  <td className="px-4 py-3">
                    <Select value={m.role} onValueChange={v => handleRoleChange(m.id, v)}>
                      <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="agent">Agente</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Select value={m.department_id || 'none'} onValueChange={v => handleDepartmentChange(m.id, v)}>
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin asignar</SelectItem>
                        {departments.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(m.id)}>
                      <Trash className="w-4 h-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar al equipo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Correo del usuario</Label>
              <Input 
                type="email"
                value={inviteData.email} 
                onChange={e => setInviteData({ ...inviteData, email: e.target.value })} 
                placeholder="ejemplo@correo.com"
              />
              <p className="text-xs text-muted-foreground">El usuario ya debe haber iniciado sesión al menos una vez en la app.</p>
            </div>
            
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={inviteData.role} onValueChange={v => setInviteData({ ...inviteData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="agent">Agente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={inviteData.departmentId} onValueChange={v => setInviteData({ ...inviteData, departmentId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite}>Invitar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
