'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  MoreVertical,
  XCircle,
  UserRoundCog,
  Bell,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from 'lucide-react'
import {
  closeConversationAction,
  reopenConversationAction,
  transferConversationAction,
  scheduleReminderAction,
  getTransferTargetsAction,
  deleteConversationAction,
  reassignConversationAction
} from '@/actions/conversation-actions'

interface ConversationActionsMenuProps {
  conversationId: string
  status: 'open' | 'closed' | 'pending'
  onStatusChange?: () => void
}

type ActiveModal = 'none' | 'close' | 'transfer' | 'reminder' | 'delete'

function Feedback({ success, message }: { success: boolean; message: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${
      success ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-destructive/10 text-destructive'
    }`}>
      {success
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      {message}
    </div>
  )
}

export function ConversationActionsMenu({
  conversationId,
  status,
  onStatusChange,
}: ConversationActionsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState<ActiveModal>('none')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null)

  // Transfer state
  const [departments, setDepartments] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [selectedDept, setSelectedDept] = useState<string>('none')
  const [selectedUser, setSelectedUser] = useState<string>('none')
  const [loadingTargets, setLoadingTargets] = useState(false)

  // Reminder state
  const [reminderMsg, setReminderMsg] = useState('')
  const [reminderAt, setReminderAt] = useState('')

  // Close survey option
  const [sendSurvey, setSendSurvey] = useState(true)

  function showFeedback(success: boolean, message: string) {
    setFeedback({ success, message })
    setTimeout(() => {
      setFeedback(null)
      if (success) onStatusChange?.()
    }, 2500)
  }

  async function openTransfer() {
    setModal('transfer')
    setMenuOpen(false)
    setLoadingTargets(true)
    const res = await getTransferTargetsAction()
    setLoadingTargets(false)
    if (res.success) {
      setDepartments(res.data.departments)
      setTeamMembers(res.data.members)
    }
  }

  async function handleClose() {
    setLoading(true)
    const res = await closeConversationAction(conversationId, sendSurvey)
    setLoading(false)
    if (!res.success) {
      showFeedback(false, res.error || 'Error al cerrar')
    } else {
      showFeedback(true, 'Conversación cerrada')
      setTimeout(() => setModal('none'), 1000)
    }
  }

  async function handleReopen() {
    setLoading(true)
    const res = await reopenConversationAction(conversationId)
    setLoading(false)
    if (!res.success) {
      showFeedback(false, res.error || 'Error al reabrir')
    } else {
      showFeedback(true, 'Conversación reabierta')
      setTimeout(() => {
        setMenuOpen(false)
      }, 1000)
    }
  }

  async function handleTransfer() {
    if (!selectedUser) return
    setLoading(true)
    const res = await transferConversationAction(conversationId, selectedUser)
    setLoading(false)
    if (!res.success) {
      showFeedback(false, res.error ?? 'Error al transferir')
    } else {
      showFeedback(true, 'Conversación transferida ✓')
      setModal('none')
    }
  }

  async function handleReminder() {
    if (!reminderMsg.trim() || !reminderAt) return
    setLoading(true)
    const res = await scheduleReminderAction(conversationId, reminderMsg, reminderAt)
    setLoading(false)
    if (!res.success) {
      showFeedback(false, res.error ?? 'Error al programar')
    } else {
      showFeedback(true, 'Recordatorio programado ✓')
      setModal('none')
      setReminderMsg('')
      setReminderAt('')
    }
  }

  // Min datetime: 5 minutes from now
  const minDatetime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)

  return (
    <>
      {/* Feedback toast outside dialogs */}
      {feedback && !modal && (
        <div className="absolute top-3 right-3 z-50 min-w-[240px] max-w-xs animate-in slide-in-from-top-2">
          <Feedback success={feedback.success} message={feedback.message} />
        </div>
      )}

      {/* Menu Button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          id="conv-actions-btn"
          onClick={() => setMenuOpen(v => !v)}
        >
          <MoreVertical className="w-5 h-5 text-muted-foreground" />
        </Button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-10 z-50 w-52 rounded-lg border bg-background shadow-lg py-1 animate-in fade-in slide-in-from-top-1">
              {status !== 'closed' && (
                <>
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                    onClick={() => { setModal('close'); setMenuOpen(false) }}
                  >
                    <XCircle className="w-4 h-4 text-orange-500" />
                    Cerrar conversación
                  </button>
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                    onClick={openTransfer}
                  >
                    <UserRoundCog className="w-4 h-4 text-blue-500" />
                    Transferir a usuario
                  </button>
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                    onClick={() => { setModal('reminder'); setMenuOpen(false) }}
                  >
                    <Bell className="w-4 h-4 text-violet-500" />
                    Programar recordatorio
                  </button>
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left text-red-600 dark:text-red-400"
                    onClick={() => { setModal('delete'); setMenuOpen(false) }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar conversación
                  </button>
                </>
              )}
              {status === 'closed' && (
                <>
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                    onClick={handleReopen}
                  >
                    <RotateCcw className="w-4 h-4 text-green-500" />
                    Reabrir conversación
                  </button>
                  <div className="my-1 border-t" />
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left text-red-600 dark:text-red-400"
                    onClick={() => { setModal('delete'); setMenuOpen(false) }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar conversación
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* CLOSE DIALOG */}
      <Dialog open={modal === 'close'} onOpenChange={open => !open && setModal('none')}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-orange-500" />
              Cerrar conversación
            </DialogTitle>
            <DialogDescription>
              Esto marcará la conversación como cerrada y la moverá al historial.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={sendSurvey}
                onChange={e => setSendSurvey(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <div>
                <p className="text-sm font-medium">Enviar encuesta de satisfacción</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  El contacto recibirá un mensaje de WhatsApp para calificar la atención del 1 al 5.
                </p>
              </div>
            </label>

            {feedback && <Feedback success={feedback.success} message={feedback.message} />}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModal('none')}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleClose}
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cerrar conversación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={modal === 'delete'} onOpenChange={open => !open && setModal('none')}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Eliminar conversación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar permanentemente esta conversación? Esta acción no se puede deshacer y borrará todos los mensajes asociados.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            {feedback && <Feedback success={feedback.success} message={feedback.message} />}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModal('none')}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TRANSFER DIALOG */}
      <Dialog open={modal === 'transfer'} onOpenChange={open => !open && setModal('none')}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserRoundCog className="w-5 h-5 text-blue-500" />
              Transferir o Reasignar chat
            </DialogTitle>
            <DialogDescription>
              Selecciona el departamento o agente al que deseas transferir esta conversación.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            {loadingTargets ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Asignar a Departamento</Label>
                  <select 
                    className="w-full flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                  >
                    <option value="none">Cualquiera (Bandeja general)</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Asignar a Agente Específico</Label>
                  <select 
                    className="w-full flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                  >
                    <option value="none">Sin asignar (En bandeja del departamento)</option>
                    {teamMembers.filter(m => selectedDept === 'none' || m.department_id === selectedDept || !m.department_id).map(m => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.users?.full_name || m.users?.email || 'Usuario'} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {feedback && <Feedback success={feedback.success} message={feedback.message} />}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModal('none')}>Cancelar</Button>
            <Button onClick={handleTransfer} disabled={loading || (selectedDept === 'none' && selectedUser === 'none')}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REMINDER DIALOG */}
      <Dialog open={modal === 'reminder'} onOpenChange={open => !open && setModal('none')}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-violet-500" />
              Programar recordatorio
            </DialogTitle>
            <DialogDescription>
              Recibirás una notificación en la fecha indicada para dar seguimiento a esta conversación.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="reminder-msg">Nota del recordatorio</Label>
              <Textarea
                id="reminder-msg"
                placeholder="Ej. Llamar al cliente para confirmar pedido"
                value={reminderMsg}
                onChange={e => setReminderMsg(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="reminder-at">Fecha y hora</Label>
              <Input
                id="reminder-at"
                type="datetime-local"
                value={reminderAt}
                min={minDatetime}
                onChange={e => setReminderAt(e.target.value)}
              />
            </div>

            {feedback && <Feedback success={feedback.success} message={feedback.message} />}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModal('none')}>Cancelar</Button>
            <Button
              onClick={handleReminder}
              disabled={loading || !reminderMsg.trim() || !reminderAt}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Programar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
