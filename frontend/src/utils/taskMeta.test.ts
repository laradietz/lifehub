import { describe, expect, it } from "vitest"

import { daysUntil, formatDate, isOverdue } from "@/utils/taskMeta"

describe("formatDate", () => {
  it("devuelve string vacio para null", () => {
    expect(formatDate(null)).toBe("")
  })

  it("no corre un dia para atras una fecha sin hora (bug de timezone, ver HANDOFF problema #5)", () => {
    // "2026-10-20" interpretado como UTC medianoche se muestra 19/10 en husos
    // horarios negativos si no se fuerza a medianoche LOCAL primero.
    const result = formatDate("2026-10-20", { day: "2-digit", month: "2-digit", year: "numeric" })
    expect(result).toContain("20")
    expect(result).not.toContain("19")
  })

  it("sigue funcionando con un ISO completo (con hora)", () => {
    const result = formatDate("2026-10-20T15:30:00.000Z", { day: "2-digit", month: "2-digit", year: "numeric" })
    expect(result).toMatch(/\d{2}\/\d{2}\/2026/)
  })
})

describe("isOverdue", () => {
  it("es false para fecha nula", () => {
    expect(isOverdue(null)).toBe(false)
  })

  it("es true para una fecha en el pasado", () => {
    expect(isOverdue("2000-01-01T00:00:00.000Z")).toBe(true)
  })

  it("es false para una fecha en el futuro lejano", () => {
    expect(isOverdue("2999-01-01T00:00:00.000Z")).toBe(false)
  })
})

describe("daysUntil", () => {
  it("da 0 para hoy mismo (fecha sin hora)", () => {
    const today = new Date()
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    expect(daysUntil(key)).toBe(0)
  })

  it("da un numero positivo para una fecha futura", () => {
    const future = new Date()
    future.setDate(future.getDate() + 5)
    const key = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}`
    expect(daysUntil(key)).toBe(5)
  })
})
