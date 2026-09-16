import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import NotificationChannel, NotificationType


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: NotificationType
    channel: NotificationChannel
    title: str
    message: str
    is_read: bool
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[uuid.UUID] = None
    created_at: datetime


class NotificationUnreadCount(BaseModel):
    count: int


class NotificationMarkAllRead(BaseModel):
    updated: int
