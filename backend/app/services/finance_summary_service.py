import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.finance import Expense, Income
from app.schemas.finance import CategoryBreakdownItem, FinanceSummary, MonthlyPoint
from app.services.date_utils import month_bounds, shift_month

EVOLUTION_MONTHS = 6


class FinanceSummaryService:
    """Agrega ingresos y gastos para el resumen mensual del dashboard y de Finanzas.

    Nota: por simplicidad no hace conversion de moneda; asume que el usuario opera
    consistentemente en una sola divisa (razonable para una persona/hogar).
    """

    def __init__(self, db: Session):
        self.db = db

    def _sum_expense(self, user_id: uuid.UUID, start: date, end: date) -> Decimal:
        total = self.db.scalar(
            select(func.coalesce(func.sum(Expense.amount), 0)).where(
                Expense.user_id == user_id, Expense.date >= start, Expense.date < end
            )
        )
        return Decimal(total)

    def _sum_income(self, user_id: uuid.UUID, start: date, end: date) -> Decimal:
        total = self.db.scalar(
            select(func.coalesce(func.sum(Income.amount), 0)).where(
                Income.user_id == user_id, Income.date >= start, Income.date < end
            )
        )
        return Decimal(total)

    def get_summary(self, user_id: uuid.UUID, currency: str, month: date | None = None) -> FinanceSummary:
        reference_day = month or date.today()
        start, end = month_bounds(reference_day)
        prev_start, prev_end = month_bounds(shift_month(reference_day, -1))

        total_income = self._sum_income(user_id, start, end)
        total_expense = self._sum_expense(user_id, start, end)
        previous_month_expense = self._sum_expense(user_id, prev_start, prev_end)

        expense_change_pct = None
        if previous_month_expense > 0:
            expense_change_pct = float((total_expense - previous_month_expense) / previous_month_expense * 100)

        breakdown_rows = self.db.execute(
            select(Expense.category_id, Category.name, func.sum(Expense.amount))
            .select_from(Expense)
            .outerjoin(Category, Category.id == Expense.category_id)
            .where(Expense.user_id == user_id, Expense.date >= start, Expense.date < end)
            .group_by(Expense.category_id, Category.name)
            .order_by(func.sum(Expense.amount).desc())
        ).all()

        expense_by_category = [
            CategoryBreakdownItem(category_id=category_id, category_name=name or "Sin categoría", total=total)
            for category_id, name, total in breakdown_rows
        ]
        top_expense_category = expense_by_category[0] if expense_by_category else None

        evolution: list[MonthlyPoint] = []
        for offset in range(EVOLUTION_MONTHS - 1, -1, -1):
            point_start, point_end = month_bounds(shift_month(reference_day, -offset))
            evolution.append(
                MonthlyPoint(
                    month=point_start.strftime("%Y-%m"),
                    income=self._sum_income(user_id, point_start, point_end),
                    expense=self._sum_expense(user_id, point_start, point_end),
                )
            )

        return FinanceSummary(
            month=start.strftime("%Y-%m"),
            currency=currency,
            total_income=total_income,
            total_expense=total_expense,
            balance=total_income - total_expense,
            previous_month_expense=previous_month_expense,
            expense_change_pct=expense_change_pct,
            top_expense_category=top_expense_category,
            expense_by_category=expense_by_category,
            evolution=evolution,
        )
