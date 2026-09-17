import uuid
from datetime import date
from typing import Optional

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.enums import Priority, RecurrenceType
from app.models.mixins import TimestampMixin, UUIDMixin


class Reminder(UUIDMixin, TimestampMixin, Base):
    """Cosas que el usuario no quiere olvidar: seguros, documentos, suscripciones, turnos, etc."""

    __tablename__ = "reminders"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    priority: Mapped[Priority] = mapped_column(Enum(Priority, name="reminder_priority"), default=Priority.MEDIUM, nullable=False)
    recurrence: Mapped[RecurrenceType] = mapped_column(
        Enum(RecurrenceType, name="reminder_recurrence"), default=RecurrenceType.NONE, nullable=False
    )
    advance_notice_days: Mapped[list[int]] = mapped_column(ARRAY(Integer), default=lambda: [30, 7, 1])
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
