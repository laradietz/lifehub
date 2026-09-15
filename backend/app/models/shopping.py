import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class ShoppingList(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "shopping_lists"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    household_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), default="Lista principal", nullable=False)

    items: Mapped[list["ShoppingItem"]] = relationship(back_populates="shopping_list", cascade="all, delete-orphan")


class ShoppingItem(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "shopping_items"

    shopping_list_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shopping_lists.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    quantity: Mapped[float] = mapped_column(Float, default=1)
    unit: Mapped[Optional[str]] = mapped_column(String(50))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    is_purchased: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    purchased_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    shopping_list: Mapped["ShoppingList"] = relationship(back_populates="items")


class ShoppingHistory(UUIDMixin, TimestampMixin, Base):
    """Historial de compras normalizado por nombre de producto, usado para estimar frecuencia de recompra."""

    __tablename__ = "shopping_history"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    item_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    purchased_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
