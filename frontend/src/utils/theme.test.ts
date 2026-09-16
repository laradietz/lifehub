import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { applyCachedThemeEarly, getCachedTheme, setTheme } from "@/utils/theme"

function mockMatchMedia(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }))
}

describe("theme", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove("dark")
    mockMatchMedia(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("getCachedTheme devuelve 'system' si no hay nada guardado", () => {
    expect(getCachedTheme()).toBe("system")
  })

  it("setTheme('dark') agrega la clase .dark al <html> y cachea la eleccion", () => {
    setTheme("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(getCachedTheme()).toBe("dark")
  })

  it("setTheme('light') quita la clase .dark", () => {
    setTheme("dark")
    setTheme("light")
    expect(document.documentElement.classList.contains("dark")).toBe(false)
    expect(getCachedTheme()).toBe("light")
  })

  it("setTheme('system') respeta prefers-color-scheme", () => {
    mockMatchMedia(true)
    setTheme("system")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("applyCachedThemeEarly aplica el ultimo tema guardado sin necesitar login", () => {
    localStorage.setItem("lifehub-theme", "dark")
    applyCachedThemeEarly()
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })
})
