import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ShoppingItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    quantity: float = Field(default=1, gt=0)
    unit: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = None
    category_id: Optional[uuid.UUID] = None


class ShoppingItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    quantity: Optional[float] = Field(default=None, gt=0)
    unit: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    is_purchased: Optional[bool] = None


class ShoppingItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    shopping_list_id: uuid.UUID
    category_id: Optional[uuid.UUID] = None
    name: str
    quantity: float
    unit: Optional[str] = None
    notes: Optional[str] = None
    is_purchased: bool
    purchased_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ShoppingListCreate(BaseModel):
    name: str = Field(default="Lista principal", min_length=1, max_length=255)
    household_id: Optional[uuid.UUID] = None


class ShoppingListUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    household_id: Optional[uuid.UUID] = None


class ShoppingListRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    household_id: Optional[uuid.UUID] = None
    name: str
    created_at: datetime
    updated_at: datetime
    items: list[ShoppingItemRead] = Field(default_factory=list)


class ShoppingSuggestion(BaseModel):
    item_name: str
    last_purchased_at: datetime
    avg_interval_days: int
    suggested: bool
