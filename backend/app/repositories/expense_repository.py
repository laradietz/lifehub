import uuid
from datetime import date
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.finance import Expense


class ExpenseRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, expense_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Expense]:
        stmt = select(Expense).where(Expense.id == expense_id, Expense.user_id == user_id)
        return self.db.scalar(stmt)

    def list(
        self, user_id: uuid.UUID, *, date_from: Optional[date] = None, date_to: Optional[date] = None
    ) -> list[Expense]:
        stmt = select(Expense).where(Expense.user_id == user_id)
        if date_from is not None:
            stmt = stmt.where(Expense.date >= date_from)
        if date_to is not None:
            stmt = stmt.where(Expense.date < date_to)
        stmt = stmt.order_by(Expense.date.desc())
        return list(self.db.scalars(stmt))

    def create(self, user_id: uuid.UUID, **fields: Any) -> Expense:
        expense = Expense(user_id=user_id, **fields)
        self.db.add(expense)
        self.db.flush()
        return expense

    def delete(self, expense: Expense) -> None:
        self.db.delete(expense)
