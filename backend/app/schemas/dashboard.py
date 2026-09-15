from pydantic import BaseModel

from app.schemas.reminder import ReminderRead
from app.schemas.task import TaskRead


class DashboardToday(BaseModel):
    tasks_due_today: int
    tasks_overdue: int
    reminders_due_today: int
    pending_tasks_total: int


class DashboardSummary(BaseModel):
    today: DashboardToday
    upcoming_reminders: list[ReminderRead]
    week_tasks: list[TaskRead]
