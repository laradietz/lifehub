import { describe, expect, it } from "vitest"

import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/utils/datetime"

describe("toDatetimeLocalValue", () => {
  it("devuelve string vacio para null", () => {
    expect(toDatetimeLocalValue(null)).toBe("")
  })

  it("devuelve un valor con el formato YYYY-MM-DDTHH:mm", () => {
    const result = toDatetimeLocalValue("2026-03-15T12:00:00.000Z")
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })
})

describe("fromDatetimeLocalValue", () => {
  it("devuelve null para string vacio", () => {
    expect(fromDatetimeLocalValue("")).toBeNull()
  })

  it("devuelve un ISO string valido", () => {
    const result = fromDatetimeLocalValue("2026-03-15T09:30")
    expect(result).not.toBeNull()
    expect(new Date(result as string).toISOString()).toBe(result)
  })
})

describe("round-trip", () => {
  it("convertir a local y de vuelta a ISO preserva el instante original", () => {
    const original = "2026-03-15T12:00:00.000Z"
    const local = toDatetimeLocalValue(original)
    const backToIso = fromDatetimeLocalValue(local)
    expect(backToIso).toBe(original)
  })
})
