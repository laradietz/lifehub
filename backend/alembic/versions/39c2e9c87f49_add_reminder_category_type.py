"""add reminder category type

Revision ID: 39c2e9c87f49
Revises: 7b71c7086eaa
Create Date: 2026-09-15 00:27:18.125343

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '39c2e9c87f49'
down_revision: Union[str, None] = '7b71c7086eaa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Autogenerate no detecta altas de valores en enums nativos de Postgres;
    # se agrega a mano. No se puede quitar un valor de un enum sin recrear el
    # tipo, por eso el downgrade de este paso es un no-op documentado abajo.
    op.execute("ALTER TYPE category_type ADD VALUE IF NOT EXISTS 'reminder'")


def downgrade() -> None:
    # Postgres no permite eliminar un valor de un enum directamente. Revertir
    # esto implicaria recrear el tipo category_type sin 'reminder' y migrar
    # las filas existentes; se omite a proposito en este proyecto.
    pass
