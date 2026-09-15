import calendar
from datetime import date, datetime, timedelta
from typing import TypeVar

from app.models.enums import RecurrenceType

DateLike = TypeVar("DateLike", date, datetime)

# CUSTOM depende de una regla libre que todavia no interpretamos automaticamente,
# asi que ese caso (y NONE) no generan la siguiente ocurrencia por si solos.
_AUTO_ADVANCE = {RecurrenceType.DAILY, RecurrenceType.WEEKLY, RecurrenceType.MONTHLY}


def advances_automatically(recurrence: RecurrenceType) -> bool:
    return recurrence in _AUTO_ADVANCE


def advance_due_date(due: DateLike, recurrence: RecurrenceType) -> DateLike | None:
    if recurrence == RecurrenceType.DAILY:
        return due + timedelta(days=1)
    if recurrence == RecurrenceType.WEEKLY:
        return due + timedelta(weeks=1)
    if recurrence == RecurrenceType.MONTHLY:
        month = due.month + 1
        year = due.year + (month - 1) // 12
        month = ((month - 1) % 12) + 1
        day = min(due.day, calendar.monthrange(year, month)[1])
        return due.replace(year=year, month=month, day=day)
    return None
