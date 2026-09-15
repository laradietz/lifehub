export function formatCurrency(value: string | number, currency: string): string {
  const amount = typeof value === "string" ? Number.parseFloat(value) : value
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

export function formatCompactCurrency(value: string | number, currency: string): string {
  const amount = typeof value === "string" ? Number.parseFloat(value) : value
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount)
  } catch {
    return `${amount.toFixed(0)} ${currency}`
  }
}
