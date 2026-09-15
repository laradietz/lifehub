import { useCallback, useEffect, useState } from "react"

import { categoryService } from "@/services/categoryService"
import type { Category, CategoryType } from "@/types/category"

export function useCategories(type: CategoryType) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await categoryService.list(type)
      setCategories(data)
    } finally {
      setIsLoading(false)
    }
  }, [type])

  useEffect(() => {
    void reload()
  }, [reload])

  async function createCategory(name: string): Promise<Category> {
    const created = await categoryService.create({ type, name })
    setCategories((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
    return created
  }

  return { categories, isLoading, createCategory, reload }
}
