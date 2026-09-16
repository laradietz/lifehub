import { useEffect } from "react"

import { settingsService } from "@/services/settingsService"
import { useAuthStore } from "@/store/authStore"
import { setTheme } from "@/utils/theme"

/** Sincroniza el tema real del usuario (UserSettings.theme, la fuente de verdad)
 * apenas se autentica. Hasta que eso resuelve, la app ya muestra el último tema
 * cacheado en este navegador (ver utils/theme.ts::applyCachedThemeEarly). */
export function useThemeSync(): void {
  const status = useAuthStore((state) => state.status)

  useEffect(() => {
    if (status !== "authenticated") return
    let cancelled = false

    async function syncTheme() {
      try {
        const settings = await settingsService.get()
        if (!cancelled) setTheme(settings.theme)
      } catch {
        // si falla, seguimos con el tema cacheado localmente / la preferencia del sistema
      }
    }
    void syncTheme()

    return () => {
      cancelled = true
    }
  }, [status])
}
