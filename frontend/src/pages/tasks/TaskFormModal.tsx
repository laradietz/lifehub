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
import { extractErrorMessage, extractFieldErrors } from "@/services/api"
import type { Priority, RecurrenceType, Task, TaskPayload } from "@/types/task"
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/utils/datetime"
import { PRIORITY_LABEL, RECURRENCE_LABEL } from "@/utils/taskMeta"

interface TaskFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: TaskPayload) => Promise<void>
  task?: Task | null
}

interface TaskFormState {
  title: string
  description: string
  due_date: string
  priority: Priority
  category_id: string
  household_id: string
  assigned_to_id: string
  recurrence: RecurrenceType
  tags: string
}

const EMPTY_FORM: TaskFormState = {
  title: "",
  description: "",
  due_date: "",
  priority: "medium",
  category_id: "",
  household_id: "",
  assigned_to_id: "",
  recurrence: "none",
  tags: "",
}

export function TaskFormModal({ isOpen, onClose, onSubmit, task }: TaskFormModalProps) {
  const { categories, createCategory } = useCategories("task")
  const { households } = useHouseholds()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? "",
        due_date: toDatetimeLocalValue(task.due_date),
        priority: task.priority,
        category_id: task.category_id ?? "",
        household_id: task.household_id ?? "",
        assigned_to_id: task.assigned_to_id ?? "",
        recurrence: task.recurrence,
        tags: task.tags.join(", "),
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setError(null)
    setFieldErrors({})
  }, [isOpen, task])

  const selectedHousehold = households.find((household) => household.id === form.household_id)
  const assignableMembers = selectedHousehold?.members.filter((member) => member.status === "accepted") ?? []

  function handleHouseholdChange(householdId: string) {
    setForm((current) => ({ ...current, household_id: householdId, assigned_to_id: "" }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setIsSubmitting(true)
    try {
      await onSubmit({
        title: form.title,
        description: form.description || null,
        due_date: fromDatetimeLocalValue(form.due_date),
        priority: form.priority,
        category_id: form.category_id || null,
        household_id: form.household_id || null,
        assigned_to_id: form.household_id ? form.assigned_to_id || null : null,
        recurrence: form.recurrence,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos guardar la tarea."))
      setFieldErrors(extractFieldErrors(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title={task ? "Editar tarea" : "Nueva tarea"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          label="Título"
          required
          error={fieldErrors.title}
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
        />

        <Textarea
          label="Descripción"
          error={fieldErrors.description}
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Fecha límite"
            type="datetime-local"
            error={fieldErrors.due_date}
            value={form.due_date}
            onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))}
          />
          <Select
            label="Prioridad"
            value={form.priority}
            onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as Task["priority"] }))}
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
            onChange={(event) => setForm((current) => ({ ...current, recurrence: event.target.value as Task["recurrence"] }))}
          >
            {Object.entries(RECURRENCE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {households.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Hogar"
              value={form.household_id}
              onChange={(event) => handleHouseholdChange(event.target.value)}
            >
              <option value="">Personal (sin hogar)</option>
              {households.map((household) => (
                <option key={household.id} value={household.id}>
                  {household.name}
                </option>
              ))}
            </Select>
            <Select
              label="Asignar a"
              value={form.assigned_to_id}
              disabled={!form.household_id}
              onChange={(event) => setForm((current) => ({ ...current, assigned_to_id: event.target.value }))}
            >
              <option value="">Sin asignar</option>
              {assignableMembers.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.full_name ?? member.email}
                </option>
              ))}
            </Select>
          </div>
        )}

        <Input
          label="Etiquetas"
          hint="Separadas por coma, por ejemplo: casa, urgente"
          error={fieldErrors.tags}
          value={form.tags}
          onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {task ? "Guardar cambios" : "Crear tarea"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
