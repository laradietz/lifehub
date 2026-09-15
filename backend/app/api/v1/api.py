from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    categories,
    dashboard,
    expenses,
    finance,
    households,
    incomes,
    reminders,
    settings,
    shopping,
    subscriptions,
    tasks,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(reminders.router, prefix="/reminders", tags=["reminders"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(incomes.router, prefix="/incomes", tags=["finance"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["finance"])
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["finance"])
api_router.include_router(finance.router, prefix="/finance", tags=["finance"])
api_router.include_router(households.router, prefix="/households", tags=["households"])
api_router.include_router(shopping.router, prefix="/shopping", tags=["shopping"])
