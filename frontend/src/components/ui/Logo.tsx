import { cn } from "@/utils/cn"

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
        V
      </span>
      <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Vida En Orden</span>
    </div>
  )
}
