import { type FormEvent, useEffect, useState } from "react"

import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"
import { extractErrorMessage } from "@/services/api"
import type { Document, DocumentCategory, DocumentPayload } from "@/types/document"
import { DOCUMENT_CATEGORY_LABEL } from "@/utils/documentMeta"

interface DocumentFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: DocumentPayload) => Promise<void>
  document?: Document | null
}

interface DocumentFormState {
  name: string
  category: DocumentCategory
  expiry_date: string
  notes: string
}

const EMPTY_FORM: DocumentFormState = {
  name: "",
  category: "other",
  expiry_date: "",
  notes: "",
}

export function DocumentFormModal({ isOpen, onClose, onSubmit, document }: DocumentFormModalProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (document) {
      setForm({
        name: document.name,
        category: document.category,
        expiry_date: document.expiry_date ?? "",
        notes: document.notes ?? "",
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setError(null)
  }, [isOpen, document])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await onSubmit({
        name: form.name,
        category: form.category,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
      })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos guardar el documento."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title={document ? "Editar documento" : "Nuevo documento"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          label="Nombre"
          required
          placeholder="Ej: Póliza seguro del hogar"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Categoría"
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as DocumentCategory }))}
          >
            {Object.entries(DOCUMENT_CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input
            label="Fecha de vencimiento"
            type="date"
            hint="Opcional"
            value={form.expiry_date}
            onChange={(event) => setForm((current) => ({ ...current, expiry_date: event.target.value }))}
          />
        </div>

        <Textarea
          label="Notas"
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {document ? "Guardar cambios" : "Crear documento"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
