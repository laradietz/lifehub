import uuid
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.enums import Priority, TaskStatus
from app.models.task import Task
from app.repositories.household_repository import HouseholdRepository
from app.repositories.task_repository import TaskRepository
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.recurrence import advance_due_date, advances_automatically


class TaskService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = TaskRepository(db)
        self.household_repo = HouseholdRepository(db)

    def list(
        self,
        user_id: uuid.UUID,
        *,
        status: Optional[TaskStatus] = None,
        priority: Optional[Priority] = None,
        category_id: Optional[uuid.UUID] = None,
        due_before: Optional[datetime] = None,
        due_after: Optional[datetime] = None,
        household_id: Optional[uuid.UUID] = None,
        assigned_to_me: bool = False,
    ) -> list[Task]:
        household_ids = None
        if household_id is not None:
            self._require_membership(household_id, user_id)
        elif not assigned_to_me:
            household_ids = self.household_repo.list_accepted_household_ids(user_id)

        return self.repo.list(
            user_id,
            status=status,
            priority=priority,
            category_id=category_id,
            due_before=due_before,
            due_after=due_after,
            household_ids=household_ids,
            household_id=household_id,
            assigned_to_me=assigned_to_me,
        )

    def get_visible_or_404(self, task_id: uuid.UUID, user_id: uuid.UUID) -> Task:
        task = self.repo.get_visible(task_id, user_id)
        if not task:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Tarea no encontrada.")
        return task

    def get_owned_or_404(self, task_id: uuid.UUID, user_id: uuid.UUID) -> Task:
        """Restringido al creador -- se usa solo para borrado."""
        task = self.repo.get_owned(task_id, user_id)
        if not task:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Tarea no encontrada.")
        return task

    def _require_membership(self, household_id: uuid.UUID, user_id: uuid.UUID) -> None:
        if not self.household_repo.is_accepted_member(household_id, user_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Hogar no encontrado.")

    def _validate_assignment(
        self, user_id: uuid.UUID, household_id: Optional[uuid.UUID], assigned_to_id: Optional[uuid.UUID]
    ) -> None:
        if household_id is not None:
            self._require_membership(household_id, user_id)
        if assigned_to_id is not None:
            if household_id is None:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST, "No se puede asignar una tarea sin un hogar asociado."
                )
            if not self.household_repo.is_accepted_member(household_id, assigned_to_id):
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "El usuario asignado no pertenece a este hogar.")

    def create(self, user_id: uuid.UUID, data: TaskCreate) -> Task:
        self._validate_assignment(user_id, data.household_id, data.assigned_to_id)
        task = self.repo.create(user_id, **data.model_dump())
        self.db.commit()
        self.db.refresh(task)
        return task

    def update(self, task_id: uuid.UUID, user_id: uuid.UUID, data: TaskUpdate) -> Task:
        task = self.get_visible_or_404(task_id, user_id)
        updates = data.model_dump(exclude_unset=True)

        household_id_set = "household_id" in updates
        effective_household_id = updates["household_id"] if household_id_set else task.household_id
        if household_id_set and effective_household_id is None:
            updates["assigned_to_id"] = None

        effective_assigned_to_id = updates["assigned_to_id"] if "assigned_to_id" in updates else task.assigned_to_id
        self._validate_assignment(user_id, effective_household_id, effective_assigned_to_id)

        is_being_completed = updates.get("status") == TaskStatus.COMPLETED and task.status != TaskStatus.COMPLETED

        for field, value in updates.items():
            setattr(task, field, value)

        if is_being_completed and task.due_date and advances_automatically(task.recurrence):
            next_due = advance_due_date(task.due_date, task.recurrence)
            if next_due:
                self.repo.create(
                    task.user_id,
                    title=task.title,
                    description=task.description,
                    due_date=next_due,
                    priority=task.priority,
                    category_id=task.category_id,
                    household_id=task.household_id,
                    assigned_to_id=task.assigned_to_id,
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
