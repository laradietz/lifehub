import uuid
from typing import Any

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import TimestampMixin, UUIDMixin

DEFAULT_MODULES = ["tasks", "reminders", "finance", "shopping", "home", "documents", "vehicles", "calendar"]
DEFAULT_WIDGETS = ["today", "finance_summary", "shopping", "upcoming_due", "week_summary"]


class UserSettings(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "user_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )

    language: Mapped[str] = mapped_column(String(10), default="es", nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC", nullable=False)
    theme: Mapped[str] = mapped_column(String(10), default="system", nullable=False)

    enabled_modules: Mapped[list[str]] = mapped_column(ARRAY(String), default=lambda: list(DEFAULT_MODULES))
    dashboard_widgets: Mapped[list[str]] = mapped_column(ARRAY(String), default=lambda: list(DEFAULT_WIDGETS))
    notification_preferences: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)

    ai_data_access_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship(back_populates="settings")
