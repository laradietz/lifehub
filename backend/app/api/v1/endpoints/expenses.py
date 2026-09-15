import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.finance import ExpenseCreate, ExpenseRead, ExpenseUpdate
from app.services.expense_service import ExpenseService

router = APIRouter()


@router.get("", response_model=list[ExpenseRead])
def list_expenses(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[ExpenseRead]:
    service = ExpenseService(db)
    return service.list(current_user.id, date_from=date_from, date_to=date_to)


@router.post("", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
def create_expense(
    data: ExpenseCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> ExpenseRead:
    service = ExpenseService(db)
    return service.create(current_user.id, data)


@router.get("/{expense_id}", response_model=ExpenseRead)
def get_expense(
    expense_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> ExpenseRead:
    service = ExpenseService(db)
    return service.get_owned_or_404(expense_id, current_user.id)


@router.patch("/{expense_id}", response_model=ExpenseRead)
def update_expense(
    expense_id: uuid.UUID,
    data: ExpenseUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ExpenseRead:
    service = ExpenseService(db)
    return service.update(expense_id, current_user.id, data)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> None:
    service = ExpenseService(db)
    service.delete(expense_id, current_user.id)
