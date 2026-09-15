import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.shopping import (
    ShoppingItemCreate,
    ShoppingItemRead,
    ShoppingItemUpdate,
    ShoppingListCreate,
    ShoppingListRead,
    ShoppingListUpdate,
    ShoppingSuggestion,
)
from app.services.shopping_service import ShoppingService

router = APIRouter()


@router.get("/lists", response_model=list[ShoppingListRead])
def list_shopping_lists(
    current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> list[ShoppingListRead]:
    service = ShoppingService(db)
    return service.list_lists(current_user.id)


@router.post("/lists", response_model=ShoppingListRead, status_code=status.HTTP_201_CREATED)
def create_shopping_list(
    data: ShoppingListCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> ShoppingListRead:
    service = ShoppingService(db)
    return service.create_list(current_user.id, data)


@router.get("/suggestions", response_model=list[ShoppingSuggestion])
def get_shopping_suggestions(
    current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> list[ShoppingSuggestion]:
    service = ShoppingService(db)
    return service.get_suggestions(current_user.id)


@router.get("/lists/{shopping_list_id}", response_model=ShoppingListRead)
def get_shopping_list(
    shopping_list_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ShoppingListRead:
    service = ShoppingService(db)
    return service.get_visible_or_404(shopping_list_id, current_user.id)


@router.patch("/lists/{shopping_list_id}", response_model=ShoppingListRead)
def update_shopping_list(
    shopping_list_id: uuid.UUID,
    data: ShoppingListUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ShoppingListRead:
    service = ShoppingService(db)
    return service.update_list(shopping_list_id, current_user.id, data)


@router.delete("/lists/{shopping_list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shopping_list(
    shopping_list_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> None:
    service = ShoppingService(db)
    service.delete_list(shopping_list_id, current_user.id)


@router.post("/lists/{shopping_list_id}/items", response_model=ShoppingItemRead, status_code=status.HTTP_201_CREATED)
def add_shopping_item(
    shopping_list_id: uuid.UUID,
    data: ShoppingItemCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ShoppingItemRead:
    service = ShoppingService(db)
    return service.add_item(shopping_list_id, current_user.id, data)


@router.patch("/lists/{shopping_list_id}/items/{item_id}", response_model=ShoppingItemRead)
def update_shopping_item(
    shopping_list_id: uuid.UUID,
    item_id: uuid.UUID,
    data: ShoppingItemUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ShoppingItemRead:
    service = ShoppingService(db)
    return service.update_item(shopping_list_id, item_id, current_user.id, data)


@router.delete("/lists/{shopping_list_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shopping_item(
    shopping_list_id: uuid.UUID,
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> None:
    service = ShoppingService(db)
    service.delete_item(shopping_list_id, item_id, current_user.id)
