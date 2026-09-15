import uuid
from datetime import date
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.finance import Expense
from app.repositories.expense_repository import ExpenseRepository
from app.schemas.finance import ExpenseCreate, ExpenseUpdate


class ExpenseService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ExpenseRepository(db)

    def list(self, user_id: uuid.UUID, *, date_from: Optional[date] = None, date_to: Optional[date] = None) -> list[Expense]:
        return self.repo.list(user_id, date_from=date_from, date_to=date_to)

    def get_owned_or_404(self, expense_id: uuid.UUID, user_id: uuid.UUID) -> Expense:
        expense = self.repo.get(expense_id, user_id)
        if not expense:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Gasto no encontrado.")
        return expense

    def create(self, user_id: uuid.UUID, data: ExpenseCreate) -> Expense:
        expense = self.repo.create(user_id, **data.model_dump())
        self.db.commit()
        self.db.refresh(expense)
        return expense

    def update(self, expense_id: uuid.UUID, user_id: uuid.UUID, data: ExpenseUpdate) -> Expense:
        expense = self.get_owned_or_404(expense_id, user_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(expense, field, value)
        self.db.commit()
        self.db.refresh(expense)
        return expense

    def delete(self, expense_id: uuid.UUID, user_id: uuid.UUID) -> None:
        expense = self.get_owned_or_404(expense_id, user_id)
        self.repo.delete(expense)
        self.db.commit()
