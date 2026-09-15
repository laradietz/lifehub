import uuid

from sqlalchemy.orm import Session

from app.models.user_settings import UserSettings
from app.schemas.settings import UserSettingsUpdate


class SettingsService:
    def __init__(self, db: Session):
        self.db = db

    def get(self, user_id: uuid.UUID) -> UserSettings:
        settings = self.db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
        if not settings:
            # Defensivo: todo usuario deberia tener settings creados en el registro.
            settings = UserSettings(user_id=user_id)
            self.db.add(settings)
            self.db.commit()
            self.db.refresh(settings)
        return settings

    def update(self, user_id: uuid.UUID, data: UserSettingsUpdate) -> UserSettings:
        settings = self.get(user_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(settings, field, value)
        self.db.commit()
        self.db.refresh(settings)
        return settings
