import uuid
from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.enums import CategoryType
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryRead
from app.services.category_service import CategoryService

router = APIRouter()


@router.get("", response_model=list[CategoryRead])
def list_categories(
    type: Optional[CategoryType] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[CategoryRead]:
    service = CategoryService(db)
    return service.list(current_user.id, type)


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> CategoryRead:
    service = CategoryService(db)
    return service.create(current_user.id, data)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> None:
    service = CategoryService(db)
    service.delete(category_id, current_user.id)
