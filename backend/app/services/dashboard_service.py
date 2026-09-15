import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.enums import TaskStatus
from app.models.reminder import Reminder
from app.models.task import Task
from app.schemas.dashboard import DashboardSummary, DashboardToday


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

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

        return DashboardSummary(
            today=DashboardToday(
                tasks_due_today=tasks_due_today,
                tasks_overdue=tasks_overdue,
                reminders_due_today=reminders_due_today,
                pending_tasks_total=pending_tasks_total,
            ),
            upcoming_reminders=upcoming_reminders,
            week_tasks=week_tasks,
        )
