/** Convierte un ISO string (UTC) al formato que espera <input type="datetime-local">, en hora local. */
export function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return ""
  const date = new Date(iso)
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

/** Convierte el valor de un <input type="datetime-local"> (hora local) a ISO string en UTC. */
export function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null
  return new Date(value).toISOString()
}
