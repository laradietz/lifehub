import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.notification import NotificationMarkAllRead, NotificationRead, NotificationUnreadCount
from app.services.notification_service import NotificationService

router = APIRouter()


@router.get("/unread-count", response_model=NotificationUnreadCount)
def unread_count(
    current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> NotificationUnreadCount:
    service = NotificationService(db)
    return NotificationUnreadCount(count=service.unread_count(current_user.id))


@router.post("/read-all", response_model=NotificationMarkAllRead)
def mark_all_read(
    current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> NotificationMarkAllRead:
    service = NotificationService(db)
    return NotificationMarkAllRead(updated=service.mark_all_read(current_user.id))


@router.get("", response_model=list[NotificationRead])
def list_notifications(
    unread_only: bool = False,
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[NotificationRead]:
    service = NotificationService(db)
    return service.list(current_user.id, unread_only=unread_only, limit=limit)


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> NotificationRead:
    service = NotificationService(db)
    return service.mark_read(notification_id, current_user.id)
