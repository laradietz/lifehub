export const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

/** Clave "YYYY-MM-DD" en hora LOCAL a partir de un Date. */
export function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** Clave "YYYY-MM-DD" en hora LOCAL a partir de un ISO string (start_at/end_at de un evento). */
export function dateKeyFromIso(iso: string): string {
  return dateKey(new Date(iso))
}

/**
 * Devuelve los 42 días (6 semanas, lunes a domingo) que arman la grilla del mes
 * que contiene `monthDate`, incluyendo días del mes anterior/siguiente para
 * completar semanas.
 */
export function buildMonthGrid(monthDate: Date): Date[] {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7 // 0 = lunes
  const gridStart = new Date(year, month, 1 - firstWeekday)

  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))
  }
  return days
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
}
