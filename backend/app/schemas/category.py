import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CategoryType


class CategoryCreate(BaseModel):
    type: CategoryType
    name: str = Field(min_length=1, max_length=100)
    color: Optional[str] = Field(default=None, max_length=20)
    icon: Optional[str] = Field(default=None, max_length=50)


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: CategoryType
    name: str
    color: Optional[str] = None
    icon: Optional[str] = None
    is_system: bool
