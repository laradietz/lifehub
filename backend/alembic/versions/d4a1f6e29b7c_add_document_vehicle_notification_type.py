"""add document/vehicle notification type

Revision ID: d4a1f6e29b7c
Revises: c8f3a19d4b21
Create Date: 2026-09-17 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4a1f6e29b7c'
down_revision: Union[str, None] = 'c8f3a19d4b21'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Fase 8: agrega 'DOCUMENT' y 'VEHICLE' al enum notification_type para que el
    # dispatcher de notificaciones pueda avisar vencimientos de Documentos y
    # mantenimientos de Vehiculos, no solo Reminder/Task/Subscription/Event.
    # Mismo patron que c8f3a19d4b21: ALTER TYPE ... ADD VALUE no puede correr
    # dentro de la misma transaccion que el resto de la migracion.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'DOCUMENT'")
        op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'VEHICLE'")


def downgrade() -> None:
    # Postgres no permite eliminar un valor de un enum sin recrear el tipo
    # completo; se omite a proposito (mismo criterio que el resto del proyecto).
    pass
