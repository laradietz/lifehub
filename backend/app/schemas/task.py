import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Priority, RecurrenceType, TaskStatus


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Priority = Priority.MEDIUM
    category_id: Optional[uuid.UUID] = None
    recurrence: RecurrenceType = RecurrenceType.NONE
    recurrence_rule: Optional[str] = Field(default=None, max_length=255)
    tags: list[str] = Field(default_factory=list)


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[Priority] = None
    status: Optional[TaskStatus] = None
    category_id: Optional[uuid.UUID] = None
    recurrence: Optional[RecurrenceType] = None
    recurrence_rule: Optional[str] = Field(default=None, max_length=255)
    tags: Optional[list[str]] = None


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: TaskStatus
    created_at: datetime
    updated_at: datetime
