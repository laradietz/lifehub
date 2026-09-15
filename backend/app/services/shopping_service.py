import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.shopping import ShoppingList
from app.repositories.household_repository import HouseholdRepository
from app.repositories.shopping_repository import ShoppingHistoryRepository, ShoppingItemRepository, ShoppingListRepository
from app.schemas.shopping import (
    ShoppingItemCreate,
    ShoppingItemUpdate,
    ShoppingListCreate,
    ShoppingListUpdate,
    ShoppingSuggestion,
)

# Se sugiere recomprar un poco antes de cumplirse el intervalo promedio exacto,
# no justo el dia que "vencería" segun el historial.
_SUGGESTION_THRESHOLD = 0.8
_MAX_SUGGESTIONS = 20


class ShoppingService:
    def __init__(self, db: Session):
        self.db = db
        self.list_repo = ShoppingListRepository(db)
        self.item_repo = ShoppingItemRepository(db)
        self.history_repo = ShoppingHistoryRepository(db)
        self.household_repo = HouseholdRepository(db)

    def list_lists(self, user_id: uuid.UUID) -> list[ShoppingList]:
        household_ids = self.household_repo.list_accepted_household_ids(user_id)
        return self.list_repo.list_visible(user_id, household_ids)

    def get_visible_or_404(self, shopping_list_id: uuid.UUID, user_id: uuid.UUID) -> ShoppingList:
        shopping_list = self.list_repo.get(shopping_list_id)
        if not shopping_list or not self._is_visible(shopping_list, user_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Lista no encontrada.")
        return shopping_list

    def _is_visible(self, shopping_list: ShoppingList, user_id: uuid.UUID) -> bool:
        if shopping_list.user_id == user_id:
            return True
        if shopping_list.household_id:
            return self.household_repo.is_accepted_member(shopping_list.household_id, user_id)
        return False

    def _require_household_membership(self, household_id: uuid.UUID, user_id: uuid.UUID) -> None:
        if not self.household_repo.is_accepted_member(household_id, user_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Hogar no encontrado.")

    def create_list(self, user_id: uuid.UUID, data: ShoppingListCreate) -> ShoppingList:
        if data.household_id:
            self._require_household_membership(data.household_id, user_id)
        shopping_list = self.list_repo.create(user_id, **data.model_dump())
        self.db.commit()
        self.db.refresh(shopping_list)
        return shopping_list

    def update_list(self, shopping_list_id: uuid.UUID, user_id: uuid.UUID, data: ShoppingListUpdate) -> ShoppingList:
        shopping_list = self.get_visible_or_404(shopping_list_id, user_id)
        if shopping_list.user_id != user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo quien creó la lista puede editarla.")

        updates = data.model_dump(exclude_unset=True)
        if updates.get("household_id"):
            self._require_household_membership(updates["household_id"], user_id)
        for field, value in updates.items():
            setattr(shopping_list, field, value)

        self.db.commit()
        self.db.refresh(shopping_list)
        return shopping_list

    def delete_list(self, shopping_list_id: uuid.UUID, user_id: uuid.UUID) -> None:
        shopping_list = self.get_visible_or_404(shopping_list_id, user_id)
        if shopping_list.user_id != user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo quien creó la lista puede eliminarla.")
        self.list_repo.delete(shopping_list)
        self.db.commit()

    def add_item(self, shopping_list_id: uuid.UUID, user_id: uuid.UUID, data: ShoppingItemCreate):
        self.get_visible_or_404(shopping_list_id, user_id)
        item = self.item_repo.create(shopping_list_id, **data.model_dump())
        self.db.commit()
        self.db.refresh(item)
        return item

    def update_item(
        self, shopping_list_id: uuid.UUID, item_id: uuid.UUID, user_id: uuid.UUID, data: ShoppingItemUpdate
    ):
        self.get_visible_or_404(shopping_list_id, user_id)
        item = self.item_repo.get(item_id)
        if not item or item.shopping_list_id != shopping_list_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Ítem no encontrado.")

        updates = data.model_dump(exclude_unset=True)
        was_purchased = item.is_purchased
        for field, value in updates.items():
            setattr(item, field, value)

        if item.is_purchased and not was_purchased:
            now = datetime.now(timezone.utc)
            item.purchased_at = now
            self.history_repo.create(user_id, item.name, now)
        elif not item.is_purchased and was_purchased:
            item.purchased_at = None

        self.db.commit()
        self.db.refresh(item)
        return item

    def delete_item(self, shopping_list_id: uuid.UUID, item_id: uuid.UUID, user_id: uuid.UUID) -> None:
        self.get_visible_or_404(shopping_list_id, user_id)
        item = self.item_repo.get(item_id)
        if not item or item.shopping_list_id != shopping_list_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Ítem no encontrado.")
        self.item_repo.delete(item)
        self.db.commit()

    def get_suggestions(self, user_id: uuid.UUID) -> list[ShoppingSuggestion]:
        history = self.history_repo.list_for_user(user_id)

        groups: dict[str, list[tuple[datetime, str]]] = {}
        for entry in history:
            key = entry.item_name.strip().lower()
            groups.setdefault(key, []).append((entry.purchased_at, entry.item_name))

        already_pending = self.item_repo.list_unpurchased_names_for_user(user_id)
        now = datetime.now(timezone.utc)

        candidates: list[tuple[int, ShoppingSuggestion]] = []
        for key, entries in groups.items():
            if len(entries) < 2 or key in already_pending:
                continue

            dates = [purchased_at for purchased_at, _ in entries]
            intervals_days = [(dates[i] - dates[i - 1]).days for i in range(1, len(dates))]
            avg_interval_days = round(sum(intervals_days) / len(intervals_days))
            if avg_interval_days <= 0:
                continue

            last_purchased_at = dates[-1]
            days_since_last = (now - last_purchased_at).days
            suggested = days_since_last >= avg_interval_days * _SUGGESTION_THRESHOLD

            candidates.append(
                (
                    days_since_last - avg_interval_days,
                    ShoppingSuggestion(
                        item_name=entries[-1][1],
                        last_purchased_at=last_purchased_at,
                        avg_interval_days=avg_interval_days,
                        suggested=suggested,
                    ),
                )
            )

        candidates.sort(key=lambda pair: pair[0], reverse=True)
        return [suggestion for _, suggestion in candidates[:_MAX_SUGGESTIONS]]
