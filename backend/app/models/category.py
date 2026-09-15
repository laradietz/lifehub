import uuid
from typing import Optional

from sqlalchemy import Boolean, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.enums import CategoryType
from app.models.mixins import TimestampMixin, UUIDMixin


class Category(UUIDMixin, TimestampMixin, Base):
    """Categorias por usuario y por dominio. user_id nulo = categoria del sistema (seed)."""

    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("user_id", "type", "name", name="uq_category_user_type_name"),)

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    type: Mapped[CategoryType] = mapped_column(Enum(CategoryType, name="category_type"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[Optional[str]] = mapped_column(String(20))
    icon: Mapped[Optional[str]] = mapped_column(String(50))
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
