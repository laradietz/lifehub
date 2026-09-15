import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.enums import Priority, TaskStatus
from app.models.user import User
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services.task_service import TaskService

router = APIRouter()


@router.get("", response_model=list[TaskRead])
def list_tasks(
    status_filter: Optional[TaskStatus] = Query(default=None, alias="status"),
    priority: Optional[Priority] = None,
    category_id: Optional[uuid.UUID] = None,
    due_before: Optional[datetime] = None,
    due_after: Optional[datetime] = None,
    household_id: Optional[uuid.UUID] = None,
    assigned_to_me: bool = Query(default=False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[TaskRead]:
    service = TaskService(db)
    return service.list(
        current_user.id,
        status=status_filter,
        priority=priority,
        category_id=category_id,
        due_before=due_before,
        due_after=due_after,
        household_id=household_id,
        assigned_to_me=assigned_to_me,
    )


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    data: TaskCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> TaskRead:
    service = TaskService(db)
    return service.create(current_user.id, data)


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> TaskRead:
    service = TaskService(db)
    return service.get_visible_or_404(task_id, current_user.id)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: uuid.UUID,
    data: TaskUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> TaskRead:
    service = TaskService(db)
    return service.update(task_id, current_user.id, data)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> None:
    service = TaskService(db)
    service.delete(task_id, current_user.id)
