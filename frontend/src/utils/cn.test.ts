import { describe, expect, it } from "vitest"

import { cn } from "@/utils/cn"

describe("cn", () => {
  it("une clases string simples", () => {
    expect(cn("a", "b")).toBe("a b")
  })

  it("ignora valores falsy", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b")
  })

  it("resuelve objetos condicionales", () => {
    expect(cn({ a: true, b: false, c: true })).toBe("a c")
  })
})
