import { type FormEvent, useEffect, useState } from "react"

import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { extractErrorMessage, extractFieldErrors } from "@/services/api"
import type { Vehicle, VehiclePayload } from "@/types/vehicle"

interface VehicleFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: VehiclePayload) => Promise<void>
  vehicle?: Vehicle | null
}

interface VehicleFormState {
  brand: string
  model: string
  year: string
  license_plate: string
  mileage: string
}

const EMPTY_FORM: VehicleFormState = { brand: "", model: "", year: "", license_plate: "", mileage: "" }

export function VehicleFormModal({ isOpen, onClose, onSubmit, vehicle }: VehicleFormModalProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (vehicle) {
      setForm({
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year?.toString() ?? "",
        license_plate: vehicle.license_plate ?? "",
        mileage: vehicle.mileage?.toString() ?? "",
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setError(null)
    setFieldErrors({})
  }, [isOpen, vehicle])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setIsSubmitting(true)
    try {
      await onSubmit({
        brand: form.brand,
        model: form.model,
        year: form.year ? Number.parseInt(form.year, 10) : null,
        license_plate: form.license_plate || null,
        mileage: form.mileage ? Number.parseInt(form.mileage, 10) : null,
      })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos guardar el vehículo."))
      setFieldErrors(extractFieldErrors(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title={vehicle ? "Editar vehículo" : "Nuevo vehículo"} isOpen={isOpen} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Marca"
            required
            placeholder="Ej: Toyota"
            error={fieldErrors.brand}
            value={form.brand}
            onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))}
          />
          <Input
            label="Modelo"
            required
            placeholder="Ej: Corolla"
            error={fieldErrors.model}
            value={form.model}
            onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Año"
            type="number"
            hint="Opcional"
            error={fieldErrors.year}
            value={form.year}
            onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))}
          />
          <Input
            label="Patente"
            hint="Opcional"
            error={fieldErrors.license_plate}
            value={form.license_plate}
            onChange={(event) => setForm((current) => ({ ...current, license_plate: event.target.value }))}
          />
        </div>

        <Input
          label="Kilometraje"
          type="number"
          hint="Opcional"
          error={fieldErrors.mileage}
          value={form.mileage}
          onChange={(event) => setForm((current) => ({ ...current, mileage: event.target.value }))}
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {vehicle ? "Guardar cambios" : "Crear vehículo"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
