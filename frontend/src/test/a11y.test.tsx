import { render } from "@testing-library/react"
import { axe } from "jest-axe"
import { describe, expect, it } from "vitest"

import { Alert } from "@/components/ui/Alert"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { SearchInput } from "@/components/ui/SearchInput"
import { Select } from "@/components/ui/Select"

// jsdom no calcula layout/estilos reales, asi que la regla "color-contrast" de
// axe no tiene con que trabajar y solo generaria ruido -- se desactiva, igual
// que se hace tipicamente al correr axe-core contra un DOM simulado. El resto
// de las reglas (roles ARIA, labels, foco, estructura semantica) si aplican.
const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } }

describe("accesibilidad (axe-core) de los componentes base", () => {
  it("Button no tiene violaciones", async () => {
    const { container } = render(
      <>
        <Button>Guardar</Button>
        <Button variant="danger">Eliminar</Button>
        <Button disabled>Deshabilitado</Button>
      </>,
    )
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it("Input con label, hint y error no tiene violaciones", async () => {
    const { container } = render(
      <>
        <Input label="Título" required />
        <Input label="Email" hint="Nunca lo compartimos." />
        <Input label="Contraseña" error="Es obligatoria." />
      </>,
    )
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it("Select no tiene violaciones", async () => {
    const { container } = render(
      <Select label="Categoría">
        <option value="">Sin categoría</option>
        <option value="1">Trabajo</option>
      </Select>,
    )
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it("SearchInput no tiene violaciones", async () => {
    const { container } = render(<SearchInput value="" onChange={() => {}} />)
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it("Badge y Alert no tienen violaciones", async () => {
    const { container } = render(
      <>
        <Badge tone="red">Urgente</Badge>
        <Alert variant="error">Algo salió mal.</Alert>
        <Alert variant="success">Guardado.</Alert>
      </>,
    )
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it("Modal abierto (con dialog, título y formulario) no tiene violaciones", async () => {
    // Modal usa un portal a document.body, no queda dentro del container de
    // testing-library -- hay que auditar document.body directamente.
    render(
      <Modal title="Nueva tarea" description="Completá los datos." isOpen onClose={() => {}}>
        <Input label="Título" autoFocus />
      </Modal>,
    )
    expect(await axe(document.body, AXE_OPTIONS)).toHaveNoViolations()
  })
})
