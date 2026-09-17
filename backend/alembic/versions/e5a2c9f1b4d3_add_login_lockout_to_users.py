"""add login lockout fields to users

Revision ID: e5a2c9f1b4d3
Revises: d4a1f6e29b7c
Create Date: 2026-09-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5a2c9f1b4d3'
down_revision: Union[str, None] = 'd4a1f6e29b7c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Auditoria de seguridad (ver AUDITORIA.md, hallazgo S1/S5): bloqueo de cuenta
    # tras N intentos de login fallidos, mismo patron que ya existia para el codigo
    # de reset de contrasena. server_default='0' evita que falle en una tabla con
    # filas existentes (ver hallazgo D5 de la misma auditoria).
    op.add_column(
        'users', sa.Column('failed_login_attempts', sa.Integer(), nullable=False, server_default='0')
    )
    op.add_column('users', sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'locked_until')
    op.drop_column('users', 'failed_login_attempts')
