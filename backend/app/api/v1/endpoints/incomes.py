import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.finance import IncomeCreate, IncomeRead, IncomeUpdate
from app.services.income_service import IncomeService

router = APIRouter()


@router.get("", response_model=list[IncomeRead])
def list_incomes(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[IncomeRead]:
    service = IncomeService(db)
    return service.list(current_user.id, date_from=date_from, date_to=date_to)


@router.post("", response_model=IncomeRead, status_code=status.HTTP_201_CREATED)
def create_income(
    data: IncomeCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> IncomeRead:
    service = IncomeService(db)
    return service.create(current_user.id, data)


@router.get("/{income_id}", response_model=IncomeRead)
def get_income(
    income_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> IncomeRead:
    service = IncomeService(db)
    return service.get_owned_or_404(income_id, current_user.id)


@router.patch("/{income_id}", response_model=IncomeRead)
def update_income(
    income_id: uuid.UUID,
    data: IncomeUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> IncomeRead:
    service = IncomeService(db)
    return service.update(income_id, current_user.id, data)


@router.delete("/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income(
    income_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> None:
    service = IncomeService(db)
    service.delete(income_id, current_user.id)
