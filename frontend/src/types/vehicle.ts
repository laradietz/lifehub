export type VehicleMaintenanceType = "oil_change" | "service" | "tires" | "battery" | "repair" | "other"

export interface VehicleMaintenance {
  id: string
  vehicle_id: string
  type: VehicleMaintenanceType
  description: string | null
  date: string
  mileage_at_service: number | null
  cost: string | null
  next_due_date: string | null
  next_due_mileage: number | null
  created_at: string
  updated_at: string
}

export interface VehicleMaintenancePayload {
  type: VehicleMaintenanceType
  description: string | null
  date: string
  mileage_at_service: number | null
  cost: string | null
  next_due_date: string | null
  next_due_mileage: number | null
}

export interface Vehicle {
  id: string
  brand: string
  model: string
  year: number | null
  license_plate: string | null
  mileage: number | null
  created_at: string
  updated_at: string
  maintenance_records: VehicleMaintenance[]
}

export interface VehiclePayload {
  brand: string
  model: string
  year: number | null
  license_plate: string | null
  mileage: number | null
}
