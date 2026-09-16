import { Bell, Plus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SearchInput } from "@/components/ui/SearchInput"
import { Skeleton } from "@/components/ui/Skeleton"
import { useCategories } from "@/hooks/useCategories"
import { extractErrorMessage } from "@/services/api"
import { reminderService } from "@/services/reminderService"
import { ReminderFormModal } from "@/pages/reminders/ReminderFormModal"
import { ReminderItem } from "@/pages/reminders/ReminderItem"
import { toast } from "@/store/toastStore"
import type { Reminder, ReminderPayload } from "@/types/reminder"

export function RemindersPage() {
  const { categories } = useCategories("reminder")
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [includeCompleted, setIncludeCompleted] = useState(false)
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [deletingReminder, setDeletingReminder] = useState<Reminder | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function loadReminders() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await reminderService.list({ include_completed: includeCompleted })
      setReminders(data)
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos cargar los recordatorios."))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadReminders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeCompleted])

  async function handleCreateOrUpdate(payload: ReminderPayload) {
    if (editingReminder) {
      await reminderService.update(editingReminder.id, payload)
      toast.success("Recordatorio actualizado.")
    } else {
      await reminderService.create(payload)
      toast.success("Recordatorio creado.")
    }
    await loadReminders()
  }

  async function handleToggleComplete(reminder: Reminder) {
    await reminderService.update(reminder.id, { is_completed: !reminder.is_completed })
    if (!reminder.is_completed) toast.success("¡Recordatorio resuelto!")
    await loadReminders()
  }

  async function handleDelete() {
    if (!deletingReminder) return
    setIsDeleting(true)
    try {
      await reminderService.remove(deletingReminder.id)
      setDeletingReminder(null)
      toast.success("Recordatorio eliminado.")
      await loadReminders()
    } catch (err) {
      toast.error(extractErrorMessage(err, "No pudimos eliminar el recordatorio."))
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredReminders = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return reminders
    return reminders.filter(
      (reminder) => reminder.name.toLowerCase().includes(query) || reminder.description?.toLowerCase().includes(query),
    )
  }, [reminders, search])

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Recordatorios y vencimientos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Seguros, suscripciones, documentos y todo lo que no querés olvidar.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingReminder(null)
            setIsFormOpen(true)
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          Nuevo recordatorio
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={includeCompleted}
            onChange={(event) => setIncludeCompleted(event.target.checked)}
            className="size-4 rounded border-slate-300 text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-600"
          />
          Mostrar resueltos
        </label>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar recordatorios..." className="sm:w-64" />
      </div>

      <Card className="px-5 py-2">
        {isLoading ? (
          <div className="flex flex-col gap-4 py-3">
            {[1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : reminders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-950/60 dark:text-brand-300">
              <Bell className="size-6" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No tenés recordatorios</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Agregá seguros, suscripciones o documentos para no olvidarte de renovarlos.
            </p>
          </div>
        ) : filteredReminders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Ningún recordatorio coincide con "{search}"
            </p>
          </div>
        ) : (
          <ul>
            {filteredReminders.map((reminder) => (
              <ReminderItem
                key={reminder.id}
                reminder={reminder}
                categories={categories}
                onToggleComplete={handleToggleComplete}
                onEdit={(item) => {
                  setEditingReminder(item)
                  setIsFormOpen(true)
                }}
                onDelete={setDeletingReminder}
              />
            ))}
          </ul>
        )}
      </Card>

      <ReminderFormModal
        isOpen={isFormOpen}
        reminder={editingReminder}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateOrUpdate}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingReminder)}
        title="Eliminar recordatorio"
        description={`¿Seguro que querés eliminar "${deletingReminder?.name}"?`}
        isConfirming={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingReminder(null)}
      />
    </div>
  )
}
