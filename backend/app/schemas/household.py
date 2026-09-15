import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import HouseholdMemberStatus, HouseholdRole


class HouseholdCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class HouseholdUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)


class HouseholdMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    email: str
    full_name: Optional[str] = None
    role: HouseholdRole
    status: HouseholdMemberStatus
    created_at: datetime


class HouseholdRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    members: list[HouseholdMemberRead] = Field(default_factory=list)


class HouseholdInviteCreate(BaseModel):
    email: EmailStr


class PendingInvitationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    household_name: str
    role: HouseholdRole
    created_at: datetime
