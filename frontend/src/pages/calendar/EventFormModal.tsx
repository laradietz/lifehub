import { type FormEvent, useEffect, useState } from "react"

import { CategorySelect } from "@/components/CategorySelect"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"
import { useCategories } from "@/hooks/useCategories"
import { useHouseholds } from "@/hooks/useHouseholds"
import { extractErrorMessage } from "@/services/api"
import type { Event, EventPayload } from "@/types/event"
import { dateKeyFromIso } from "@/utils/calendar"
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/utils/datetime"

interface EventFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: EventPayload) => Promise<void>
  event?: Event | null
  defaultDate?: string | null
}

interface EventFormState {
  title: string
  description: string
  all_day: boolean
  start_at: string
  end_at: string
  location: string
  category_id: string
  household_id: string
}

const EMPTY_FORM: EventFormState = {
  title: "",
  description: "",
  all_day: false,
  start_at: "",
  end_at: "",
  location: "",
  category_id: "",
  household_id: "",
}

export function EventFormModal({ isOpen, onClose, onSubmit, event, defaultDate }: EventFormModalProps) {
  const { categories, createCategory } = useCategories("event")
  const { households } = useHouseholds()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (event) {
      setForm({
        title: event.title,
        description: event.description ?? "",
        all_day: event.all_day,
        start_at: event.all_day ? dateKeyFromIso(event.start_at) : toDatetimeLocalValue(event.start_at),
        end_at: event.end_at ? (event.all_day ? dateKeyFromIso(event.end_at) : toDatetimeLocalValue(event.end_at)) : "",
        location: event.location ?? "",
        category_id: event.category_id ?? "",
        household_id: event.household_id ?? "",
      })
    } else {
      setForm({ ...EMPTY_FORM, start_at: defaultDate ? `${defaultDate}T09:00` : "" })
    }
    setError(null)
  }, [isOpen, event, defaultDate])

  function handleAllDayToggle(checked: boolean) {
    setForm((current) => ({
      ...current,
      all_day: checked,
      start_at: checked
        ? current.start_at.slice(0, 10)
        : current.start_at.length === 10
          ? `${current.start_at}T09:00`
          : current.start_at,
      end_at: checked
        ? current.end_at.slice(0, 10)
        : current.end_at.length === 10
          ? `${current.end_at}T09:00`
          : current.end_at,
    }))
  }

  function toIso(value: string): string | null {
    if (!value) return null
    return form.all_day ? new Date(`${value}T00:00:00`).toISOString() : fromDatetimeLocalValue(value)
  }

  async function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const startAt = toIso(form.start_at)
      if (!startAt) {
        setError("La fecha de inicio es obligatoria.")
        return
      }
      await onSubmit({
        title: form.title,
        description: form.description || null,
        start_at: startAt,
        end_at: toIso(form.end_at),
        all_day: form.all_day,
        location: form.location || null,
        category_id: form.category_id || null,
        household_id: form.household_id || null,
      })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos guardar el evento."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title={event ? "Editar evento" : "Nuevo evento"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          label="Título"
          required
          value={form.title}
          onChange={(formEvent) => setForm((current) => ({ ...current, title: formEvent.target.value }))}
        />

        <Textarea
          label="Descripción"
          value={form.description}
          onChange={(formEvent) => setForm((current) => ({ ...current, description: formEvent.target.value }))}
        />

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={form.all_day}
            onChange={(formEvent) => handleAllDayToggle(formEvent.target.checked)}
            className="focus-ring size-4 rounded border-slate-300 text-brand-600 dark:border-slate-700"
          />
          Todo el día
        </label>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Inicio"
            required
            type={form.all_day ? "date" : "datetime-local"}
            value={form.start_at}
            onChange={(formEvent) => setForm((current) => ({ ...current, start_at: formEvent.target.value }))}
          />
          <Input
            label="Fin"
            type={form.all_day ? "date" : "datetime-local"}
            value={form.end_at}
            onChange={(formEvent) => setForm((current) => ({ ...current, end_at: formEvent.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <CategorySelect
            categories={categories}
            value={form.category_id}
            onChange={(categoryId) => setForm((current) => ({ ...current, category_id: categoryId }))}
            onCreate={createCategory}
          />
          <Input
            label="Ubicación"
            value={form.location}
            onChange={(formEvent) => setForm((current) => ({ ...current, location: formEvent.target.value }))}
          />
        </div>

        {households.length > 0 && (
          <Select
            label="Hogar"
            value={form.household_id}
            onChange={(formEvent) => setForm((current) => ({ ...current, household_id: formEvent.target.value }))}
          >
            <option value="">Personal (sin hogar)</option>
            {households.map((household) => (
              <option key={household.id} value={household.id}>
                {household.name}
              </option>
            ))}
          </Select>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {event ? "Guardar cambios" : "Crear evento"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
