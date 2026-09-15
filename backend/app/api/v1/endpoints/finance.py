from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.finance import FinanceSummary
from app.services.finance_summary_service import FinanceSummaryService
from app.services.settings_service import SettingsService

router = APIRouter()


@router.get("/summary", response_model=FinanceSummary)
def get_finance_summary(
    month: Optional[date] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> FinanceSummary:
    currency = SettingsService(db).get(current_user.id).currency
    service = FinanceSummaryService(db)
    return service.get_summary(current_user.id, currency, month)
