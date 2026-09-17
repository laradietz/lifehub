"""add missing indexes on category_id / assigned_to_id foreign keys

Revision ID: f1c6d8a02e7b
Revises: e5a2c9f1b4d3
Create Date: 2026-09-17 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'f1c6d8a02e7b'
down_revision: Union[str, None] = 'e5a2c9f1b4d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Postgres no indexa foreign keys automaticamente (ver AUDITORIA.md, hallazgo S15/D2).
_INDEXES = [
    ("ix_events_category_id", "events", "category_id"),
    ("ix_incomes_category_id", "incomes", "category_id"),
    ("ix_expenses_category_id", "expenses", "category_id"),
    ("ix_reminders_category_id", "reminders", "category_id"),
    ("ix_subscriptions_category_id", "subscriptions", "category_id"),
    ("ix_tasks_category_id", "tasks", "category_id"),
    ("ix_shopping_items_category_id", "shopping_items", "category_id"),
    ("ix_tasks_assigned_to_id", "tasks", "assigned_to_id"),
]


def upgrade() -> None:
    for index_name, table_name, column_name in _INDEXES:
        op.create_index(index_name, table_name, [column_name])


def downgrade() -> None:
    for index_name, table_name, _column_name in _INDEXES:
        op.drop_index(index_name, table_name=table_name)
