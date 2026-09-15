import { type FormEvent, useEffect, useState } from "react"

import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"
import { extractErrorMessage } from "@/services/api"
import type { VehicleMaintenance, VehicleMaintenancePayload, VehicleMaintenanceType } from "@/types/vehicle"
import { MAINTENANCE_TYPE_LABEL } from "@/utils/vehicleMeta"

interface MaintenanceFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: VehicleMaintenancePayload) => Promise<void>
  maintenance?: VehicleMaintenance | null
}

interface MaintenanceFormState {
  type: VehicleMaintenanceType
  description: string
  date: string
  mileage_at_service: string
  cost: string
  next_due_date: string
  next_due_mileage: string
}

const EMPTY_FORM: MaintenanceFormState = {
  type: "service",
  description: "",
  date: "",
  mileage_at_service: "",
  cost: "",
  next_due_date: "",
  next_due_mileage: "",
}

export function MaintenanceFormModal({ isOpen, onClose, onSubmit, maintenance }: MaintenanceFormModalProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (maintenance) {
      setForm({
        type: maintenance.type,
        description: maintenance.description ?? "",
        date: maintenance.date,
        mileage_at_service: maintenance.mileage_at_service?.toString() ?? "",
        cost: maintenance.cost ?? "",
        next_due_date: maintenance.next_due_date ?? "",
        next_due_mileage: maintenance.next_due_mileage?.toString() ?? "",
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setError(null)
  }, [isOpen, maintenance])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await onSubmit({
        type: form.type,
        description: form.description || null,
        date: form.date,
        mileage_at_service: form.mileage_at_service ? Number.parseInt(form.mileage_at_service, 10) : null,
        cost: form.cost || null,
        next_due_date: form.next_due_date || null,
        next_due_mileage: form.next_due_mileage ? Number.parseInt(form.next_due_mileage, 10) : null,
      })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos guardar el mantenimiento."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title={maintenance ? "Editar mantenimiento" : "Nuevo mantenimiento"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Tipo"
            value={form.type}
            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as VehicleMaintenanceType }))}
          >
            {Object.entries(MAINTENANCE_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input
            label="Fecha"
            type="date"
            required
            value={form.date}
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
          />
        </div>

        <Textarea
          label="Descripción"
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Kilometraje al momento"
            type="number"
            hint="Opcional"
            value={form.mileage_at_service}
            onChange={(event) => setForm((current) => ({ ...current, mileage_at_service: event.target.value }))}
          />
          <Input
            label="Costo"
            type="number"
            step="0.01"
            hint="Opcional"
            value={form.cost}
            onChange={(event) => setForm((current) => ({ ...current, cost: event.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Próximo vencimiento (fecha)"
            type="date"
            hint="Opcional"
            value={form.next_due_date}
            onChange={(event) => setForm((current) => ({ ...current, next_due_date: event.target.value }))}
          />
          <Input
            label="Próximo vencimiento (km)"
            type="number"
            hint="Opcional"
            value={form.next_due_mileage}
            onChange={(event) => setForm((current) => ({ ...current, next_due_mileage: event.target.value }))}
          />
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {maintenance ? "Guardar cambios" : "Agregar"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
