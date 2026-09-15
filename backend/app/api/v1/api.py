from fastapi import APIRouter

from app.api.v1.endpoints import auth, categories, dashboard, reminders, settings, tasks, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(reminders.router, prefix="/reminders", tags=["reminders"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
