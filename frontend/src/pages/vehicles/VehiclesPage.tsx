import { useEffect, useState } from "react"

import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Skeleton } from "@/components/ui/Skeleton"
import { MaintenanceFormModal } from "@/pages/vehicles/MaintenanceFormModal"
import { MaintenanceItem } from "@/pages/vehicles/MaintenanceItem"
import { VehicleFormModal } from "@/pages/vehicles/VehicleFormModal"
import { extractErrorMessage } from "@/services/api"
import { settingsService } from "@/services/settingsService"
import { vehicleService } from "@/services/vehicleService"
import type { Vehicle, VehicleMaintenance, VehicleMaintenancePayload, VehiclePayload } from "@/types/vehicle"

export function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [currency, setCurrency] = useState("USD")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isVehicleFormOpen, setIsVehicleFormOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [isDeleteVehicleOpen, setIsDeleteVehicleOpen] = useState(false)
  const [isDeletingVehicle, setIsDeletingVehicle] = useState(false)

  const [isMaintenanceFormOpen, setIsMaintenanceFormOpen] = useState(false)
  const [editingMaintenance, setEditingMaintenance] = useState<VehicleMaintenance | null>(null)
  const [deletingMaintenance, setDeletingMaintenance] = useState<VehicleMaintenance | null>(null)
  const [isDeletingMaintenance, setIsDeletingMaintenance] = useState(false)

  async function loadVehicles() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await vehicleService.list()
      setVehicles(data)
      setSelectedVehicleId((current) => current ?? data[0]?.id ?? null)
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos cargar tus vehículos."))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadVehicles()
    settingsService
      .get()
      .then((settings) => setCurrency(settings.currency))
      .catch(() => setCurrency("USD"))
  }, [])

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null

  async function handleCreateVehicle(payload: VehiclePayload) {
    const created = await vehicleService.create(payload)
    await loadVehicles()
    setSelectedVehicleId(created.id)
  }

  async function handleUpdateVehicle(payload: VehiclePayload) {
    if (!editingVehicle) return
    await vehicleService.update(editingVehicle.id, payload)
    await loadVehicles()
  }

  async function handleDeleteVehicle() {
    if (!selectedVehicle) return
    setIsDeletingVehicle(true)
    try {
      await vehicleService.remove(selectedVehicle.id)
      setSelectedVehicleId(null)
      setIsDeleteVehicleOpen(false)
      await loadVehicles()
    } finally {
      setIsDeletingVehicle(false)
    }
  }

  async function handleSubmitMaintenance(payload: VehicleMaintenancePayload) {
    if (!selectedVehicle) return
    if (editingMaintenance) {
      await vehicleService.updateMaintenance(selectedVehicle.id, editingMaintenance.id, payload)
    } else {
      await vehicleService.addMaintenance(selectedVehicle.id, payload)
    }
    await loadVehicles()
  }

  async function handleDeleteMaintenance() {
    if (!selectedVehicle || !deletingMaintenance) return
    setIsDeletingMaintenance(true)
    try {
      await vehicleService.removeMaintenance(selectedVehicle.id, deletingMaintenance.id)
      setDeletingMaintenance(null)
      await loadVehicles()
    } finally {
      setIsDeletingMaintenance(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Vehículos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Mantenimiento y kilometraje de tus autos.</p>
        </div>
        <Button
          onClick={() => {
            setEditingVehicle(null)
            setIsVehicleFormOpen(true)
          }}
        >
          Nuevo vehículo
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : vehicles.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-5 py-14 text-center">
          <span className="text-2xl">🚗</span>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Todavía no tenés vehículos</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Agregá tu auto para llevar el registro de mantenimiento.</p>
        </Card>
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
            {vehicles.map((vehicle) => (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => setSelectedVehicleId(vehicle.id)}
                className={`focus-ring shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedVehicleId === vehicle.id
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {vehicle.brand} {vehicle.model}
              </button>
            ))}
          </div>

          {selectedVehicle && (
            <>
              <Card className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year ? `(${selectedVehicle.year})` : ""}
                    </h2>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                      {selectedVehicle.license_plate && <span>Patente: {selectedVehicle.license_plate}</span>}
                      {selectedVehicle.mileage !== null && (
                        <span>Kilometraje: {selectedVehicle.mileage.toLocaleString("es-AR")} km</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-3 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingVehicle(selectedVehicle)
                        setIsVehicleFormOpen(true)
                      }}
                      className="focus-ring text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDeleteVehicleOpen(true)}
                      className="focus-ring text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </Card>

              <Card className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Mantenimiento</h2>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingMaintenance(null)
                      setIsMaintenanceFormOpen(true)
                    }}
                  >
                    Agregar
                  </Button>
                </div>

                {selectedVehicle.maintenance_records.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    Todavía no registraste ningún mantenimiento.
                  </p>
                ) : (
                  <ul>
                    {selectedVehicle.maintenance_records.map((record) => (
                      <MaintenanceItem
                        key={record.id}
                        maintenance={record}
                        currency={currency}
                        onEdit={(item) => {
                          setEditingMaintenance(item)
                          setIsMaintenanceFormOpen(true)
                        }}
                        onDelete={setDeletingMaintenance}
                      />
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}
        </>
      )}

      <VehicleFormModal
        isOpen={isVehicleFormOpen}
        vehicle={editingVehicle}
        onClose={() => setIsVehicleFormOpen(false)}
        onSubmit={editingVehicle ? handleUpdateVehicle : handleCreateVehicle}
      />

      <MaintenanceFormModal
        isOpen={isMaintenanceFormOpen}
        maintenance={editingMaintenance}
        onClose={() => setIsMaintenanceFormOpen(false)}
        onSubmit={handleSubmitMaintenance}
      />

      <ConfirmDialog
        isOpen={isDeleteVehicleOpen}
        title="Eliminar vehículo"
        description={`¿Seguro que querés eliminar "${selectedVehicle?.brand} ${selectedVehicle?.model}"? Esto también borra su historial de mantenimiento.`}
        isConfirming={isDeletingVehicle}
        onConfirm={handleDeleteVehicle}
        onCancel={() => setIsDeleteVehicleOpen(false)}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingMaintenance)}
        title="Eliminar mantenimiento"
        description="¿Seguro que querés eliminar este registro de mantenimiento?"
        isConfirming={isDeletingMaintenance}
        onConfirm={handleDeleteMaintenance}
        onCancel={() => setDeletingMaintenance(null)}
      />
    </div>
  )
}
