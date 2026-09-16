import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Button } from "@/components/ui/Button"

describe("Button", () => {
  it("dispara onClick al hacer click", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Guardar</Button>)

    await user.click(screen.getByRole("button", { name: "Guardar" }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("se deshabilita cuando isLoading es true y no dispara onClick", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} isLoading>
        Guardar
      </Button>,
    )

    const button = screen.getByRole("button", { name: "Guardar" })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it("respeta disabled explicito", () => {
    render(<Button disabled>Guardar</Button>)
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled()
  })
})
