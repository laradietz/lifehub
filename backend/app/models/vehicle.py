import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.enums import VehicleMaintenanceType
from app.models.mixins import TimestampMixin, UUIDMixin


class Vehicle(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "vehicles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    brand: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    year: Mapped[Optional[int]] = mapped_column(Integer)
    license_plate: Mapped[Optional[str]] = mapped_column(String(20))
    mileage: Mapped[Optional[int]] = mapped_column(Integer)

    maintenance_records: Mapped[list["VehicleMaintenance"]] = relationship(
        back_populates="vehicle", cascade="all, delete-orphan"
    )


class VehicleMaintenance(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "vehicle_maintenance"

    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )

    type: Mapped[VehicleMaintenanceType] = mapped_column(Enum(VehicleMaintenanceType, name="vehicle_maintenance_type"), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    mileage_at_service: Mapped[Optional[int]] = mapped_column(Integer)
    cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    next_due_date: Mapped[Optional[date]] = mapped_column(Date, index=True)
    next_due_mileage: Mapped[Optional[int]] = mapped_column(Integer)

    vehicle: Mapped["Vehicle"] = relationship(back_populates="maintenance_records")
