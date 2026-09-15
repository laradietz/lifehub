"""add status to household members

Revision ID: 1deb3fc6c345
Revises: a47597b1593c
Create Date: 2026-09-15 13:10:05.298007

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '1deb3fc6c345'
down_revision: Union[str, None] = 'a47597b1593c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tipo nuevo (no un ALTER TYPE ... ADD VALUE sobre uno existente), asi que
    # se crea con el patron normal de creacion de columna+enum. SQLAlchemy
    # serializa los miembros del Enum de Python por su .name en mayusculas
    # (ver a47597b1593c), por eso los valores del tipo son 'PENDING'/'ACCEPTED'.
    household_member_status = postgresql.ENUM(
        "PENDING", "ACCEPTED", name="household_member_status"
    )
    household_member_status.create(op.get_bind())
    op.add_column(
        "household_members",
        sa.Column(
            "status",
            household_member_status,
            nullable=False,
            server_default="ACCEPTED",
        ),
    )


def downgrade() -> None:
    op.drop_column("household_members", "status")
    postgresql.ENUM(name="household_member_status").drop(op.get_bind())
