from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/today", response_model=DashboardSummary)
def get_dashboard_today(
    current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> DashboardSummary:
    service = DashboardService(db)
    return service.summary(current_user.id)
