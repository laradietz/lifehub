import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { toHaveNoViolations } from "jest-axe"
import { afterEach, expect } from "vitest"

// jest-axe esta pensado para Jest, pero el matcher en si no depende de nada
// especifico de Jest -- se puede registrar en el `expect` de Vitest igual.
expect.extend(toHaveNoViolations)

afterEach(() => {
  cleanup()
})

// jsdom no implementa matchMedia. theme.ts lo llama a nivel de modulo (para el
// listener de "prefers-color-scheme"), asi que sin este stub cualquier test que
// importe (directa o indirectamente) ese modulo falla al cargar.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
