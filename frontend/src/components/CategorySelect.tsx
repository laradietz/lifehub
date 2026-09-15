import { type KeyboardEvent, useState } from "react"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import type { Category } from "@/types/category"

const CREATE_NEW_VALUE = "__create_new__"

interface CategorySelectProps {
  categories: Category[]
  value: string
  onChange: (categoryId: string) => void
  onCreate: (name: string) => Promise<Category>
}

export function CategorySelect({ categories, value, onChange, onCreate }: CategorySelectProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Nota: esto vive dentro del <form> de Tarea/Recordatorio/Finanzas/Suscripción.
  // Un <form> anidado aca adentro es HTML invalido y el evento "submit" del
  // formulario interno burbujea y dispara TAMBIEN el submit del formulario
  // externo (creando la tarea/gasto a medias). Por eso esto usa un <div> +
  // botones con onClick, nunca un <form> propio.
  async function handleCreate() {
    if (!newName.trim()) return
    setIsSubmitting(true)
    try {
      const created = await onCreate(newName.trim())
      onChange(created.id)
      setIsCreating(false)
      setNewName("")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      void handleCreate()
    }
  }

  if (isCreating) {
    return (
      <div className="flex flex-col gap-2">
        <Input label="Nueva categoría" autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={handleKeyDown} />
        <div className="flex gap-2">
          <Button type="button" size="sm" isLoading={isSubmitting} onClick={() => void handleCreate()}>
            Crear
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Select
      label="Categoría"
      value={value}
      onChange={(event) => {
        if (event.target.value === CREATE_NEW_VALUE) {
          setIsCreating(true)
          return
        }
        onChange(event.target.value)
      }}
    >
      <option value="">Sin categoría</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
      <option value={CREATE_NEW_VALUE}>+ Nueva categoría</option>
    </Select>
  )
}
