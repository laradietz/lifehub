import { Pencil, Trash2 } from "lucide-react"

import type { VehicleMaintenance } from "@/types/vehicle"
import { formatDate } from "@/utils/taskMeta"
import { formatCurrency } from "@/utils/currency"
import { MAINTENANCE_TYPE_LABEL } from "@/utils/vehicleMeta"

interface MaintenanceItemProps {
  maintenance: VehicleMaintenance
  currency: string
  onEdit: (maintenance: VehicleMaintenance) => void
  onDelete: (maintenance: VehicleMaintenance) => void
}

export function MaintenanceItem({ maintenance, currency, onEdit, onDelete }: MaintenanceItemProps) {
  return (
    <li className="flex flex-col gap-1 rounded-lg border-b border-slate-100 px-2 py-3 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{MAINTENANCE_TYPE_LABEL[maintenance.type]}</p>
          <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(maintenance.date)}</span>
        </div>
        {maintenance.cost && (
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {formatCurrency(maintenance.cost, currency)}
          </span>
        )}
      </div>

      {maintenance.description && <p className="text-sm text-slate-500 dark:text-slate-400">{maintenance.description}</p>}

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
        {maintenance.mileage_at_service !== null && <span>Km: {maintenance.mileage_at_service.toLocaleString("es-AR")}</span>}
        {maintenance.next_due_date && <span>Próximo: {formatDate(maintenance.next_due_date)}</span>}
        {maintenance.next_due_mileage !== null && <span>Próximo km: {maintenance.next_due_mileage.toLocaleString("es-AR")}</span>}
        <button
          type="button"
          onClick={() => onEdit(maintenance)}
          className="focus-ring flex items-center gap-1 font-medium hover:text-slate-600 dark:hover:text-slate-300"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          Editar
        </button>
        <button
          type="button"
          onClick={() => onDelete(maintenance)}
          className="focus-ring flex items-center gap-1 font-medium hover:text-red-600 dark:hover:text-red-400"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          Eliminar
        </button>
      </div>
    </li>
  )
}
