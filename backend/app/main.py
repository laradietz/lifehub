from contextlib import asynccontextmanager
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.db.base import Base  # noqa: F401  (registra todos los modelos antes de configurar los mappers)
from app.middleware.error_handler import register_exception_handlers
from app.services.notification_dispatch_service import run_notification_dispatch
from app.services.storage_service import get_storage_service

setup_logging()

scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_storage_service().ensure_bucket()
    if settings.SCHEDULER_ENABLED:
        # SCHEDULER_ENABLED=false en tests (ver conftest.py) para que la suite no
        # dispare chequeos reales contra la base de datos de test en un hilo de fondo.
        scheduler.add_job(
            run_notification_dispatch,
            "interval",
            minutes=settings.NOTIFICATION_CHECK_INTERVAL_MINUTES,
            next_run_time=datetime.now(),
            id="notification_dispatch",
        )
        scheduler.start()
    yield
    if settings.SCHEDULER_ENABLED and scheduler.running:
        scheduler.shutdown(wait=False)


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
