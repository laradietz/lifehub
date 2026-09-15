import { useCallback, useEffect, useState } from "react"

import { householdService } from "@/services/householdService"
import type { Household } from "@/types/household"

export function useHouseholds() {
  const [households, setHouseholds] = useState<Household[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await householdService.list()
      setHouseholds(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { households, isLoading, reload }
}
