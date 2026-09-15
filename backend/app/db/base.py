"""Importa Base y todos los modelos para que Alembic los detecte al autogenerar migraciones."""

from app.db.base_class import Base  # noqa: F401
from app.models.auth_token import PasswordResetToken, RefreshToken  # noqa: F401
from app.models.category import Category  # noqa: F401
from app.models.document import Document  # noqa: F401
from app.models.event import Event  # noqa: F401
from app.models.finance import Expense, Income  # noqa: F401
from app.models.household import Household, HouseholdMember  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.reminder import Reminder  # noqa: F401
from app.models.shopping import ShoppingHistory, ShoppingItem, ShoppingList  # noqa: F401
from app.models.subscription import Subscription  # noqa: F401
from app.models.task import Task  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.user_settings import UserSettings  # noqa: F401
from app.models.vehicle import Vehicle, VehicleMaintenance  # noqa: F401
