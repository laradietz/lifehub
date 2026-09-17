import { AxiosError } from "axios"
import { describe, expect, it } from "vitest"

import { extractErrorMessage, extractFieldErrors } from "@/services/api"

function makeValidationError(detail: unknown) {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 422,
    statusText: "Unprocessable Entity",
    headers: {},
    // @ts-expect-error -- config no importa para este test
    config: {},
    data: { detail },
  })
}

describe("extractFieldErrors", () => {
  it("mapea loc=['body', 'campo'] al nombre del campo", () => {
    const error = makeValidationError([{ loc: ["body", "amount"], msg: "El monto debe ser mayor a 0.", type: "greater_than" }])
    expect(extractFieldErrors(error)).toEqual({ amount: "El monto debe ser mayor a 0." })
  })

  it("mapea varios errores de campos distintos", () => {
    const error = makeValidationError([
      { loc: ["body", "amount"], msg: "Monto inválido." },
      { loc: ["body", "date"], msg: "Fecha inválida." },
    ])
    expect(extractFieldErrors(error)).toEqual({ amount: "Monto inválido.", date: "Fecha inválida." })
  })

  it("ignora errores de validación cruzada sin campo específico (loc=['body'])", () => {
    const error = makeValidationError([{ loc: ["body"], msg: "La fecha de fin no puede ser anterior a la de inicio." }])
    expect(extractFieldErrors(error)).toEqual({})
  })

  it("devuelve un objeto vacío si detail no es una lista de errores", () => {
    expect(extractFieldErrors(makeValidationError("Mensaje simple"))).toEqual({})
  })

  it("devuelve un objeto vacío para errores que no son de axios", () => {
    expect(extractFieldErrors(new Error("algo explotó"))).toEqual({})
  })
})

describe("extractErrorMessage", () => {
  it("sigue devolviendo el primer mensaje como antes (compatibilidad)", () => {
    const error = makeValidationError([{ loc: ["body", "amount"], msg: "Monto inválido." }])
    expect(extractErrorMessage(error, "fallback")).toBe("Monto inválido.")
  })

  it("devuelve el fallback si no hay detail utilizable", () => {
    expect(extractErrorMessage(new Error("red caída"), "fallback")).toBe("fallback")
  })
})
