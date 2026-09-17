"""add unique constraint on (user_id, license_plate) for vehicles

Revision ID: a9d3f7c1e6b2
Revises: f1c6d8a02e7b
Create Date: 2026-09-17 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a9d3f7c1e6b2'
down_revision: Union[str, None] = 'f1c6d8a02e7b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ver AUDITORIA.md, hallazgo D6. NULL no choca contra NULL en Postgres, asi que
    # esto no afecta a los vehiculos sin patente cargada.
    op.create_unique_constraint("uq_vehicle_user_license_plate", "vehicles", ["user_id", "license_plate"])


def downgrade() -> None:
    op.drop_constraint("uq_vehicle_user_license_plate", "vehicles", type_="unique")
