import uuid
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.reminder import Reminder


class ReminderRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, reminder_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Reminder]:
        stmt = select(Reminder).where(Reminder.id == reminder_id, Reminder.user_id == user_id)
        return self.db.scalar(stmt)

    def list(
        self,
        user_id: uuid.UUID,
        *,
        include_completed: bool = False,
        category_id: Optional[uuid.UUID] = None,
    ) -> list[Reminder]:
        stmt = select(Reminder).where(Reminder.user_id == user_id)
        if not include_completed:
            stmt = stmt.where(Reminder.is_completed.is_(False))
        if category_id is not None:
            stmt = stmt.where(Reminder.category_id == category_id)
        stmt = stmt.order_by(Reminder.due_date.asc())
        return list(self.db.scalars(stmt))

    def create(self, user_id: uuid.UUID, **fields: Any) -> Reminder:
        reminder = Reminder(user_id=user_id, **fields)
        self.db.add(reminder)
        self.db.flush()
        return reminder

    def delete(self, reminder: Reminder) -> None:
        self.db.delete(reminder)
