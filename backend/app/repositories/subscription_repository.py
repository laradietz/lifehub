import uuid
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.subscription import Subscription


class SubscriptionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, subscription_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Subscription]:
        stmt = select(Subscription).where(Subscription.id == subscription_id, Subscription.user_id == user_id)
        return self.db.scalar(stmt)

    def list(self, user_id: uuid.UUID, *, include_inactive: bool = False) -> list[Subscription]:
        stmt = select(Subscription).where(Subscription.user_id == user_id)
        if not include_inactive:
            stmt = stmt.where(Subscription.is_active.is_(True))
        stmt = stmt.order_by(Subscription.next_billing_date.asc())
        return list(self.db.scalars(stmt))

    def create(self, user_id: uuid.UUID, **fields: Any) -> Subscription:
        subscription = Subscription(user_id=user_id, **fields)
        self.db.add(subscription)
        self.db.flush()
        return subscription

    def delete(self, subscription: Subscription) -> None:
        self.db.delete(subscription)
