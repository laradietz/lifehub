import uuid
from datetime import date, datetime
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Priority, RecurrenceType

_NoticeDays = Annotated[int, Field(ge=0, le=365)]


class ReminderBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    due_date: date
    priority: Priority = Priority.MEDIUM
    category_id: Optional[uuid.UUID] = None
    recurrence: RecurrenceType = RecurrenceType.NONE
    advance_notice_days: list[_NoticeDays] = Field(default_factory=lambda: [30, 7, 1], max_length=10)


class ReminderCreate(ReminderBase):
    pass


class ReminderUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    due_date: Optional[date] = None
    priority: Optional[Priority] = None
    category_id: Optional[uuid.UUID] = None
    recurrence: Optional[RecurrenceType] = None
    advance_notice_days: Optional[list[_NoticeDays]] = Field(default=None, max_length=10)
    is_completed: Optional[bool] = None


class ReminderRead(ReminderBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_completed: bool
    created_at: datetime
    updated_at: datetime
