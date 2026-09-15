import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.vehicle import (
    VehicleCreate,
    VehicleMaintenanceCreate,
    VehicleMaintenanceRead,
    VehicleMaintenanceUpdate,
    VehicleRead,
    VehicleUpdate,
)
from app.services.vehicle_service import VehicleService

router = APIRouter()


@router.get("", response_model=list[VehicleRead])
def list_vehicles(
    current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> list[VehicleRead]:
    service = VehicleService(db)
    return service.list(current_user.id)


@router.post("", response_model=VehicleRead, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    data: VehicleCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> VehicleRead:
    service = VehicleService(db)
    return service.create(current_user.id, data)


@router.get("/{vehicle_id}", response_model=VehicleRead)
def get_vehicle(
    vehicle_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> VehicleRead:
    service = VehicleService(db)
    return service.get_owned_or_404(vehicle_id, current_user.id)


@router.patch("/{vehicle_id}", response_model=VehicleRead)
def update_vehicle(
    vehicle_id: uuid.UUID,
    data: VehicleUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> VehicleRead:
    service = VehicleService(db)
    return service.update(vehicle_id, current_user.id, data)


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    vehicle_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> None:
    service = VehicleService(db)
    service.delete(vehicle_id, current_user.id)


@router.post("/{vehicle_id}/maintenance", response_model=VehicleMaintenanceRead, status_code=status.HTTP_201_CREATED)
def add_maintenance(
    vehicle_id: uuid.UUID,
    data: VehicleMaintenanceCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> VehicleMaintenanceRead:
    service = VehicleService(db)
    return service.add_maintenance(vehicle_id, current_user.id, data)


@router.patch("/{vehicle_id}/maintenance/{maintenance_id}", response_model=VehicleMaintenanceRead)
def update_maintenance(
    vehicle_id: uuid.UUID,
    maintenance_id: uuid.UUID,
    data: VehicleMaintenanceUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> VehicleMaintenanceRead:
    service = VehicleService(db)
    return service.update_maintenance(vehicle_id, maintenance_id, current_user.id, data)


@router.delete("/{vehicle_id}/maintenance/{maintenance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_maintenance(
    vehicle_id: uuid.UUID,
    maintenance_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> None:
    service = VehicleService(db)
    service.delete_maintenance(vehicle_id, maintenance_id, current_user.id)
