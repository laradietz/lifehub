import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle, VehicleMaintenance
from app.repositories.vehicle_repository import VehicleMaintenanceRepository, VehicleRepository
from app.schemas.vehicle import VehicleCreate, VehicleMaintenanceCreate, VehicleMaintenanceUpdate, VehicleUpdate


class VehicleService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = VehicleRepository(db)
        self.maintenance_repo = VehicleMaintenanceRepository(db)

    def list(self, user_id: uuid.UUID) -> list[Vehicle]:
        return self.repo.list(user_id)

    def get_owned_or_404(self, vehicle_id: uuid.UUID, user_id: uuid.UUID) -> Vehicle:
        vehicle = self.repo.get(vehicle_id, user_id)
        if not vehicle:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Vehículo no encontrado.")
        return vehicle

    def create(self, user_id: uuid.UUID, data: VehicleCreate) -> Vehicle:
        vehicle = self.repo.create(user_id, **data.model_dump())
        self.db.commit()
        self.db.refresh(vehicle)
        return vehicle

    def update(self, vehicle_id: uuid.UUID, user_id: uuid.UUID, data: VehicleUpdate) -> Vehicle:
        vehicle = self.get_owned_or_404(vehicle_id, user_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(vehicle, field, value)
        self.db.commit()
        self.db.refresh(vehicle)
        return vehicle

    def delete(self, vehicle_id: uuid.UUID, user_id: uuid.UUID) -> None:
        vehicle = self.get_owned_or_404(vehicle_id, user_id)
        self.repo.delete(vehicle)
        self.db.commit()

    def add_maintenance(
        self, vehicle_id: uuid.UUID, user_id: uuid.UUID, data: VehicleMaintenanceCreate
    ) -> VehicleMaintenance:
        vehicle = self.get_owned_or_404(vehicle_id, user_id)
        record = self.maintenance_repo.create(vehicle_id, **data.model_dump())
        # El kilometraje registrado en un service es un dato mas confiable que el que
        # quedo cargado manualmente en el vehiculo, asi que lo actualizamos si es mayor.
        if data.mileage_at_service is not None and (vehicle.mileage is None or data.mileage_at_service > vehicle.mileage):
            vehicle.mileage = data.mileage_at_service
        self.db.commit()
        self.db.refresh(record)
        return record

    def _get_owned_maintenance_or_404(
        self, vehicle_id: uuid.UUID, maintenance_id: uuid.UUID, user_id: uuid.UUID
    ) -> VehicleMaintenance:
        self.get_owned_or_404(vehicle_id, user_id)
        record = self.maintenance_repo.get(maintenance_id)
        if not record or record.vehicle_id != vehicle_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Registro de mantenimiento no encontrado.")
        return record

    def update_maintenance(
        self, vehicle_id: uuid.UUID, maintenance_id: uuid.UUID, user_id: uuid.UUID, data: VehicleMaintenanceUpdate
    ) -> VehicleMaintenance:
        record = self._get_owned_maintenance_or_404(vehicle_id, maintenance_id, user_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(record, field, value)
        self.db.commit()
        self.db.refresh(record)
        return record

    def delete_maintenance(self, vehicle_id: uuid.UUID, maintenance_id: uuid.UUID, user_id: uuid.UUID) -> None:
        record = self._get_owned_maintenance_or_404(vehicle_id, maintenance_id, user_id)
        self.maintenance_repo.delete(record)
        self.db.commit()
