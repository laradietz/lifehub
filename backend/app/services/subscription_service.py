import uuid
from decimal import ROUND_HALF_UP, Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.enums import SubscriptionFrequency
from app.models.subscription import Subscription
from app.repositories.subscription_repository import SubscriptionRepository
from app.schemas.subscription import SubscriptionCreate, SubscriptionSummary, SubscriptionUpdate

# Factores para normalizar cualquier frecuencia a un estimado mensual/anual.
_MONTHLY_FACTOR = {
    SubscriptionFrequency.WEEKLY: Decimal("52") / Decimal("12"),
    SubscriptionFrequency.MONTHLY: Decimal("1"),
    SubscriptionFrequency.YEARLY: Decimal("1") / Decimal("12"),
}
_ANNUAL_FACTOR = {
    SubscriptionFrequency.WEEKLY: Decimal("52"),
    SubscriptionFrequency.MONTHLY: Decimal("12"),
    SubscriptionFrequency.YEARLY: Decimal("1"),
}

_CENTS = Decimal("0.01")


class SubscriptionService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = SubscriptionRepository(db)

    def list(self, user_id: uuid.UUID, *, include_inactive: bool = False) -> list[Subscription]:
        return self.repo.list(user_id, include_inactive=include_inactive)

    def get_owned_or_404(self, subscription_id: uuid.UUID, user_id: uuid.UUID) -> Subscription:
        subscription = self.repo.get(subscription_id, user_id)
        if not subscription:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Suscripción no encontrada.")
        return subscription

    def create(self, user_id: uuid.UUID, data: SubscriptionCreate) -> Subscription:
        subscription = self.repo.create(user_id, **data.model_dump())
        self.db.commit()
        self.db.refresh(subscription)
        return subscription

    def update(self, subscription_id: uuid.UUID, user_id: uuid.UUID, data: SubscriptionUpdate) -> Subscription:
        subscription = self.get_owned_or_404(subscription_id, user_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(subscription, field, value)
        self.db.commit()
        self.db.refresh(subscription)
        return subscription

    def delete(self, subscription_id: uuid.UUID, user_id: uuid.UUID) -> None:
        subscription = self.get_owned_or_404(subscription_id, user_id)
        self.repo.delete(subscription)
        self.db.commit()

    def get_summary(self, user_id: uuid.UUID, currency: str) -> SubscriptionSummary:
        active = self.repo.list(user_id, include_inactive=False)

        monthly_total = sum(
            (sub.price * _MONTHLY_FACTOR[sub.frequency] for sub in active), Decimal("0")
        ).quantize(_CENTS, rounding=ROUND_HALF_UP)
        annual_total = sum(
            (sub.price * _ANNUAL_FACTOR[sub.frequency] for sub in active), Decimal("0")
        ).quantize(_CENTS, rounding=ROUND_HALF_UP)

        next_billing = min(active, key=lambda sub: sub.next_billing_date) if active else None

        return SubscriptionSummary(
            currency=currency,
            monthly_total=monthly_total,
            annual_total=annual_total,
            next_billing=next_billing,
        )
