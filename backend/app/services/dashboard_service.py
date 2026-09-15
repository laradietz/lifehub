import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.enums import TaskStatus
from app.models.reminder import Reminder
from app.models.task import Task
from app.schemas.dashboard import DashboardFinance, DashboardSummary, DashboardToday
from app.services.finance_summary_service import FinanceSummaryService
from app.services.settings_service import SettingsService
from app.services.subscription_service import SubscriptionService


class DashboardService:
    def __init__(self, db: Session):
        self.db = db
        self.finance_summary_service = FinanceSummaryService(db)
        self.subscription_service = SubscriptionService(db)
        self.settings_service = SettingsService(db)

    def summary(self, user_id: uuid.UUID) -> DashboardSummary:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        week_end = today_start + timedelta(days=7)

        tasks_due_today = self.db.scalar(
            select(func.count())
            .select_from(Task)
            .where(
                Task.user_id == user_id,
                Task.status != TaskStatus.COMPLETED,
                Task.due_date >= today_start,
                Task.due_date < today_end,
            )
        ) or 0

        tasks_overdue = self.db.scalar(
            select(func.count())
            .select_from(Task)
            .where(Task.user_id == user_id, Task.status != TaskStatus.COMPLETED, Task.due_date < today_start)
        ) or 0

        pending_tasks_total = self.db.scalar(
            select(func.count()).select_from(Task).where(Task.user_id == user_id, Task.status != TaskStatus.COMPLETED)
        ) or 0

        reminders_due_today = self.db.scalar(
            select(func.count())
            .select_from(Reminder)
            .where(Reminder.user_id == user_id, Reminder.is_completed.is_(False), Reminder.due_date == now.date())
        ) or 0

        upcoming_reminders = list(
            self.db.scalars(
                select(Reminder)
                .where(Reminder.user_id == user_id, Reminder.is_completed.is_(False))
                .order_by(Reminder.due_date.asc())
                .limit(5)
            )
        )

        week_tasks = list(
            self.db.scalars(
                select(Task)
                .where(
                    Task.user_id == user_id,
                    Task.status != TaskStatus.COMPLETED,
                    Task.due_date >= today_start,
                    Task.due_date < week_end,
                )
                .order_by(Task.due_date.asc())
                .limit(10)
            )
        )

        currency = self.settings_service.get(user_id).currency
        finance_summary = self.finance_summary_service.get_summary(user_id, currency)
        subscription_summary = self.subscription_service.get_summary(user_id, currency)

        return DashboardSummary(
            today=DashboardToday(
                tasks_due_today=tasks_due_today,
                tasks_overdue=tasks_overdue,
                reminders_due_today=reminders_due_today,
                pending_tasks_total=pending_tasks_total,
            ),
            upcoming_reminders=upcoming_reminders,
            week_tasks=week_tasks,
            finance=DashboardFinance(
                currency=currency,
                income_this_month=finance_summary.total_income,
                expenses_this_month=finance_summary.total_expense,
                balance=finance_summary.balance,
                top_expense_category=(
                    finance_summary.top_expense_category.category_name if finance_summary.top_expense_category else None
                ),
                subscriptions_monthly_total=subscription_summary.monthly_total,
            ),
        )
