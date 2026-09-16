import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.repositories.notification_repository import NotificationRepository


class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = NotificationRepository(db)

    def list(self, user_id: uuid.UUID, *, unread_only: bool = False, limit: int = 20) -> list[Notification]:
        return self.repo.list(user_id, unread_only=unread_only, limit=limit)

    def unread_count(self, user_id: uuid.UUID) -> int:
        return self.repo.unread_count(user_id)

    def mark_read(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> Notification:
        notification = self.repo.get_owned(notification_id, user_id)
        if not notification:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Notificación no encontrada.")
        if not notification.is_read:
            notification.is_read = True
            self.db.commit()
            self.db.refresh(notification)
        return notification

    def mark_all_read(self, user_id: uuid.UUID) -> int:
        updated = self.repo.mark_all_read(user_id)
        self.db.commit()
        return updated
