import { type FormEvent, useEffect, useState } from "react"

import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Select } from "@/components/ui/Select"
import { extractErrorMessage } from "@/services/api"
import type { Household } from "@/types/household"
import type { ShoppingList, ShoppingListPayload } from "@/types/shopping"

interface ShoppingListFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: ShoppingListPayload) => Promise<void>
  households: Household[]
  shoppingList?: ShoppingList | null
}

export function ShoppingListFormModal({
  isOpen,
  onClose,
  onSubmit,
  households,
  shoppingList,
}: ShoppingListFormModalProps) {
  const [name, setName] = useState("")
  const [householdId, setHouseholdId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setName(shoppingList?.name ?? "")
    setHouseholdId(shoppingList?.household_id ?? "")
    setError(null)
  }, [isOpen, shoppingList])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await onSubmit({ name, household_id: householdId || null })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos guardar la lista."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title={shoppingList ? "Editar lista" : "Nueva lista de compras"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          label="Nombre"
          required
          placeholder="Ej: Supermercado"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <Select label="Hogar" value={householdId} onChange={(event) => setHouseholdId(event.target.value)}>
          <option value="">Personal (solo para vos)</option>
          {households.map((household) => (
            <option key={household.id} value={household.id}>
              {household.name}
            </option>
          ))}
        </Select>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {shoppingList ? "Guardar cambios" : "Crear lista"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
