import { type MouseEvent, useMemo, useRef, useState } from "react"

import type { MonthlyPoint } from "@/types/finance"
import { DIVERGING } from "@/utils/chartColors"
import { formatCompactCurrency, formatCurrency } from "@/utils/currency"

interface IncomeExpenseTrendChartProps {
  data: MonthlyPoint[]
  currency: string
}

const WIDTH = 480
const HEIGHT = 220
const PADDING = { top: 28, right: 12, bottom: 28, left: 44 }
const GRID_STEPS = 4

const MONTH_LABELS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

function monthLabel(monthKey: string): string {
  const [, month] = monthKey.split("-")
  const index = Number.parseInt(month, 10) - 1
  return MONTH_LABELS[index] ?? monthKey
}

function niceMax(value: number): number {
  if (value <= 0) return 100
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

export function IncomeExpenseTrendChart({ data, currency }: IncomeExpenseTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null);

  const plotWidth = WIDTH - PADDING.left - PADDING.right
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom

  const maxValue = useMemo(() => {
    const rawMax = Math.max(1, ...data.map((point) => Math.max(Number.parseFloat(point.income), Number.parseFloat(point.expense))))
    return niceMax(rawMax)
  }, [data])

  const xFor = (index: number) => PADDING.left + (data.length <= 1 ? 0 : (index / (data.length - 1)) * plotWidth)
  const yFor = (value: number) => PADDING.top + plotHeight - (value / maxValue) * plotHeight

  const incomePoints = data.map((point, index) => ({ x: xFor(index), y: yFor(Number.parseFloat(point.income)) }))
  const expensePoints = data.map((point, index) => ({ x: xFor(index), y: yFor(Number.parseFloat(point.expense)) }))

  const incomePath = incomePoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
  const expensePath = expensePoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")

  const gridValues = Array.from({ length: GRID_STEPS + 1 }, (_, step) => (maxValue / GRID_STEPS) * step)

  function handleMouseMove(event: MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg || data.length === 0) return
    const rect = svg.getBoundingClientRect()
    const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH
    const ratio = (relativeX - PADDING.left) / plotWidth
    const index = Math.round(ratio * (data.length - 1))
    setHoverIndex(Math.min(data.length - 1, Math.max(0, index)))
  }

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Todavía no hay datos suficientes.</p>
  }

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const hoveredX = hoverIndex !== null ? xFor(hoverIndex) : null;
  const tooltipLeftPct = hoveredX !== null ? (hoveredX / WIDTH) * 100 : 0;

  return (
    <div className="relative">
      <div className="mb-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: DIVERGING.positive }} />
          Ingresos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: DIVERGING.negative }} />
          Gastos
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label="Evolución de ingresos y gastos en los últimos 6 meses"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <title>Evolución de ingresos y gastos</title>

        {gridValues.map((value) => (
          <g key={value}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={yFor(value)}
              y2={yFor(value)}
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeWidth={1}
            />
            <text x={PADDING.left - 8} y={yFor(value) + 3} textAnchor="end" className="fill-slate-400 text-[10px] dark:fill-slate-500">
              {formatCompactCurrency(value, currency)}
            </text>
          </g>
        ))}

        {data.map((point, index) => (
          <text
            key={point.month}
            x={xFor(index)}
            y={HEIGHT - 8}
            textAnchor="middle"
            className="fill-slate-400 text-[10px] dark:fill-slate-500"
          >
            {monthLabel(point.month)}
          </text>
        ))}

        {hoverIndex !== null && (
          <line
            x1={xFor(hoverIndex)}
            x2={xFor(hoverIndex)}
            y1={PADDING.top}
            y2={HEIGHT - PADDING.bottom}
            className="stroke-slate-300 dark:stroke-slate-700"
            strokeWidth={1}
          />
        )}

        <path d={incomePath} fill="none" stroke={DIVERGING.positive} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={expensePath} fill="none" stroke={DIVERGING.negative} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {incomePoints.map((point, index) => (
          <circle
            key={`income-${data[index].month}`}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={DIVERGING.positive}
            stroke="var(--chart-surface, #fff)"
            strokeWidth={2}
            className="dark:[stroke:#0f172a]"
          />
        ))}
        {expensePoints.map((point, index) => (
          <circle
            key={`expense-${data[index].month}`}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={DIVERGING.negative}
            stroke="var(--chart-surface, #fff)"
            strokeWidth={2}
            className="dark:[stroke:#0f172a]"
          />
        ))}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-900"
          style={{ left: `${tooltipLeftPct}%` }}
        >
          <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">{monthLabel(hovered.month)}</p>
          <p style={{ color: DIVERGING.positive }}>Ingresos: {formatCurrency(hovered.income, currency)}</p>
          <p style={{ color: DIVERGING.negative }}>Gastos: {formatCurrency(hovered.expense, currency)}</p>
        </div>
      )}
    </div>
  )
}
