import uuid
from datetime import date as date_type
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PaymentMethod


class IncomeBase(BaseModel):
    amount: Decimal = Field(gt=0, decimal_places=2)
    currency: str = Field(default="USD", max_length=3)
    date: date_type
    description: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    payment_method: PaymentMethod


class IncomeCreate(IncomeBase):
    pass


class IncomeUpdate(BaseModel):
    amount: Optional[Decimal] = Field(default=None, gt=0, decimal_places=2)
    currency: Optional[str] = Field(default=None, max_length=3)
    date: Optional[date_type] = None
    description: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    payment_method: Optional[PaymentMethod] = None


class IncomeRead(IncomeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ExpenseBase(BaseModel):
    amount: Decimal = Field(gt=0, decimal_places=2)
    currency: str = Field(default="USD", max_length=3)
    date: date_type
    description: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    payment_method: PaymentMethod


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    amount: Optional[Decimal] = Field(default=None, gt=0, decimal_places=2)
    currency: Optional[str] = Field(default=None, max_length=3)
    date: Optional[date_type] = None
    description: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    payment_method: Optional[PaymentMethod] = None


class ExpenseRead(ExpenseBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class CategoryBreakdownItem(BaseModel):
    category_id: Optional[uuid.UUID]
    category_name: str
    total: Decimal


class MonthlyPoint(BaseModel):
    month: str
    income: Decimal
    expense: Decimal


class FinanceSummary(BaseModel):
    month: str
    currency: str
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal
    previous_month_expense: Decimal
    expense_change_pct: Optional[float] = None
    top_expense_category: Optional[CategoryBreakdownItem] = None
    expense_by_category: list[CategoryBreakdownItem] = Field(default_factory=list)
    evolution: list[MonthlyPoint] = Field(default_factory=list)
