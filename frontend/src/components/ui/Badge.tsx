import type { ReactNode } from "react"

import { cn } from "@/utils/cn"

type Tone = "slate" | "blue" | "amber" | "red" | "green" | "violet"

const toneClasses: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  red: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  violet: "bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300",
}

export function Badge({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", toneClasses[tone])}>
      {children}
    </span>
  )
}
