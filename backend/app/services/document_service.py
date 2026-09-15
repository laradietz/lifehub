import uuid
from datetime import date, timedelta
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document import Document
from app.models.enums import DocumentCategory
from app.repositories.document_repository import DocumentRepository
from app.schemas.document import DocumentCreate, DocumentUpdate
from app.services.storage_service import get_storage_service

_MAX_UPLOAD_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


class DocumentService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = DocumentRepository(db)
        self.storage = get_storage_service()

    def list(
        self,
        user_id: uuid.UUID,
        *,
        category: Optional[DocumentCategory] = None,
        expiring_within_days: Optional[int] = None,
    ) -> list[Document]:
        expiring_before = date.today() + timedelta(days=expiring_within_days) if expiring_within_days is not None else None
        return self.repo.list(user_id, category=category, expiring_before=expiring_before)

    def get_owned_or_404(self, document_id: uuid.UUID, user_id: uuid.UUID) -> Document:
        document = self.repo.get(document_id, user_id)
        if not document:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Documento no encontrado.")
        return document

    def create(self, user_id: uuid.UUID, data: DocumentCreate) -> Document:
        document = self.repo.create(user_id, **data.model_dump())
        self.db.commit()
        self.db.refresh(document)
        return document

    def update(self, document_id: uuid.UUID, user_id: uuid.UUID, data: DocumentUpdate) -> Document:
        document = self.get_owned_or_404(document_id, user_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(document, field, value)
        self.db.commit()
        self.db.refresh(document)
        return document

    def delete(self, document_id: uuid.UUID, user_id: uuid.UUID) -> None:
        document = self.get_owned_or_404(document_id, user_id)
        if document.storage_key:
            self.storage.delete(document.storage_key)
        self.repo.delete(document)
        self.db.commit()

    def attach_file(self, document_id: uuid.UUID, user_id: uuid.UUID, file: UploadFile) -> Document:
        document = self.get_owned_or_404(document_id, user_id)

        contents = file.file.read()
        if len(contents) > _MAX_UPLOAD_BYTES:
            raise HTTPException(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                f"El archivo supera el tamaño máximo permitido ({settings.MAX_UPLOAD_SIZE_MB} MB).",
            )
        file.file.seek(0)

        if document.storage_key:
            self.storage.delete(document.storage_key)

        safe_name = Path(file.filename or "archivo").name
        key = f"documents/{user_id}/{uuid4().hex}_{safe_name}"
        self.storage.upload(key, file.file, file.content_type)

        document.storage_key = key
        document.file_name = safe_name
        document.file_size = len(contents)
        document.mime_type = file.content_type
        self.db.commit()
        self.db.refresh(document)
        return document

    def remove_file(self, document_id: uuid.UUID, user_id: uuid.UUID) -> Document:
        document = self.get_owned_or_404(document_id, user_id)
        if document.storage_key:
            self.storage.delete(document.storage_key)
        document.storage_key = None
        document.file_name = None
        document.file_size = None
        document.mime_type = None
        self.db.commit()
        self.db.refresh(document)
        return document

    def get_file_stream(self, document_id: uuid.UUID, user_id: uuid.UUID):
        document = self.get_owned_or_404(document_id, user_id)
        if not document.storage_key:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Este documento no tiene un archivo adjunto.")
        iterator, content_type = self.storage.stream(document.storage_key)
        return iterator, content_type or document.mime_type or "application/octet-stream", document.file_name or "archivo"
