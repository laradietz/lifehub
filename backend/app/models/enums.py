import enum


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class Priority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class RecurrenceType(str, enum.Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CARD = "card"
    TRANSFER = "transfer"
    WALLET = "wallet"


class SubscriptionFrequency(str, enum.Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class NotificationChannel(str, enum.Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    PUSH = "push"


class NotificationType(str, enum.Enum):
    TASK = "task"
    REMINDER = "reminder"
    SUBSCRIPTION = "subscription"
    EVENT = "event"
    SYSTEM = "system"


class HouseholdRole(str, enum.Enum):
    OWNER = "owner"
    MEMBER = "member"


class CategoryType(str, enum.Enum):
    TASK = "task"
    REMINDER = "reminder"
    EXPENSE = "expense"
    INCOME = "income"
    SHOPPING = "shopping"
    DOCUMENT = "document"
    VEHICLE = "vehicle"
    SUBSCRIPTION = "subscription"
    HOME = "home"


class DocumentCategory(str, enum.Enum):
    ID = "id"
    PASSPORT = "passport"
    LICENSE = "license"
    INSURANCE = "insurance"
    WARRANTY = "warranty"
    CONTRACT = "contract"
    INVOICE = "invoice"
    OTHER = "other"


class VehicleMaintenanceType(str, enum.Enum):
    OIL_CHANGE = "oil_change"
    SERVICE = "service"
    TIRES = "tires"
    BATTERY = "battery"
    REPAIR = "repair"
    OTHER = "other"
