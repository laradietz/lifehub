import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.enums import DocumentCategory
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentRead, DocumentUpdate
from app.services.document_service import DocumentService

router = APIRouter()


@router.get("", response_model=list[DocumentRead])
def list_documents(
    category: Optional[DocumentCategory] = Query(default=None),
    expiring_within_days: Optional[int] = Query(default=None, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[DocumentRead]:
    service = DocumentService(db)
    return service.list(current_user.id, category=category, expiring_within_days=expiring_within_days)


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
def create_document(
    data: DocumentCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> DocumentRead:
    service = DocumentService(db)
    return service.create(current_user.id, data)


@router.get("/{document_id}", response_model=DocumentRead)
def get_document(
    document_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> DocumentRead:
    service = DocumentService(db)
    return service.get_owned_or_404(document_id, current_user.id)


@router.patch("/{document_id}", response_model=DocumentRead)
def update_document(
    document_id: uuid.UUID,
    data: DocumentUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> DocumentRead:
    service = DocumentService(db)
    return service.update(document_id, current_user.id, data)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> None:
    service = DocumentService(db)
    service.delete(document_id, current_user.id)


@router.post("/{document_id}/file", response_model=DocumentRead)
def upload_document_file(
    document_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> DocumentRead:
    service = DocumentService(db)
    return service.attach_file(document_id, current_user.id, file)


@router.delete("/{document_id}/file", response_model=DocumentRead)
def delete_document_file(
    document_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> DocumentRead:
    service = DocumentService(db)
    return service.remove_file(document_id, current_user.id)


@router.get("/{document_id}/file")
def download_document_file(
    document_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> StreamingResponse:
    service = DocumentService(db)
    iterator, content_type, file_name = service.get_file_stream(document_id, current_user.id)
    # Content-Disposition no admite comillas ni saltos de linea crudos en el nombre.
    safe_header_name = file_name.replace('"', "").replace("\n", "").replace("\r", "")
    headers = {"Content-Disposition": f'attachment; filename="{safe_header_name}"'}
    return StreamingResponse(iterator, media_type=content_type, headers=headers)
