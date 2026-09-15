import uuid
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.vehicle import Vehicle, VehicleMaintenance


class VehicleRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, vehicle_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Vehicle]:
        stmt = (
            select(Vehicle)
            .where(Vehicle.id == vehicle_id, Vehicle.user_id == user_id)
            .options(selectinload(Vehicle.maintenance_records))
        )
        return self.db.scalar(stmt)

    def list(self, user_id: uuid.UUID) -> list[Vehicle]:
        stmt = (
            select(Vehicle)
            .where(Vehicle.user_id == user_id)
            .options(selectinload(Vehicle.maintenance_records))
            .order_by(Vehicle.brand.asc(), Vehicle.model.asc())
        )
        return list(self.db.scalars(stmt))

    def create(self, user_id: uuid.UUID, **fields: Any) -> Vehicle:
        vehicle = Vehicle(user_id=user_id, **fields)
        self.db.add(vehicle)
        self.db.flush()
        return vehicle

    def delete(self, vehicle: Vehicle) -> None:
        self.db.delete(vehicle)


class VehicleMaintenanceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, maintenance_id: uuid.UUID) -> Optional[VehicleMaintenance]:
        return self.db.get(VehicleMaintenance, maintenance_id)

    def create(self, vehicle_id: uuid.UUID, **fields: Any) -> VehicleMaintenance:
        record = VehicleMaintenance(vehicle_id=vehicle_id, **fields)
        self.db.add(record)
        self.db.flush()
        return record

    def delete(self, record: VehicleMaintenance) -> None:
        self.db.delete(record)
