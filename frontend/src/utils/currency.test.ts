import { describe, expect, it } from "vitest"

import { formatCompactCurrency, formatCurrency } from "@/utils/currency"

describe("formatCurrency", () => {
  it("formatea un numero en USD con el simbolo de moneda", () => {
    const result = formatCurrency(1234.5, "USD")
    expect(result).toContain("1.234,50")
    expect(result).toMatch(/US\$|\$/)
  })

  it("acepta un string numerico", () => {
    const result = formatCurrency("99.9", "USD")
    expect(result).toContain("99")
  })

  it("cae a un formato manual si el codigo de moneda es invalido", () => {
    const result = formatCurrency(10, "NOT_A_CURRENCY")
    expect(result).toBe("10.00 NOT_A_CURRENCY")
  })
})

describe("formatCompactCurrency", () => {
  it("compacta numeros grandes (ej. 1200 -> ~1.2K)", () => {
    const result = formatCompactCurrency(1200, "USD")
    expect(result.toUpperCase()).toMatch(/1[.,]?2\s?K/)
  })

  it("cae a un formato manual si el codigo de moneda es invalido", () => {
    const result = formatCompactCurrency(10, "NOT_A_CURRENCY")
    expect(result).toBe("10 NOT_A_CURRENCY")
  })
})
