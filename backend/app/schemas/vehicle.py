import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import VehicleMaintenanceType


class VehicleBase(BaseModel):
    brand: str = Field(min_length=1, max_length=100)
    model: str = Field(min_length=1, max_length=100)
    year: Optional[int] = Field(default=None, ge=1900, le=2100)
    license_plate: Optional[str] = Field(default=None, max_length=20)
    mileage: Optional[int] = Field(default=None, ge=0)


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    brand: Optional[str] = Field(default=None, min_length=1, max_length=100)
    model: Optional[str] = Field(default=None, min_length=1, max_length=100)
    year: Optional[int] = Field(default=None, ge=1900, le=2100)
    license_plate: Optional[str] = Field(default=None, max_length=20)
    mileage: Optional[int] = Field(default=None, ge=0)


class VehicleMaintenanceBase(BaseModel):
    type: VehicleMaintenanceType
    description: Optional[str] = None
    date: date
    mileage_at_service: Optional[int] = Field(default=None, ge=0)
    cost: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    next_due_date: Optional[date] = None
    next_due_mileage: Optional[int] = Field(default=None, ge=0)


class VehicleMaintenanceCreate(VehicleMaintenanceBase):
    pass


class VehicleMaintenanceUpdate(BaseModel):
    type: Optional[VehicleMaintenanceType] = None
    description: Optional[str] = None
    date: Optional[date] = None
    mileage_at_service: Optional[int] = Field(default=None, ge=0)
    cost: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    next_due_date: Optional[date] = None
    next_due_mileage: Optional[int] = Field(default=None, ge=0)


class VehicleMaintenanceRead(VehicleMaintenanceBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    vehicle_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class VehicleRead(VehicleBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    maintenance_records: list[VehicleMaintenanceRead] = Field(default_factory=list)
