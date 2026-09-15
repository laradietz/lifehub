import uuid
from datetime import date
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.finance import Income


class IncomeRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, income_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Income]:
        stmt = select(Income).where(Income.id == income_id, Income.user_id == user_id)
        return self.db.scalar(stmt)

    def list(
        self, user_id: uuid.UUID, *, date_from: Optional[date] = None, date_to: Optional[date] = None
    ) -> list[Income]:
        stmt = select(Income).where(Income.user_id == user_id)
        if date_from is not None:
            stmt = stmt.where(Income.date >= date_from)
        if date_to is not None:
            stmt = stmt.where(Income.date < date_to)
        stmt = stmt.order_by(Income.date.desc())
        return list(self.db.scalars(stmt))

    def create(self, user_id: uuid.UUID, **fields: Any) -> Income:
        income = Income(user_id=user_id, **fields)
        self.db.add(income)
        self.db.flush()
        return income

    def delete(self, income: Income) -> None:
        self.db.delete(income)
