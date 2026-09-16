import os
from collections.abc import Generator

# Debe fijarse antes de importar app.core.config (que lee el entorno al importarse):
# sin esto, el scheduler de notificaciones (Fase 8) arrancaria un hilo de fondo real
# contra la base de datos de test en cada test que use el fixture `client`.
os.environ.setdefault("SCHEDULER_ENABLED", "false")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app

TEST_DB_NAME = "lifehub_test"


def _admin_engine():
    admin_url = settings.sqlalchemy_database_uri.rsplit("/", 1)[0] + "/postgres"
    return create_engine(admin_url, isolation_level="AUTOCOMMIT")


def _test_db_url() -> str:
    return settings.sqlalchemy_database_uri.rsplit("/", 1)[0] + f"/{TEST_DB_NAME}"


@pytest.fixture(scope="session")
def _test_engine():
    admin_engine = _admin_engine()
    with admin_engine.connect() as conn:
        conn.execute(text(f"DROP DATABASE IF EXISTS {TEST_DB_NAME}"))
        conn.execute(text(f"CREATE DATABASE {TEST_DB_NAME}"))
    admin_engine.dispose()

    engine = create_engine(_test_db_url())
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()

    admin_engine = _admin_engine()
    with admin_engine.connect() as conn:
        conn.execute(text(f"DROP DATABASE IF EXISTS {TEST_DB_NAME}"))
    admin_engine.dispose()


@pytest.fixture()
def db_session(_test_engine) -> Generator[Session, None, None]:
    connection = _test_engine.connect()
    transaction = connection.begin()
    session_factory = sessionmaker(bind=connection, autoflush=False, autocommit=False)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def _get_db_override() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = _get_db_override
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers(client: TestClient) -> dict[str, str]:
    """Registra un usuario nuevo y devuelve headers Authorization listos para usar."""
    email = "owner@example.com"
    client.post("/api/auth/register", json={"email": email, "password": "supersecret123"})
    login = client.post("/api/auth/login", data={"username": email, "password": "supersecret123"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
