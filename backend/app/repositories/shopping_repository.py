import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.shopping import ShoppingHistory, ShoppingItem, ShoppingList


class ShoppingListRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, shopping_list_id: uuid.UUID) -> Optional[ShoppingList]:
        stmt = (
            select(ShoppingList)
            .where(ShoppingList.id == shopping_list_id)
            .options(selectinload(ShoppingList.items))
        )
        return self.db.scalar(stmt)

    def list_visible(self, user_id: uuid.UUID, household_ids: list[uuid.UUID]) -> list[ShoppingList]:
        conditions = [ShoppingList.user_id == user_id]
        if household_ids:
            conditions.append(ShoppingList.household_id.in_(household_ids))
        stmt = (
            select(ShoppingList)
            .where(or_(*conditions))
            .options(selectinload(ShoppingList.items))
            .order_by(ShoppingList.name.asc())
        )
        return list(self.db.scalars(stmt))

    def create(self, user_id: uuid.UUID, **fields: Any) -> ShoppingList:
        shopping_list = ShoppingList(user_id=user_id, **fields)
        self.db.add(shopping_list)
        self.db.flush()
        return shopping_list

    def delete(self, shopping_list: ShoppingList) -> None:
        self.db.delete(shopping_list)


class ShoppingItemRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, item_id: uuid.UUID) -> Optional[ShoppingItem]:
        return self.db.get(ShoppingItem, item_id)

    def list_unpurchased_names_for_user(self, user_id: uuid.UUID) -> set[str]:
        stmt = (
            select(ShoppingItem.name)
            .join(ShoppingList, ShoppingList.id == ShoppingItem.shopping_list_id)
            .where(ShoppingList.user_id == user_id, ShoppingItem.is_purchased.is_(False))
        )
        return {name.strip().lower() for name in self.db.scalars(stmt)}

    def create(self, shopping_list_id: uuid.UUID, **fields: Any) -> ShoppingItem:
        item = ShoppingItem(shopping_list_id=shopping_list_id, **fields)
        self.db.add(item)
        self.db.flush()
        return item

    def delete(self, item: ShoppingItem) -> None:
        self.db.delete(item)


class ShoppingHistoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_user(self, user_id: uuid.UUID) -> list[ShoppingHistory]:
        # Orden puramente cronologico (no por item_name) para que agrupar por
        # nombre normalizado en Python preserve el orden de compra real,
        # incluso si el mismo producto se guardo alguna vez con otra mayuscula.
        stmt = (
            select(ShoppingHistory)
            .where(ShoppingHistory.user_id == user_id)
            .order_by(ShoppingHistory.purchased_at.asc())
        )
        return list(self.db.scalars(stmt))

    def create(self, user_id: uuid.UUID, item_name: str, purchased_at: datetime) -> ShoppingHistory:
        history = ShoppingHistory(user_id=user_id, item_name=item_name, purchased_at=purchased_at)
        self.db.add(history)
        self.db.flush()
        return history
