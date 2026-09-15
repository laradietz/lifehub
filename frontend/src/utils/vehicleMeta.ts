import type { VehicleMaintenanceType } from "@/types/vehicle"

export const MAINTENANCE_TYPE_LABEL: Record<VehicleMaintenanceType, string> = {
  oil_change: "Cambio de aceite",
  service: "Service",
  tires: "Neumáticos",
  battery: "Batería",
  repair: "Reparación",
  other: "Otro",
}
