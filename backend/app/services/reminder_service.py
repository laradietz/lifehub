import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.reminder import Reminder
from app.repositories.reminder_repository import ReminderRepository
from app.schemas.reminder import ReminderCreate, ReminderUpdate
from app.services.recurrence import advance_due_date, advances_automatically


class ReminderService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ReminderRepository(db)

    def list(
        self, user_id: uuid.UUID, *, include_completed: bool = False, category_id: Optional[uuid.UUID] = None
    ) -> list[Reminder]:
        return self.repo.list(user_id, include_completed=include_completed, category_id=category_id)

    def get_owned_or_404(self, reminder_id: uuid.UUID, user_id: uuid.UUID) -> Reminder:
        reminder = self.repo.get(reminder_id, user_id)
        if not reminder:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Recordatorio no encontrado.")
        return reminder

    def create(self, user_id: uuid.UUID, data: ReminderCreate) -> Reminder:
        reminder = self.repo.create(user_id, **data.model_dump())
        self.db.commit()
        self.db.refresh(reminder)
        return reminder

    def update(self, reminder_id: uuid.UUID, user_id: uuid.UUID, data: ReminderUpdate) -> Reminder:
        reminder = self.get_owned_or_404(reminder_id, user_id)
        updates = data.model_dump(exclude_unset=True)
        is_being_completed = updates.get("is_completed") is True and not reminder.is_completed

        for field, value in updates.items():
            setattr(reminder, field, value)

        if is_being_completed and advances_automatically(reminder.recurrence):
            next_due = advance_due_date(reminder.due_date, reminder.recurrence)
            if next_due:
                self.repo.create(
                    user_id,
                    name=reminder.name,
                    description=reminder.description,
                    due_date=next_due,
                    priority=reminder.priority,
                    category_id=reminder.category_id,
                    recurrence=reminder.recurrence,
                    advance_notice_days=list(reminder.advance_notice_days or []),
                    is_completed=False,
                )

        self.db.commit()
        self.db.refresh(reminder)
        return reminder

    def delete(self, reminder_id: uuid.UUID, user_id: uuid.UUID) -> None:
        reminder = self.get_owned_or_404(reminder_id, user_id)
        self.repo.delete(reminder)
        self.db.commit()
