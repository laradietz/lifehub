export type Theme = "light" | "dark" | "system"

const STORAGE_KEY = "lifehub-theme"

let currentTheme: Theme = "system"

function isDarkForTheme(theme: Theme): boolean {
  if (theme === "system") return window.matchMedia("(prefers-color-scheme: dark)").matches
  return theme === "dark"
}

function applyClass(theme: Theme): void {
  document.documentElement.classList.toggle("dark", isDarkForTheme(theme))
}

export function getCachedTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "light" || stored === "dark" || stored === "system") return stored
  } catch {
    // localStorage puede no estar disponible (modo privado, storage bloqueado, etc.)
  }
  return "system"
}

/** Aplica el tema real y lo cachea localmente. Usado tanto al sincronizar con el
 * backend (UserSettings.theme, la fuente de verdad) como al cambiarlo desde Configuración. */
export function setTheme(theme: Theme): void {
  currentTheme = theme
  applyClass(theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // ver comentario de getCachedTheme
  }
}

/** Se llama una sola vez, antes de montar React, para evitar un flash del tema
 * incorrecto mientras se carga la configuración real desde el backend (que requiere
 * estar autenticado). Usa el último tema cacheado en este navegador, o "system" si
 * es la primera visita. */
export function applyCachedThemeEarly(): void {
  currentTheme = getCachedTheme()
  applyClass(currentTheme)
}

// Vive a nivel de módulo (no por componente) para no perder de vista cuál es el
// tema activo si Configuración lo cambia mientras este listener ya está montado.
if (typeof window !== "undefined") {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (currentTheme === "system") applyClass(currentTheme)
  })
}
