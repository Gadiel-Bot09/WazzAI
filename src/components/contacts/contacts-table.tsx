'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MessageSquare,
  Loader2,
  Users,
  ChevronLeft,
  ChevronRight,
  Ban,
} from 'lucide-react'
import Link from 'next/link'
import { getContactsAction, deleteContactAction } from '@/actions/contacts'
import type { Contact } from '@/actions/contacts'
import { ContactFormDialog } from './contact-form-dialog'
import { ImportExportControls } from './import-export-controls'

const PAGE_SIZE = 25

function formatPhone(phone: string) {
  // Strip any non-numeric chars except +
  return phone.length > 10 ? `+${phone}` : phone
}

function ContactAvatar({ name, phone }: { name?: string | null; phone: string }) {
  const initials = name
    ? name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : phone.slice(-2)
  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-indigo-500',
  ]
  const color = colors[(phone.charCodeAt(0) + phone.charCodeAt(phone.length - 1)) % colors.length]
  return (
    <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
      {initials}
    </div>
  )
}

export function ContactsTable() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)
  const [deleting, setDeleting] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const res = await getContactsAction({ search: debouncedSearch, page, pageSize: PAGE_SIZE })
    setLoading(false)
    if (res.success) {
      setContacts(res.data.contacts)
      setTotal(res.data.total)
    }
  }, [debouncedSearch, page])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      setDebouncedSearch(search)
    }, 350)
  }, [search])

  function openCreate() {
    setEditingContact(null)
    setFormOpen(true)
  }

  function openEdit(contact: Contact) {
    setEditingContact(contact)
    setFormOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteContactAction(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    fetchContacts()
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Top Bar ── */}
      <div className="flex flex-col gap-4 pb-4 border-b">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Search */}
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="contacts-search"
              placeholder="Buscar por nombre, teléfono o email…"
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <Button onClick={openCreate} size="sm" className="flex-shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo contacto
          </Button>
        </div>

        {/* Import / Export */}
        <ImportExportControls onImportSuccess={fetchContacts} />
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto mt-1">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <Users className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">
              {debouncedSearch ? 'No se encontraron contactos con esa búsqueda.' : 'Aún no tienes contactos. Los números que te escriban por WhatsApp se guardarán automáticamente.'}
            </p>
            {!debouncedSearch && (
              <Button size="sm" variant="outline" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Crear primer contacto
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Contacto</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Teléfono</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Etiquetas</th>
                  <th className="text-left px-4 py-3 font-medium hidden xl:table-cell">Creado</th>
                  <th className="text-right px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contacts.map(contact => (
                  <tr
                    key={contact.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {/* Contacto */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ContactAvatar name={contact.name} phone={contact.phone_number} />
                        <div>
                          <div className="font-medium flex items-center gap-1.5">
                            {contact.name || contact.phone_number}
                            {contact.is_blocked && (
                              <Ban className="w-3 h-3 text-destructive" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground sm:hidden">
                            {formatPhone(contact.phone_number)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Teléfono */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-mono text-xs">{formatPhone(contact.phone_number)}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {contact.email ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="text-xs truncate max-w-[180px]">{contact.email}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>

                    {/* Etiquetas */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.length > 0 ? (
                          contact.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px] py-0">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                        {contact.tags.length > 3 && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            +{contact.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Creado */}
                    <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground">
                      {new Date(contact.created_at).toLocaleDateString('es', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/dashboard/chat?contact=${contact.id}`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>Ver conversaciones</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(contact)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteTarget(contact)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && total > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t pt-3 mt-3 text-sm text-muted-foreground">
          <span>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total} contactos
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}
      <ContactFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editingContact}
        onSuccess={fetchContacts}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar contacto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará{' '}
              <strong>{deleteTarget?.name || deleteTarget?.phone_number}</strong> permanentemente.
              Sus conversaciones no se eliminarán, pero quedarán sin contacto asociado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
