'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { UserPlus, Trash, Users } from 'lucide-react'
import { getTeamMembersAction, inviteTeamMemberAction, removeTeamMemberAction, updateTeamMemberAction } from '@/actions/team-actions'
import { getRolesAction } from '@/actions/role-actions'

export default function UsersPage() {
  const [members, setMembers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteData, setInviteData] = useState({ email: '', roleId: '' })
  
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    const [teamRes, rolesRes] = await Promise.all([
      getTeamMembersAction(),
      getRolesAction()
    ])
    
    if (teamRes.success) setMembers(teamRes.data)
    else toast.error('Error al cargar usuarios', { description: teamRes.error })

    if (rolesRes.success) {
      setRoles(rolesRes.data)
      if (rolesRes.data.length > 0 && !inviteData.roleId) {
        setInviteData(prev => ({ ...prev, roleId: rolesRes.data[0].id }))
      }
    } else {
      toast.error('Error al cargar roles', { description: rolesRes.error })
    }
    
    setIsLoading(false)
  }

  const handleInvite = async () => {
    if (!inviteData.email.trim()) return toast.error('El correo es obligatorio')
    if (!inviteData.roleId) return toast.error('Debe seleccionar un rol')
    
    const res = await inviteTeamMemberAction(
      inviteData.email,
      inviteData.roleId
    )

    if (res.success) {
      toast.success('Usuario invitado exitosamente')
      setIsInviteModalOpen(false)
      fetchData()
    } else {
      toast.error('No se pudo invitar', { description: res.error })
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar a este usuario de la organización?')) return
    const res = await removeTeamMemberAction(id)
    if (res.success) {
      toast.success('Usuario eliminado')
      fetchData()
    } else {
      toast.error('Error al eliminar', { description: res.error })
    }
  }

  const handleRoleChange = async (id: string, newRoleId: string) => {
    const res = await updateTeamMemberAction(id, { role_id: newRoleId })
    if (res.success) {
      toast.success('Rol actualizado')
      fetchData()
    } else {
      toast.error('Error al cambiar rol', { description: res.error })
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Usuarios
          </h1>
          <p className="text-muted-foreground mt-1">Gestiona los usuarios de tu organización y sus roles de acceso.</p>
        </div>
        <Button onClick={() => setIsInviteModalOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Añadir Usuario
        </Button>
      </div>

      <div className="border rounded-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground text-xs uppercase font-medium">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Departamento Asignado</th>
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
                <td colSpan={5} className="h-24 text-center text-muted-foreground">No hay usuarios en la organización.</td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{m.users?.full_name || 'Invitado (Pendiente)'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.users?.email}</td>
                  <td className="px-4 py-3">
                    <Select value={m.role_id || ''} onValueChange={v => handleRoleChange(m.id, v)}>
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <SelectValue placeholder="Seleccionar Rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {m.departments?.name || 'Sin asignar'}
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
            <DialogTitle>Añadir Usuario a la Organización</DialogTitle>
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
              <p className="text-xs text-muted-foreground">El usuario debe haber creado su cuenta o recibir la invitación por correo.</p>
            </div>
            
            <div className="space-y-2">
              <Label>Rol de Acceso</Label>
              <Select value={inviteData.roleId} onValueChange={v => setInviteData({ ...inviteData, roleId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un Rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Nota: Para asignar este usuario a un departamento específico, ve a la sección de Departamentos.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite}>Invitar Usuario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
