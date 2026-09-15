import uuid
from datetime import date
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.enums import DocumentCategory


class DocumentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, document_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Document]:
        stmt = select(Document).where(Document.id == document_id, Document.user_id == user_id)
        return self.db.scalar(stmt)

    def list(
        self,
        user_id: uuid.UUID,
        *,
        category: Optional[DocumentCategory] = None,
        expiring_before: Optional[date] = None,
    ) -> list[Document]:
        stmt = select(Document).where(Document.user_id == user_id)
        if category:
            stmt = stmt.where(Document.category == category)
        if expiring_before:
            stmt = stmt.where(Document.expiry_date.is_not(None), Document.expiry_date <= expiring_before)
        stmt = stmt.order_by(Document.expiry_date.asc().nulls_last(), Document.name.asc())
        return list(self.db.scalars(stmt))

    def create(self, user_id: uuid.UUID, **fields: Any) -> Document:
        document = Document(user_id=user_id, **fields)
        self.db.add(document)
        self.db.flush()
        return document

    def delete(self, document: Document) -> None:
        self.db.delete(document)
