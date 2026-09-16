import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.event import EventCreate, EventRead, EventUpdate
from app.services.event_service import EventService

router = APIRouter()


@router.get("", response_model=list[EventRead])
def list_events(
    start_after: Optional[datetime] = None,
    start_before: Optional[datetime] = None,
    category_id: Optional[uuid.UUID] = None,
    household_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[EventRead]:
    service = EventService(db)
    return service.list(
        current_user.id,
        start_after=start_after,
        start_before=start_before,
        category_id=category_id,
        household_id=household_id,
    )


@router.post("", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(
    data: EventCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> EventRead:
    service = EventService(db)
    return service.create(current_user.id, data)


@router.get("/{event_id}", response_model=EventRead)
def get_event(
    event_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> EventRead:
    service = EventService(db)
    return service.get_visible_or_404(event_id, current_user.id)


@router.patch("/{event_id}", response_model=EventRead)
def update_event(
    event_id: uuid.UUID,
    data: EventUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> EventRead:
    service = EventService(db)
    return service.update(event_id, current_user.id, data)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> None:
    service = EventService(db)
    service.delete(event_id, current_user.id)
