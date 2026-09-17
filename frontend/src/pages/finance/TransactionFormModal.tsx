import { type FormEvent, useEffect, useState } from "react"

import { CategorySelect } from "@/components/CategorySelect"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"
import { useCategories } from "@/hooks/useCategories"
import { extractErrorMessage, extractFieldErrors } from "@/services/api"
import type { Expense, Income, PaymentMethod, TransactionPayload } from "@/types/finance"
import { PAYMENT_METHOD_LABEL } from "@/utils/financeMeta"

interface TransactionFormModalProps {
  kind: "income" | "expense"
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: TransactionPayload) => Promise<void>
  transaction?: Income | Expense | null
  /** Moneda de la cuenta (Configuración), usada por defecto para movimientos nuevos. */
  defaultCurrency: string
}

interface FormState {
  amount: string
  currency: string
  date: string
  description: string
  category_id: string
  payment_method: PaymentMethod
}

function emptyForm(currency: string): FormState {
  return {
    amount: "",
    currency,
    date: new Date().toISOString().slice(0, 10),
    description: "",
    category_id: "",
    payment_method: "cash",
  }
}

export function TransactionFormModal({ kind, isOpen, onClose, onSubmit, transaction, defaultCurrency }: TransactionFormModalProps) {
  const { categories, createCategory } = useCategories(kind)
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultCurrency))
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (transaction) {
      setForm({
        amount: transaction.amount,
        currency: transaction.currency,
        date: transaction.date,
        description: transaction.description ?? "",
        category_id: transaction.category_id ?? "",
        payment_method: transaction.payment_method,
      })
    } else {
      setForm(emptyForm(defaultCurrency))
    }
    setError(null)
    setFieldErrors({})
  }, [isOpen, transaction, defaultCurrency])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setIsSubmitting(true)
    try {
      await onSubmit({
        amount: form.amount,
        currency: form.currency,
        date: form.date,
        description: form.description || null,
        category_id: form.category_id || null,
        payment_method: form.payment_method,
      })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err, kind === "income" ? "No pudimos guardar el ingreso." : "No pudimos guardar el gasto."))
      setFieldErrors(extractFieldErrors(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = kind === "income" ? "ingreso" : "gasto"

  return (
    <Modal title={transaction ? `Editar ${title}` : `Nuevo ${title}`} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Monto"
            type="number"
            step="0.01"
            min="0.01"
            required
            error={fieldErrors.amount}
            value={form.amount}
            onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
          />
          <Input
            label="Fecha"
            type="date"
            required
            error={fieldErrors.date}
            value={form.date}
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
          />
        </div>

        <Textarea
          label="Descripción"
          error={fieldErrors.description}
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
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
            {transaction ? "Guardar cambios" : "Crear"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
