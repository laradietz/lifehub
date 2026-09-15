import { useState } from "react"

import type { CategoryBreakdownItem } from "@/types/finance"
import { buildColorMap } from "@/utils/chartColors"
import { formatCurrency } from "@/utils/currency"

interface ExpenseCategoryChartProps {
  data: CategoryBreakdownItem[]
  currency: string
}

const ROW_HEIGHT = 32
const BAR_HEIGHT = 18
const LABEL_WIDTH = 96
const CHART_WIDTH = 420
// Deja siempre aire a la derecha de la barra mas larga para el valor, en vez de
// que el label se salga del viewBox cuando el valor mas alto ocupa todo el ancho.
const MAX_BAR_RATIO = 0.72

export function ExpenseCategoryChart({ data, currency }: ExpenseCategoryChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Todavía no registraste gastos este mes.
      </p>
    )
  }

  const colorMap = buildColorMap(data.map((item) => item.category_name))
  const max = Math.max(...data.map((item) => Number.parseFloat(item.total)))
  const plotWidth = CHART_WIDTH - LABEL_WIDTH
  const height = data.length * ROW_HEIGHT

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${CHART_WIDTH} ${height}`} width="100%" height={height} role="img" aria-label="Gastos por categoría este mes">
        <title>Gastos por categoría este mes</title>
        {data.map((item, index) => {
          const value = Number.parseFloat(item.total)
          const barWidth = max > 0 ? (value / max) * plotWidth * MAX_BAR_RATIO : 0
          const y = index * ROW_HEIGHT
          const color = colorMap.get(item.category_name) ?? "#2a78d6"
          const isHovered = hoveredIndex === index

          return (
            <g
              key={item.category_id ?? item.category_name}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex((current) => (current === index ? null : current))}
              className="cursor-default"
            >
              <text
                x={LABEL_WIDTH - 10}
                y={y + ROW_HEIGHT / 2 + 4}
                textAnchor="end"
                className="fill-slate-600 text-[11px] dark:fill-slate-300"
              >
                {item.category_name}
              </text>
              <rect
                x={LABEL_WIDTH}
                y={y + (ROW_HEIGHT - BAR_HEIGHT) / 2}
                width={plotWidth * MAX_BAR_RATIO}
                height={BAR_HEIGHT}
                rx={4}
                className="fill-slate-100 dark:fill-slate-800"
              />
              <rect
                x={LABEL_WIDTH}
                y={y + (ROW_HEIGHT - BAR_HEIGHT) / 2}
                width={Math.max(barWidth, 3)}
                height={BAR_HEIGHT}
                rx={4}
                fill={color}
                opacity={isHovered ? 1 : 0.92}
              />
              <text
                x={LABEL_WIDTH + Math.max(barWidth, 3) + 8}
                y={y + ROW_HEIGHT / 2 + 4}
                className="fill-slate-500 text-[11px] font-medium dark:fill-slate-400"
              >
                {formatCurrency(value, currency)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
