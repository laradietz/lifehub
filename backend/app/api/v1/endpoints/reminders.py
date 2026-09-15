import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.reminder import ReminderCreate, ReminderRead, ReminderUpdate
from app.services.reminder_service import ReminderService

router = APIRouter()


@router.get("", response_model=list[ReminderRead])
def list_reminders(
    include_completed: bool = Query(default=False),
    category_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[ReminderRead]:
    service = ReminderService(db)
    return service.list(current_user.id, include_completed=include_completed, category_id=category_id)


@router.post("", response_model=ReminderRead, status_code=status.HTTP_201_CREATED)
def create_reminder(
    data: ReminderCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> ReminderRead:
    service = ReminderService(db)
    return service.create(current_user.id, data)


@router.get("/{reminder_id}", response_model=ReminderRead)
def get_reminder(
    reminder_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> ReminderRead:
    service = ReminderService(db)
    return service.get_owned_or_404(reminder_id, current_user.id)


@router.patch("/{reminder_id}", response_model=ReminderRead)
def update_reminder(
    reminder_id: uuid.UUID,
    data: ReminderUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ReminderRead:
    service = ReminderService(db)
    return service.update(reminder_id, current_user.id, data)


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(
    reminder_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> None:
    service = ReminderService(db)
    service.delete(reminder_id, current_user.id)
