import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { toast, useToastStore } from "@/store/toastStore"

describe("toastStore", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("agrega un toast al store con el variant y mensaje correctos", () => {
    toast.success("Tarea creada.")
    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0]).toMatchObject({ variant: "success", message: "Tarea creada." })
  })

  it("cada toast tiene un id unico", () => {
    toast.error("Error uno")
    toast.error("Error dos")
    const [first, second] = useToastStore.getState().toasts
    expect(first.id).not.toBe(second.id)
  })

  it("dismiss quita un toast especifico sin afectar los demas", () => {
    toast.info("Uno")
    toast.info("Dos")
    const [first] = useToastStore.getState().toasts
    useToastStore.getState().dismiss(first.id)
    const remaining = useToastStore.getState().toasts
    expect(remaining).toHaveLength(1)
    expect(remaining[0].message).toBe("Dos")
  })

  it("se auto-descarta a los 4 segundos", () => {
    toast.success("Se va solo")
    expect(useToastStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(4000)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})
