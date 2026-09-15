import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.subscription import SubscriptionCreate, SubscriptionRead, SubscriptionSummary, SubscriptionUpdate
from app.services.settings_service import SettingsService
from app.services.subscription_service import SubscriptionService

router = APIRouter()


@router.get("", response_model=list[SubscriptionRead])
def list_subscriptions(
    include_inactive: bool = Query(default=False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[SubscriptionRead]:
    service = SubscriptionService(db)
    return service.list(current_user.id, include_inactive=include_inactive)


@router.get("/summary", response_model=SubscriptionSummary)
def get_subscription_summary(
    current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> SubscriptionSummary:
    currency = SettingsService(db).get(current_user.id).currency
    service = SubscriptionService(db)
    return service.get_summary(current_user.id, currency)


@router.post("", response_model=SubscriptionRead, status_code=status.HTTP_201_CREATED)
def create_subscription(
    data: SubscriptionCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> SubscriptionRead:
    service = SubscriptionService(db)
    return service.create(current_user.id, data)


@router.get("/{subscription_id}", response_model=SubscriptionRead)
def get_subscription(
    subscription_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> SubscriptionRead:
    service = SubscriptionService(db)
    return service.get_owned_or_404(subscription_id, current_user.id)


@router.patch("/{subscription_id}", response_model=SubscriptionRead)
def update_subscription(
    subscription_id: uuid.UUID,
    data: SubscriptionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> SubscriptionRead:
    service = SubscriptionService(db)
    return service.update(subscription_id, current_user.id, data)


@router.delete("/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subscription(
    subscription_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> None:
    service = SubscriptionService(db)
    service.delete(subscription_id, current_user.id)
