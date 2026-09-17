import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class EventBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    start_at: datetime
    end_at: Optional[datetime] = None
    all_day: bool = False
    location: Optional[str] = Field(default=None, max_length=255)
    category_id: Optional[uuid.UUID] = None
    household_id: Optional[uuid.UUID] = None

    @model_validator(mode="after")
    def _end_after_start(self) -> "EventBase":
        if self.end_at is not None and self.end_at < self.start_at:
            raise ValueError("La fecha de fin no puede ser anterior a la de inicio.")
        return self


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    all_day: Optional[bool] = None
    location: Optional[str] = Field(default=None, max_length=255)
    category_id: Optional[uuid.UUID] = None
    household_id: Optional[uuid.UUID] = None

    @model_validator(mode="after")
    def _end_after_start(self) -> "EventUpdate":
        # Solo podemos validar el orden si el request trae ambas fechas juntas: una
        # actualización parcial de una sola fecha no tiene forma de saber la otra sin
        # consultar la fila existente (eso se resuelve en el service, no acá).
        if self.start_at is not None and self.end_at is not None and self.end_at < self.start_at:
            raise ValueError("La fecha de fin no puede ser anterior a la de inicio.")
        return self


class EventRead(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
