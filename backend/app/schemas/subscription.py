import uuid
from datetime import date as date_type
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PaymentMethod, SubscriptionFrequency


class SubscriptionBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    price: Decimal = Field(gt=0, decimal_places=2)
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    frequency: SubscriptionFrequency
    next_billing_date: date_type
    category_id: Optional[uuid.UUID] = None
    payment_method: PaymentMethod


class SubscriptionCreate(SubscriptionBase):
    pass


class SubscriptionUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    price: Optional[Decimal] = Field(default=None, gt=0, decimal_places=2)
    currency: Optional[str] = Field(default=None, pattern=r"^[A-Z]{3}$")
    frequency: Optional[SubscriptionFrequency] = None
    next_billing_date: Optional[date_type] = None
    category_id: Optional[uuid.UUID] = None
    payment_method: Optional[PaymentMethod] = None
    is_active: Optional[bool] = None


class SubscriptionRead(SubscriptionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime


class SubscriptionSummary(BaseModel):
    currency: str
    monthly_total: Decimal
    annual_total: Decimal
    next_billing: Optional[SubscriptionRead] = None
