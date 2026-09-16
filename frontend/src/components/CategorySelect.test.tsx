import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { CategorySelect } from "@/components/CategorySelect"
import type { Category } from "@/types/category"

const categories: Category[] = [
  { id: "cat-1", name: "Trabajo", type: "task", color: null, icon: null, is_system: false },
]

describe("CategorySelect", () => {
  it("muestra las categorias existentes y la opcion de crear una nueva", () => {
    render(<CategorySelect categories={categories} value="" onChange={vi.fn()} onCreate={vi.fn()} />)
    expect(screen.getByRole("option", { name: "Trabajo" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "+ Nueva categoría" })).toBeInTheDocument()
  })

  it(
    "crear una categoria nueva NO envia el <form> externo que la contiene " +
      "(regresion del bug de form anidado, ver HANDOFF seccion 7.3)",
    async () => {
      const user = userEvent.setup()
      const outerSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
      const onCreate = vi.fn().mockResolvedValue({ id: "cat-new", name: "Salud" } as Category)
      const onChange = vi.fn()

      render(
        <form onSubmit={outerSubmit}>
          <CategorySelect categories={categories} value="" onChange={onChange} onCreate={onCreate} />
        </form>,
      )

      await user.selectOptions(screen.getByLabelText("Categoría"), "+ Nueva categoría")
      await user.type(screen.getByLabelText("Nueva categoría"), "Salud")
      await user.click(screen.getByRole("button", { name: "Crear" }))

      expect(onCreate).toHaveBeenCalledWith("Salud")
      expect(onChange).toHaveBeenCalledWith("cat-new")
      // El punto critico del bug original: el submit del form padre nunca debe dispararse.
      expect(outerSubmit).not.toHaveBeenCalled()
    },
  )

  it("Enter en el input de nueva categoria confirma la creacion sin enviar el form externo", async () => {
    const user = userEvent.setup()
    const outerSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    const onCreate = vi.fn().mockResolvedValue({ id: "cat-new", name: "Ocio" } as Category)

    render(
      <form onSubmit={outerSubmit}>
        <CategorySelect categories={categories} value="" onChange={vi.fn()} onCreate={onCreate} />
      </form>,
    )

    await user.selectOptions(screen.getByLabelText("Categoría"), "+ Nueva categoría")
    await user.type(screen.getByLabelText("Nueva categoría"), "Ocio{Enter}")

    expect(onCreate).toHaveBeenCalledWith("Ocio")
    expect(outerSubmit).not.toHaveBeenCalled()
  })

  it("cancelar la creacion vuelve al select sin llamar a onCreate", async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<CategorySelect categories={categories} value="" onChange={vi.fn()} onCreate={onCreate} />)

    await user.selectOptions(screen.getByLabelText("Categoría"), "+ Nueva categoría")
    await user.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(screen.getByLabelText("Categoría")).toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()
  })
})
