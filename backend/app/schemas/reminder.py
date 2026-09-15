import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Priority, RecurrenceType


class ReminderBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: date
    priority: Priority = Priority.MEDIUM
    category_id: Optional[uuid.UUID] = None
    recurrence: RecurrenceType = RecurrenceType.NONE
    advance_notice_days: list[int] = Field(default_factory=lambda: [30, 7, 1])


class ReminderCreate(ReminderBase):
    pass


class ReminderUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: Optional[date] = None
    priority: Optional[Priority] = None
    category_id: Optional[uuid.UUID] = None
    recurrence: Optional[RecurrenceType] = None
    advance_notice_days: Optional[list[int]] = None
    is_completed: Optional[bool] = None


class ReminderRead(ReminderBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_completed: bool
    created_at: datetime
    updated_at: datetime
