import uuid
from datetime import date
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.finance import Income
from app.repositories.income_repository import IncomeRepository
from app.schemas.finance import IncomeCreate, IncomeUpdate


class IncomeService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = IncomeRepository(db)

    def list(self, user_id: uuid.UUID, *, date_from: Optional[date] = None, date_to: Optional[date] = None) -> list[Income]:
        return self.repo.list(user_id, date_from=date_from, date_to=date_to)

    def get_owned_or_404(self, income_id: uuid.UUID, user_id: uuid.UUID) -> Income:
        income = self.repo.get(income_id, user_id)
        if not income:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Ingreso no encontrado.")
        return income

    def create(self, user_id: uuid.UUID, data: IncomeCreate) -> Income:
        income = self.repo.create(user_id, **data.model_dump())
        self.db.commit()
        self.db.refresh(income)
        return income

    def update(self, income_id: uuid.UUID, user_id: uuid.UUID, data: IncomeUpdate) -> Income:
        income = self.get_owned_or_404(income_id, user_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(income, field, value)
        self.db.commit()
        self.db.refresh(income)
        return income

    def delete(self, income_id: uuid.UUID, user_id: uuid.UUID) -> None:
        income = self.get_owned_or_404(income_id, user_id)
        self.repo.delete(income)
        self.db.commit()
