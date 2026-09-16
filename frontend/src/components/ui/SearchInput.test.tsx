import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SearchInput } from "@/components/ui/SearchInput"

describe("SearchInput", () => {
  it("muestra el placeholder por defecto", () => {
    render(<SearchInput value="" onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText("Buscar...")).toBeInTheDocument()
  })

  it("acepta un placeholder personalizado", () => {
    render(<SearchInput value="" onChange={vi.fn()} placeholder="Buscar tareas..." />)
    expect(screen.getByPlaceholderText("Buscar tareas...")).toBeInTheDocument()
  })

  it("llama a onChange con cada caracter tipeado", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SearchInput value="" onChange={onChange} />)

    await user.type(screen.getByPlaceholderText("Buscar..."), "abc")

    expect(onChange).toHaveBeenCalledTimes(3)
    expect(onChange).toHaveBeenNthCalledWith(1, "a")
  })

  it("no muestra el boton de limpiar cuando el valor esta vacio", () => {
    render(<SearchInput value="" onChange={vi.fn()} />)
    expect(screen.queryByRole("button", { name: "Limpiar búsqueda" })).not.toBeInTheDocument()
  })

  it("el boton de limpiar aparece con texto y vacia el valor al hacer click", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SearchInput value="tarea" onChange={onChange} />)

    const clearButton = screen.getByRole("button", { name: "Limpiar búsqueda" })
    await user.click(clearButton)

    expect(onChange).toHaveBeenCalledWith("")
  })
})
