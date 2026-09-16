import uuid
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.event import Event
from app.repositories.event_repository import EventRepository
from app.repositories.household_repository import HouseholdRepository
from app.schemas.event import EventCreate, EventUpdate


class EventService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = EventRepository(db)
        self.household_repo = HouseholdRepository(db)

    def list(
        self,
        user_id: uuid.UUID,
        *,
        start_after: Optional[datetime] = None,
        start_before: Optional[datetime] = None,
        category_id: Optional[uuid.UUID] = None,
        household_id: Optional[uuid.UUID] = None,
    ) -> list[Event]:
        household_ids = None
        if household_id is not None:
            self._require_membership(household_id, user_id)
        else:
            household_ids = self.household_repo.list_accepted_household_ids(user_id)

        return self.repo.list(
            user_id,
            start_after=start_after,
            start_before=start_before,
            category_id=category_id,
            household_ids=household_ids,
            household_id=household_id,
        )

    def get_visible_or_404(self, event_id: uuid.UUID, user_id: uuid.UUID) -> Event:
        event = self.repo.get_visible(event_id, user_id)
        if not event:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Evento no encontrado.")
        return event

    def get_owned_or_404(self, event_id: uuid.UUID, user_id: uuid.UUID) -> Event:
        """Restringido al creador -- se usa solo para borrado."""
        event = self.repo.get_owned(event_id, user_id)
        if not event:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Evento no encontrado.")
        return event

    def _require_membership(self, household_id: uuid.UUID, user_id: uuid.UUID) -> None:
        if not self.household_repo.is_accepted_member(household_id, user_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Hogar no encontrado.")

    def create(self, user_id: uuid.UUID, data: EventCreate) -> Event:
        if data.household_id is not None:
            self._require_membership(data.household_id, user_id)
        event = self.repo.create(user_id, **data.model_dump())
        self.db.commit()
        self.db.refresh(event)
        return event

    def update(self, event_id: uuid.UUID, user_id: uuid.UUID, data: EventUpdate) -> Event:
        event = self.get_visible_or_404(event_id, user_id)
        updates = data.model_dump(exclude_unset=True)

        effective_household_id = updates["household_id"] if "household_id" in updates else event.household_id
        if effective_household_id is not None:
            self._require_membership(effective_household_id, user_id)

        for field, value in updates.items():
            setattr(event, field, value)

        self.db.commit()
        self.db.refresh(event)
        return event

    def delete(self, event_id: uuid.UUID, user_id: uuid.UUID) -> None:
        event = self.get_owned_or_404(event_id, user_id)
        self.repo.delete(event)
        self.db.commit()
