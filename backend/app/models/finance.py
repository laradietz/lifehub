import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.enums import PaymentMethod
from app.models.mixins import TimestampMixin, UUIDMixin


class Income(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "incomes"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )

    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    payment_method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod, name="income_payment_method"), nullable=False)


class Expense(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "expenses"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )

    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    payment_method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod, name="expense_payment_method"), nullable=False)
