import uuid
from datetime import date
from typing import Optional

from sqlalchemy import BigInteger, Date, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.enums import DocumentCategory
from app.models.mixins import TimestampMixin, UUIDMixin


class Document(UUIDMixin, TimestampMixin, Base):
    """Metadatos de documentos importantes. El archivo se guarda en almacenamiento privado (nunca publico)."""

    __tablename__ = "documents"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[DocumentCategory] = mapped_column(Enum(DocumentCategory, name="document_category"), nullable=False)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    storage_key: Mapped[Optional[str]] = mapped_column(String(500))
    file_name: Mapped[Optional[str]] = mapped_column(String(255))
    file_size: Mapped[Optional[int]] = mapped_column(BigInteger)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100))
