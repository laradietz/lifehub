import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import Priority, TaskStatus
from app.models.task import Task


class TaskRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, task_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Task]:
        stmt = select(Task).where(Task.id == task_id, Task.user_id == user_id)
        return self.db.scalar(stmt)

    def list(
        self,
        user_id: uuid.UUID,
        *,
        status: Optional[TaskStatus] = None,
        priority: Optional[Priority] = None,
        category_id: Optional[uuid.UUID] = None,
        due_before: Optional[datetime] = None,
        due_after: Optional[datetime] = None,
    ) -> list[Task]:
        stmt = select(Task).where(Task.user_id == user_id)
        if status is not None:
            stmt = stmt.where(Task.status == status)
        if priority is not None:
            stmt = stmt.where(Task.priority == priority)
        if category_id is not None:
            stmt = stmt.where(Task.category_id == category_id)
        if due_before is not None:
            stmt = stmt.where(Task.due_date <= due_before)
        if due_after is not None:
            stmt = stmt.where(Task.due_date >= due_after)
        stmt = stmt.order_by(Task.due_date.is_(None), Task.due_date.asc())
        return list(self.db.scalars(stmt))

    def create(self, user_id: uuid.UUID, **fields: Any) -> Task:
        task = Task(user_id=user_id, **fields)
        self.db.add(task)
        self.db.flush()
        return task

    def delete(self, task: Task) -> None:
        self.db.delete(task)
