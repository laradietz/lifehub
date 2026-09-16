import { describe, expect, it } from "vitest"

import { buildMonthGrid, dateKey, dateKeyFromIso } from "@/utils/calendar"

describe("dateKey", () => {
  it("formatea con padding de dos digitos en mes y dia", () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe("2026-01-05")
  })
})

describe("dateKeyFromIso", () => {
  it("usa la fecha LOCAL, no UTC", () => {
    // Un ISO a medianoche UTC puede caer en el dia anterior en husos horarios negativos;
    // dateKeyFromIso debe reflejar como el navegador lo mostraria, no el dia UTC crudo.
    const iso = "2026-06-15T12:00:00.000Z"
    expect(dateKeyFromIso(iso)).toBe(dateKey(new Date(iso)))
  })
})

describe("buildMonthGrid", () => {
  it("siempre devuelve 42 dias (6 semanas)", () => {
    const grid = buildMonthGrid(new Date(2026, 1, 1)) // febrero 2026
    expect(grid).toHaveLength(42)
  })

  it("el primer dia de la grilla es lunes", () => {
    const grid = buildMonthGrid(new Date(2026, 1, 1))
    expect(grid[0].getDay()).toBe(1) // 1 = lunes
  })

  it("el ultimo dia de la grilla es domingo", () => {
    const grid = buildMonthGrid(new Date(2026, 1, 1))
    expect(grid[41].getDay()).toBe(0) // 0 = domingo
  })

  it("incluye todos los dias del mes pedido", () => {
    const grid = buildMonthGrid(new Date(2026, 1, 1)) // febrero 2026 tiene 28 dias
    const daysInFebruary = grid.filter((d) => d.getMonth() === 1 && d.getFullYear() === 2026)
    expect(daysInFebruary).toHaveLength(28)
  })
})
