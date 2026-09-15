import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.enums import NotificationChannel, NotificationType
from app.models.mixins import TimestampMixin, UUIDMixin


class Notification(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType, name="notification_type"), nullable=False)
    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel, name="notification_channel"), default=NotificationChannel.IN_APP, nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    related_entity_type: Mapped[Optional[str]] = mapped_column(String(50))
    related_entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))

    scheduled_for: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
