import { api } from "@/services/api"
import type { Vehicle, VehicleMaintenance, VehicleMaintenancePayload, VehiclePayload } from "@/types/vehicle"

export const vehicleService = {
  async list(): Promise<Vehicle[]> {
    const { data } = await api.get<Vehicle[]>("/vehicles")
    return data
  },

  async create(payload: VehiclePayload): Promise<Vehicle> {
    const { data } = await api.post<Vehicle>("/vehicles", payload)
    return data
  },

  async update(id: string, payload: Partial<VehiclePayload>): Promise<Vehicle> {
    const { data } = await api.patch<Vehicle>(`/vehicles/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/vehicles/${id}`)
  },

  async addMaintenance(vehicleId: string, payload: VehicleMaintenancePayload): Promise<VehicleMaintenance> {
    const { data } = await api.post<VehicleMaintenance>(`/vehicles/${vehicleId}/maintenance`, payload)
    return data
  },

  async updateMaintenance(
    vehicleId: string,
    maintenanceId: string,
    payload: Partial<VehicleMaintenancePayload>,
  ): Promise<VehicleMaintenance> {
    const { data } = await api.patch<VehicleMaintenance>(`/vehicles/${vehicleId}/maintenance/${maintenanceId}`, payload)
    return data
  },

  async removeMaintenance(vehicleId: string, maintenanceId: string): Promise<void> {
    await api.delete(`/vehicles/${vehicleId}/maintenance/${maintenanceId}`)
  },
}
