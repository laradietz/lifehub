import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"

function TestHarness({ onClose }: { onClose: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Abrir modal</button>
      <Modal
        title="Nueva tarea"
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false)
          onClose()
        }}
      >
        <Input label="Titulo" />
        <Button type="button">Guardar</Button>
      </Modal>
    </div>
  )
}

describe("Modal", () => {
  it("no renderiza nada cuando isOpen es false", () => {
    render(
      <Modal title="Oculto" isOpen={false} onClose={() => {}}>
        contenido
      </Modal>,
    )
    expect(screen.queryByText("contenido")).not.toBeInTheDocument()
  })

  it("mueve el foco al primer campo del formulario, saltando el boton Cerrar (ver HANDOFF punto 26)", async () => {
    const user = userEvent.setup()
    render(<TestHarness onClose={() => {}} />)
    await user.click(screen.getByText("Abrir modal"))

    expect(screen.getByLabelText("Titulo")).toHaveFocus()
  })

  it("Tab desde el ultimo elemento vuelve al primero (focus trap)", async () => {
    const user = userEvent.setup()
    render(<TestHarness onClose={() => {}} />)
    await user.click(screen.getByText("Abrir modal"))

    const input = screen.getByLabelText("Titulo")
    const saveButton = screen.getByText("Guardar")
    const closeButton = screen.getByLabelText("Cerrar")

    expect(input).toHaveFocus()
    await user.tab()
    expect(saveButton).toHaveFocus()
    await user.tab()
    expect(closeButton).toHaveFocus()
    await user.tab()
    expect(input).toHaveFocus()
  })

  it("Shift+Tab desde el primer elemento va al ultimo (focus trap inverso)", async () => {
    const user = userEvent.setup()
    render(<TestHarness onClose={() => {}} />)
    await user.click(screen.getByText("Abrir modal"))

    const input = screen.getByLabelText("Titulo")
    const closeButton = screen.getByLabelText("Cerrar")

    expect(input).toHaveFocus()
    await user.tab({ shift: true })
    expect(closeButton).toHaveFocus()
  })

  it("Escape cierra el modal y devuelve el foco a quien lo abrio", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<TestHarness onClose={onClose} />)
    const openButton = screen.getByText("Abrir modal")
    await user.click(openButton)

    await user.keyboard("{Escape}")

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByLabelText("Titulo")).not.toBeInTheDocument()
    expect(openButton).toHaveFocus()
  })

  it("hacer click en el backdrop cierra el modal", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal title="Confirmar" isOpen onClose={onClose}>
        contenido
      </Modal>,
    )

    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement
    await user.click(backdrop)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
