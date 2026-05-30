'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { UserPlus, Trash, User } from 'lucide-react'
import { useOrg } from '@/components/auth/org-provider'
import { getTeamMembersAction, inviteTeamMemberAction, removeTeamMemberAction, updateTeamMemberAction, getDepartmentsAction } from '@/actions/team-actions'

export default function TeamPage() {
  const { org } = useOrg()
  const { toast } = useToast()
  
  const [members, setMembers] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isInviting, setIsInviting] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('agent')
  const [newDeptId, setNewDeptId] = useState('none')

  useEffect(() => {
    if (org?.id) {
      loadData()
    }
  }, [org?.id])

  async function loadData() {
    if (!org) return
    setLoading(true)
    const [membersRes, deptsRes] = await Promise.all([
      getTeamMembersAction(org.id),
      getDepartmentsAction(org.id)
    ])
    
    if (membersRes.success) setMembers(membersRes.data)
    if (deptsRes.success) setDepartments(deptsRes.data)
    setLoading(false)
  }

  async function handleInvite() {
    if (!org || !newEmail.trim()) return
    toast({ title: 'Invitando usuario...' })
    
    const deptIdToPass = newDeptId === 'none' ? undefined : newDeptId
    const res = await inviteTeamMemberAction(org.id, newEmail, newRole, deptIdToPass)
    
    if (res.success) {
      toast({ title: 'Usuario invitado al equipo' })
      setIsInviting(false)
      setNewEmail('')
      loadData()
    } else {
      toast({ title: 'Error al invitar', description: res.error, variant: 'destructive' })
    }
  }

  async function handleRemove(id: string) {
    if (!org || !confirm('¿Estás seguro de eliminar este miembro del equipo?')) return
    const res = await removeTeamMemberAction(id, org.id)
    if (res.success) {
      toast({ title: 'Miembro eliminado' })
      loadData()
    } else {
      toast({ title: 'Error al eliminar', description: res.error, variant: 'destructive' })
    }
  }

  async function handleUpdateRole(id: string, role: string) {
    if (!org) return
    const res = await updateTeamMemberAction(id, org.id, { role })
    if (res.success) loadData()
  }

  async function handleUpdateDepartment(id: string, departmentId: string) {
    if (!org) return
    const payload = departmentId === 'none' ? { department_id: null } : { department_id: departmentId }
    const res = await updateTeamMemberAction(id, org.id, payload)
    if (res.success) loadData()
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h3 className="text-lg font-medium">Equipo y Agentes</h3>
        <p className="text-sm text-muted-foreground">
          Invita agentes, asígnales roles y enrúta los chats a su departamento correspondiente.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Miembros del Equipo</CardTitle>
            <CardDescription>Usuarios con acceso a tu organización.</CardDescription>
          </div>
          <Button onClick={() => setIsInviting(true)} size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            Invitar Miembro
          </Button>
        </CardHeader>
        <CardContent>
          {isInviting && (
            <div className="mb-6 p-4 border rounded-md space-y-4 bg-muted/30">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="agente@empresa.com" />
                </div>
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="agent">Agente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Select value={newDeptId} onValueChange={setNewDeptId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin departamento (General)</SelectItem>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleInvite} disabled={!newEmail.trim()}>Enviar Invitación</Button>
                <Button variant="outline" onClick={() => setIsInviting(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-4">Cargando...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
              <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No tienes miembros en tu equipo.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map(member => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.users?.full_name || 'Usuario'}</TableCell>
                    <TableCell className="text-muted-foreground">{member.users?.email}</TableCell>
                    <TableCell>
                      <Select value={member.role} onValueChange={(val) => handleUpdateRole(member.id, val)}>
                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="agent">Agente</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={member.department_id || 'none'} 
                        onValueChange={(val) => handleUpdateDepartment(member.id, val)}
                      >
                        <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">General</SelectItem>
                          {departments.map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(member.id)}>
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
