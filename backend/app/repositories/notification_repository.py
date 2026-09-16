import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.enums import NotificationChannel
from app.models.notification import Notification


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_owned(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Notification]:
        stmt = select(Notification).where(Notification.id == notification_id, Notification.user_id == user_id)
        return self.db.scalar(stmt)

    def list(self, user_id: uuid.UUID, *, unread_only: bool = False, limit: int = 20) -> list[Notification]:
        stmt = select(Notification).where(
            Notification.user_id == user_id, Notification.channel == NotificationChannel.IN_APP
        )
        if unread_only:
            stmt = stmt.where(Notification.is_read.is_(False))
        stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
        return list(self.db.scalars(stmt))

    def unread_count(self, user_id: uuid.UUID) -> int:
        return (
            self.db.scalar(
                select(func.count()).select_from(Notification).where(
                    Notification.user_id == user_id,
                    Notification.channel == NotificationChannel.IN_APP,
                    Notification.is_read.is_(False),
                )
            )
            or 0
        )

    def mark_all_read(self, user_id: uuid.UUID) -> int:
        result = self.db.execute(
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.channel == NotificationChannel.IN_APP,
                Notification.is_read.is_(False),
            )
            .values(is_read=True)
        )
        return result.rowcount or 0

    def exists_for_entity_today(
        self, user_id: uuid.UUID, related_entity_type: str, related_entity_id: uuid.UUID
    ) -> bool:
        """Evita re-notificar el mismo vencimiento cada vez que corre el scheduler en el dia."""
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        stmt = (
            select(Notification.id)
            .where(
                Notification.user_id == user_id,
                Notification.related_entity_type == related_entity_type,
                Notification.related_entity_id == related_entity_id,
                Notification.created_at >= today_start,
            )
            .limit(1)
        )
        return self.db.scalar(stmt) is not None

    def create(self, user_id: uuid.UUID, **fields: Any) -> Notification:
        notification = Notification(user_id=user_id, **fields)
        self.db.add(notification)
        self.db.flush()
        return notification
