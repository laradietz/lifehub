import { type FormEvent, useEffect, useState } from "react"

import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { extractErrorMessage } from "@/services/api"
import type { Household, HouseholdPayload } from "@/types/household"

interface HouseholdFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: HouseholdPayload) => Promise<void>
  household?: Household | null
}

export function HouseholdFormModal({ isOpen, onClose, onSubmit, household }: HouseholdFormModalProps) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setName(household?.name ?? "")
    setError(null)
  }, [isOpen, household])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await onSubmit({ name })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos guardar el hogar."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title={household ? "Editar hogar" : "Nuevo hogar"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          label="Nombre"
          required
          placeholder="Ej: Casa"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {household ? "Guardar cambios" : "Crear hogar"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
