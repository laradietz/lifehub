import uuid
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.enums import Priority, TaskStatus
from app.models.task import Task
from app.repositories.task_repository import TaskRepository
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.recurrence import advance_due_date, advances_automatically


class TaskService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = TaskRepository(db)

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
        return self.repo.list(
            user_id, status=status, priority=priority, category_id=category_id, due_before=due_before, due_after=due_after
        )

    def get_owned_or_404(self, task_id: uuid.UUID, user_id: uuid.UUID) -> Task:
        task = self.repo.get(task_id, user_id)
        if not task:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Tarea no encontrada.")
        return task

    def create(self, user_id: uuid.UUID, data: TaskCreate) -> Task:
        task = self.repo.create(user_id, **data.model_dump())
        self.db.commit()
        self.db.refresh(task)
        return task

    def update(self, task_id: uuid.UUID, user_id: uuid.UUID, data: TaskUpdate) -> Task:
        task = self.get_owned_or_404(task_id, user_id)
        updates = data.model_dump(exclude_unset=True)
        is_being_completed = updates.get("status") == TaskStatus.COMPLETED and task.status != TaskStatus.COMPLETED

        for field, value in updates.items():
            setattr(task, field, value)

        if is_being_completed and task.due_date and advances_automatically(task.recurrence):
            next_due = advance_due_date(task.due_date, task.recurrence)
            if next_due:
                self.repo.create(
                    user_id,
                    title=task.title,
                    description=task.description,
                    due_date=next_due,
                    priority=task.priority,
                    category_id=task.category_id,
                    household_id=task.household_id,
                    recurrence=task.recurrence,
                    recurrence_rule=task.recurrence_rule,
                    tags=list(task.tags or []),
                )

        self.db.commit()
        self.db.refresh(task)
        return task

    def delete(self, task_id: uuid.UUID, user_id: uuid.UUID) -> None:
        task = self.get_owned_or_404(task_id, user_id)
        self.repo.delete(task)
        self.db.commit()
