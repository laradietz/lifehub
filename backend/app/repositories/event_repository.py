import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.enums import HouseholdMemberStatus
from app.models.household import HouseholdMember


class EventRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_owned(self, event_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Event]:
        """Restringido al creador del evento -- se usa para borrado."""
        stmt = select(Event).where(Event.id == event_id, Event.user_id == user_id)
        return self.db.scalar(stmt)

    def get_visible(self, event_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Event]:
        """Visible para el creador o cualquier miembro accepted del hogar del evento."""
        stmt = (
            select(Event)
            .outerjoin(
                HouseholdMember,
                and_(
                    HouseholdMember.household_id == Event.household_id,
                    HouseholdMember.user_id == user_id,
                    HouseholdMember.status == HouseholdMemberStatus.ACCEPTED,
                ),
            )
            .where(Event.id == event_id, or_(Event.user_id == user_id, HouseholdMember.id.isnot(None)))
        )
        return self.db.scalar(stmt)

    def list(
        self,
        user_id: uuid.UUID,
        *,
        start_after: Optional[datetime] = None,
        start_before: Optional[datetime] = None,
        category_id: Optional[uuid.UUID] = None,
        household_ids: Optional[list[uuid.UUID]] = None,
        household_id: Optional[uuid.UUID] = None,
    ) -> list[Event]:
        if household_id is not None:
            stmt = select(Event).where(Event.household_id == household_id)
        else:
            visibility = [Event.user_id == user_id]
            if household_ids:
                visibility.append(Event.household_id.in_(household_ids))
            stmt = select(Event).where(or_(*visibility))

        if category_id is not None:
            stmt = stmt.where(Event.category_id == category_id)
        if start_after is not None:
            stmt = stmt.where(Event.start_at >= start_after)
        if start_before is not None:
            stmt = stmt.where(Event.start_at <= start_before)
        stmt = stmt.order_by(Event.start_at.asc()).limit(1000)
        return list(self.db.scalars(stmt))

    def create(self, user_id: uuid.UUID, **fields: Any) -> Event:
        event = Event(user_id=user_id, **fields)
        self.db.add(event)
        self.db.flush()
        return event

    def delete(self, event: Event) -> None:
        self.db.delete(event)
