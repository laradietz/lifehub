import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { Toaster } from "@/components/ui/Toaster"
import { toast, useToastStore } from "@/store/toastStore"

describe("Toaster", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it("no renderiza nada si no hay toasts", () => {
    render(<Toaster />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("muestra un toast de exito con su mensaje", () => {
    render(<Toaster />)
    act(() => toast.success("Tarea creada."))
    expect(screen.getByRole("status")).toHaveTextContent("Tarea creada.")
  })

  it("puede mostrar varios toasts al mismo tiempo", () => {
    render(<Toaster />)
    act(() => {
      toast.success("Uno")
      toast.info("Dos")
    })
    expect(screen.getAllByRole("status")).toHaveLength(2)
  })

  it("un toast de error usa role=alert (anuncio inmediato en lectores de pantalla)", () => {
    render(<Toaster />)
    act(() => toast.error("Algo salió mal."))
    expect(screen.getByRole("alert")).toHaveTextContent("Algo salió mal.")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("cerrar un toast con el boton lo saca de la pantalla", async () => {
    const user = userEvent.setup()
    render(<Toaster />)
    act(() => toast.info("Cerrame"))

    await user.click(screen.getByRole("button", { name: "Cerrar notificación" }))

    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
