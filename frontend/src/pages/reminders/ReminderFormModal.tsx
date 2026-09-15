import { type FormEvent, useEffect, useState } from "react"

import { CategorySelect } from "@/components/CategorySelect"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"
import { useCategories } from "@/hooks/useCategories"
import { extractErrorMessage } from "@/services/api"
import type { Reminder, ReminderPayload } from "@/types/reminder"
import type { Priority, RecurrenceType } from "@/types/task"
import { PRIORITY_LABEL, RECURRENCE_LABEL } from "@/utils/taskMeta"

interface ReminderFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: ReminderPayload) => Promise<void>
  reminder?: Reminder | null
}

interface ReminderFormState {
  name: string
  description: string
  due_date: string
  priority: Priority
  category_id: string
  recurrence: RecurrenceType
  advance_notice_days: string
}

const EMPTY_FORM: ReminderFormState = {
  name: "",
  description: "",
  due_date: "",
  priority: "medium",
  category_id: "",
  recurrence: "none",
  advance_notice_days: "30, 7, 1",
}

export function ReminderFormModal({ isOpen, onClose, onSubmit, reminder }: ReminderFormModalProps) {
  const { categories, createCategory } = useCategories("reminder")
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (reminder) {
      setForm({
        name: reminder.name,
        description: reminder.description ?? "",
        due_date: reminder.due_date,
        priority: reminder.priority,
        category_id: reminder.category_id ?? "",
        recurrence: reminder.recurrence,
        advance_notice_days: reminder.advance_notice_days.join(", "),
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setError(null)
  }, [isOpen, reminder])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const advanceNoticeDays = form.advance_notice_days
        .split(",")
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isInteger(value) && value >= 0)
        .sort((a, b) => b - a)

      await onSubmit({
        name: form.name,
        description: form.description || null,
        due_date: form.due_date,
        priority: form.priority,
        category_id: form.category_id || null,
        recurrence: form.recurrence,
        advance_notice_days: advanceNoticeDays,
      })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos guardar el recordatorio."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title={reminder ? "Editar recordatorio" : "Nuevo recordatorio"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          label="Nombre"
          required
          placeholder="Ej: Seguro del auto"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />

        <Textarea
          label="Descripción"
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Fecha de vencimiento"
            type="date"
            required
            value={form.due_date}
            onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))}
          />
          <Select
            label="Prioridad"
            value={form.priority}
            onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as Priority }))}
          >
            {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <CategorySelect
            categories={categories}
            value={form.category_id}
            onChange={(categoryId) => setForm((current) => ({ ...current, category_id: categoryId }))}
            onCreate={createCategory}
          />
          <Select
            label="Repetición"
            value={form.recurrence}
            onChange={(event) => setForm((current) => ({ ...current, recurrence: event.target.value as RecurrenceType }))}
          >
            {Object.entries(RECURRENCE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <Input
          label="Avisarme (días antes)"
          hint="Separados por coma, por ejemplo: 30, 7, 1"
          value={form.advance_notice_days}
          onChange={(event) => setForm((current) => ({ ...current, advance_notice_days: event.target.value }))}
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {reminder ? "Guardar cambios" : "Crear recordatorio"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
