"""fix reminder category type enum case

Revision ID: a47597b1593c
Revises: 39c2e9c87f49
Create Date: 2026-09-15 13:09:37.651106

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a47597b1593c'
down_revision: Union[str, None] = '39c2e9c87f49'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # La migracion 39c2e9c87f49 agrego el valor 'reminder' (minuscula) al enum
    # category_type, pero SQLAlchemy serializa los miembros de CategoryType
    # (un str Enum) usando su .name en mayusculas ('REMINDER'), no su .value.
    # Esto rompe cualquier insert de una categoria de tipo REMINDER (incluida
    # la que se crea automaticamente al registrarse) con un error de Postgres
    # "invalid input value for enum category_type". Se agrega el valor
    # correcto en mayuscula; el valor 'reminder' en minuscula queda sin uso
    # (Postgres no permite eliminar valores de un enum sin recrear el tipo).
    #
    # ALTER TYPE ... ADD VALUE no puede usarse en la misma transaccion en la
    # que despues se referencia ese valor, por eso corre en un bloque
    # autocommit separado del resto de la migracion.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE category_type ADD VALUE IF NOT EXISTS 'REMINDER'")

    # Por si alguna fila ya se hubiera guardado con el valor incorrecto.
    op.execute("UPDATE categories SET type = 'REMINDER' WHERE type = 'reminder'")


def downgrade() -> None:
    # Ver nota en 39c2e9c87f49: Postgres no permite eliminar un valor de un
    # enum sin recrear el tipo completo; se omite a proposito.
    pass
