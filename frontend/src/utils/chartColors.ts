// Paleta categorica validada (dataviz skill): orden fijo, no ciclado por rango de valores.
export const CATEGORICAL_LIGHT = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
]

// Par divergente (positivo/negativo): usado solo para ingresos vs gastos.
export const DIVERGING = {
  positive: "#2a78d6", // blue
  negative: "#e34948", // red
}

/** Asigna un color estable por nombre de entidad (orden alfabetico), no por su posicion en el render. */
export function buildColorMap(names: string[]): Map<string, string> {
  const unique = [...new Set(names)].sort((a, b) => a.localeCompare(b))
  const map = new Map<string, string>()
  unique.forEach((name, index) => map.set(name, CATEGORICAL_LIGHT[index % CATEGORICAL_LIGHT.length]))
  return map
}
