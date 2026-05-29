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
} from 'lucide-react'
import {
  closeConversationAction,
  reopenConversationAction,
  transferConversationAction,
  scheduleReminderAction,
  getOrgUsersAction,
} from '@/actions/conversation-actions'

interface ConversationActionsMenuProps {
  conversationId: string
  status: 'open' | 'closed' | 'pending'
  onStatusChange?: () => void
}

type ActiveModal = 'none' | 'close' | 'transfer' | 'reminder'

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
  const [orgUsers, setOrgUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [loadingUsers, setLoadingUsers] = useState(false)

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
    setLoadingUsers(true)
    const res = await getOrgUsersAction()
    setLoadingUsers(false)
    if (res.success) setOrgUsers(res.data)
  }

  async function handleClose() {
    setLoading(true)
    const res = await closeConversationAction(conversationId, sendSurvey)
    setLoading(false)
    if (!res.success) {
      showFeedback(false, res.error ?? 'Error al cerrar')
    } else {
      showFeedback(true, sendSurvey
        ? 'Conversación cerrada y encuesta enviada ✓'
        : 'Conversación cerrada ✓')
      setModal('none')
    }
  }

  async function handleReopen() {
    setLoading(true)
    const res = await reopenConversationAction(conversationId)
    setLoading(false)
    showFeedback(res.success, res.success ? 'Conversación reabierta ✓' : (res.error ?? 'Error'))
    setMenuOpen(false)
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
                  <div className="my-1 border-t" />
                </>
              )}
              {status === 'closed' && (
                <button
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                  onClick={handleReopen}
                >
                  <RotateCcw className="w-4 h-4 text-green-500" />
                  Reabrir conversación
                </button>
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

      {/* TRANSFER DIALOG */}
      <Dialog open={modal === 'transfer'} onOpenChange={open => !open && setModal('none')}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserRoundCog className="w-5 h-5 text-blue-500" />
              Transferir conversación
            </DialogTitle>
            <DialogDescription>
              Selecciona el agente que tomará el control de esta conversación.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            {loadingUsers ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
                {orgUsers.map(u => (
                  <label
                    key={u.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedUser === u.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="transfer-user"
                      value={u.id}
                      checked={selectedUser === u.id}
                      onChange={() => setSelectedUser(u.id)}
                      className="accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.role}</p>
                    </div>
                  </label>
                ))}
                {orgUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay otros usuarios disponibles
                  </p>
                )}
              </div>
            )}

            {feedback && <Feedback success={feedback.success} message={feedback.message} />}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModal('none')}>Cancelar</Button>
            <Button onClick={handleTransfer} disabled={loading || !selectedUser}>
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
