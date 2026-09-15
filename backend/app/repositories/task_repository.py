import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.models.enums import HouseholdMemberStatus, Priority, TaskStatus
from app.models.household import HouseholdMember
from app.models.task import Task


class TaskRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_owned(self, task_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Task]:
        """Restringido al creador de la tarea -- se usa para borrado."""
        stmt = select(Task).where(Task.id == task_id, Task.user_id == user_id)
        return self.db.scalar(stmt)

    def get_visible(self, task_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Task]:
        """Visible para el creador o cualquier miembro accepted del hogar de la tarea."""
        stmt = (
            select(Task)
            .outerjoin(
                HouseholdMember,
                and_(
                    HouseholdMember.household_id == Task.household_id,
                    HouseholdMember.user_id == user_id,
                    HouseholdMember.status == HouseholdMemberStatus.ACCEPTED,
                ),
            )
            .where(Task.id == task_id, or_(Task.user_id == user_id, HouseholdMember.id.isnot(None)))
        )
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
        household_ids: Optional[list[uuid.UUID]] = None,
        household_id: Optional[uuid.UUID] = None,
        assigned_to_me: bool = False,
    ) -> list[Task]:
        if assigned_to_me:
            stmt = select(Task).where(Task.assigned_to_id == user_id)
        elif household_id is not None:
            stmt = select(Task).where(Task.household_id == household_id)
        else:
            visibility = [Task.user_id == user_id]
            if household_ids:
                visibility.append(Task.household_id.in_(household_ids))
            stmt = select(Task).where(or_(*visibility))

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
