import { type FormEvent, useEffect, useState } from "react"

import { CategorySelect } from "@/components/CategorySelect"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Select } from "@/components/ui/Select"
import { useCategories } from "@/hooks/useCategories"
import { extractErrorMessage } from "@/services/api"
import type { PaymentMethod } from "@/types/finance"
import type { Subscription, SubscriptionFrequency, SubscriptionPayload } from "@/types/subscription"
import { FREQUENCY_LABEL, PAYMENT_METHOD_LABEL } from "@/utils/financeMeta"

interface SubscriptionFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: SubscriptionPayload) => Promise<void>
  subscription?: Subscription | null
  defaultCurrency: string
}

interface FormState {
  name: string
  price: string
  currency: string
  frequency: SubscriptionFrequency
  next_billing_date: string
  category_id: string
  payment_method: PaymentMethod
}

function emptyForm(currency: string): FormState {
  return {
    name: "",
    price: "",
    currency,
    frequency: "monthly",
    next_billing_date: new Date().toISOString().slice(0, 10),
    category_id: "",
    payment_method: "card",
  }
}

export function SubscriptionFormModal({ isOpen, onClose, onSubmit, subscription, defaultCurrency }: SubscriptionFormModalProps) {
  const { categories, createCategory } = useCategories("subscription")
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultCurrency))
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (subscription) {
      setForm({
        name: subscription.name,
        price: subscription.price,
        currency: subscription.currency,
        frequency: subscription.frequency,
        next_billing_date: subscription.next_billing_date,
        category_id: subscription.category_id ?? "",
        payment_method: subscription.payment_method,
      })
    } else {
      setForm(emptyForm(defaultCurrency))
    }
    setError(null)
  }, [isOpen, subscription, defaultCurrency])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await onSubmit({
        name: form.name,
        price: form.price,
        currency: form.currency,
        frequency: form.frequency,
        next_billing_date: form.next_billing_date,
        category_id: form.category_id || null,
        payment_method: form.payment_method,
      })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos guardar la suscripción."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title={subscription ? "Editar suscripción" : "Nueva suscripción"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          label="Nombre"
          required
          placeholder="Ej: Netflix"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Precio"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={form.price}
            onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
          />
          <Select
            label="Frecuencia"
            value={form.frequency}
            onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value as SubscriptionFrequency }))}
          >
            {Object.entries(FREQUENCY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <Input
          label="Próximo cobro"
          type="date"
          required
          value={form.next_billing_date}
          onChange={(event) => setForm((current) => ({ ...current, next_billing_date: event.target.value }))}
        />

        <div className="grid grid-cols-2 gap-4">
          <CategorySelect
            categories={categories}
            value={form.category_id}
            onChange={(categoryId) => setForm((current) => ({ ...current, category_id: categoryId }))}
            onCreate={createCategory}
          />
          <Select
            label="Método de pago"
            value={form.payment_method}
            onChange={(event) => setForm((current) => ({ ...current, payment_method: event.target.value as PaymentMethod }))}
          >
            {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {subscription ? "Guardar cambios" : "Crear suscripción"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
