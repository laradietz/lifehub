import { type FormEvent, useState } from "react"

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

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
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

  if (isCreating) {
    return (
      <form onSubmit={handleCreate} className="flex flex-col gap-2">
        <Input
          label="Nueva categoría"
          autoFocus
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Crear
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
            Cancelar
          </Button>
        </div>
      </form>
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
