"""add event category type

Revision ID: c8f3a19d4b21
Revises: 1deb3fc6c345
Create Date: 2026-09-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8f3a19d4b21'
down_revision: Union[str, None] = '1deb3fc6c345'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Fase 6: agrega el valor 'EVENT' al enum category_type para que Event
    # pueda tener categorias como Task/Reminder/Income/Expense/Subscription.
    # Igual que en a47597b1593c: SQLAlchemy serializa los miembros de
    # CategoryType por su .name en mayuscula, y ALTER TYPE ... ADD VALUE no
    # puede correr dentro de la misma transaccion que el resto de la
    # migracion, por eso el bloque autocommit separado.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE category_type ADD VALUE IF NOT EXISTS 'EVENT'")


def downgrade() -> None:
    # Postgres no permite eliminar un valor de un enum sin recrear el tipo
    # completo; se omite a proposito (mismo criterio que el resto del proyecto).
    pass
