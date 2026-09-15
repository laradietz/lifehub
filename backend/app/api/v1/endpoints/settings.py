from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.settings import UserSettingsRead, UserSettingsUpdate
from app.services.settings_service import SettingsService

router = APIRouter()


@router.get("", response_model=UserSettingsRead)
def get_settings(
    current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> UserSettingsRead:
    service = SettingsService(db)
    return service.get(current_user.id)


@router.patch("", response_model=UserSettingsRead)
def update_settings(
    data: UserSettingsUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> UserSettingsRead:
    service = SettingsService(db)
    return service.update(current_user.id, data)
