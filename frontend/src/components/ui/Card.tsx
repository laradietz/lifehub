import type { HTMLAttributes } from "react"

import { cn } from "@/utils/cn"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Eleva la sombra y resalta el borde al pasar el mouse -- para cards que son un link/botón. */
  interactive?: boolean
}

export function Card({ className, interactive, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 dark:border-slate-800 dark:bg-slate-900",
        interactive && "hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md dark:hover:border-brand-900",
        className,
      )}
      {...props}
    />
  )
}
