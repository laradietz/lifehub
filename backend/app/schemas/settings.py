from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class UserSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    language: str
    currency: str
    timezone: str
    theme: str
    enabled_modules: list[str]
    dashboard_widgets: list[str]
    notification_preferences: dict[str, Any]
    ai_data_access_enabled: bool


class UserSettingsUpdate(BaseModel):
    language: Optional[str] = Field(default=None, max_length=10)
    currency: Optional[str] = Field(default=None, pattern=r"^[A-Z]{3}$")
    timezone: Optional[str] = Field(default=None, max_length=50)
    theme: Optional[str] = Field(default=None, max_length=10)
    enabled_modules: Optional[list[str]] = None
    dashboard_widgets: Optional[list[str]] = None
    notification_preferences: Optional[dict[str, Any]] = None
    ai_data_access_enabled: Optional[bool] = None
