from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.schemas.reminder import ReminderRead
from app.schemas.task import TaskRead


class DashboardToday(BaseModel):
    tasks_due_today: int
    tasks_overdue: int
    reminders_due_today: int
    pending_tasks_total: int


class DashboardFinance(BaseModel):
    currency: str
    income_this_month: Decimal
    expenses_this_month: Decimal
    balance: Decimal
    top_expense_category: Optional[str] = None
    subscriptions_monthly_total: Decimal


class DashboardSummary(BaseModel):
    today: DashboardToday
    upcoming_reminders: list[ReminderRead]
    week_tasks: list[TaskRead]
    finance: DashboardFinance
