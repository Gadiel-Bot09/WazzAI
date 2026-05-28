'use client'

import { TeamMember } from '@/actions/settings'
import { User, Crown, Shield, UserCheck, Users } from 'lucide-react'

interface TeamListProps {
  members: TeamMember[]
}

const roleConfig: Record<string, { label: string; icon: any; color: string }> = {
  superadmin: { label: 'Super Admin', icon: Crown, color: 'text-yellow-500' },
  owner: { label: 'Propietario', icon: Shield, color: 'text-purple-500' },
  admin: { label: 'Administrador', icon: Shield, color: 'text-blue-500' },
  agent: { label: 'Agente', icon: UserCheck, color: 'text-green-500' },
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function TeamList({ members }: TeamListProps) {
  if (!members || members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No hay miembros en el equipo todavía.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
        {members.length} miembro{members.length !== 1 ? 's' : ''}
      </p>
      <div className="divide-y divide-border rounded-xl border overflow-hidden">
        {members.map((member) => {
          const role = roleConfig[member.role] ?? { label: member.role, icon: User, color: 'text-muted-foreground' }
          const RoleIcon = role.icon
          return (
            <div key={member.id} className="flex items-center gap-4 px-4 py-3 bg-card hover:bg-muted/30 transition-colors">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center flex-shrink-0">
                {getInitials(member.full_name || 'NN')}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.full_name || 'Sin nombre'}</p>
                <p className="text-xs text-muted-foreground truncate">{member.email || 'Sin email'}</p>
              </div>

              {/* Role */}
              <div className={`flex items-center gap-1.5 text-xs font-medium ${role.color}`}>
                <RoleIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{role.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground pt-2">
        La invitación de nuevos miembros estará disponible próximamente.
      </p>
    </div>
  )
}
