import pytest

from app.core.config import Settings


def _base_kwargs(**overrides):
    kwargs = dict(
        SECRET_KEY="a-properly-random-secret-key-that-is-long-enough-1234567890",
        POSTGRES_PASSWORD="a-real-postgres-password",
        S3_ACCESS_KEY="a-real-s3-access-key",
        S3_SECRET_KEY="a-real-s3-secret-key",
    )
    kwargs.update(overrides)
    return kwargs


def test_production_rejects_placeholder_secret_key():
    with pytest.raises(ValueError, match="SECRET_KEY"):
        Settings(ENVIRONMENT="production", **_base_kwargs(SECRET_KEY="change-this-to-a-long-random-string"))


def test_production_rejects_short_secret_key():
    with pytest.raises(ValueError, match="SECRET_KEY"):
        Settings(ENVIRONMENT="production", **_base_kwargs(SECRET_KEY="too-short"))


def test_production_rejects_default_postgres_password():
    with pytest.raises(ValueError, match="POSTGRES_PASSWORD"):
        Settings(ENVIRONMENT="production", **_base_kwargs(POSTGRES_PASSWORD="lifehub"))


def test_production_rejects_default_s3_credentials():
    with pytest.raises(ValueError, match="S3_ACCESS_KEY"):
        Settings(ENVIRONMENT="production", **_base_kwargs(S3_ACCESS_KEY="lifehub"))
    with pytest.raises(ValueError, match="S3_SECRET_KEY"):
        Settings(ENVIRONMENT="production", **_base_kwargs(S3_SECRET_KEY="lifehub12345"))


def test_production_accepts_proper_secrets():
    settings = Settings(ENVIRONMENT="production", **_base_kwargs())
    assert settings.SECRET_KEY


def test_development_does_not_enforce_guardrails():
    # En development se permiten los defaults (como hoy, para no romper el flujo local).
    settings = Settings(
        ENVIRONMENT="development",
        SECRET_KEY="change-this-to-a-long-random-string",
        POSTGRES_PASSWORD="lifehub",
        S3_ACCESS_KEY="lifehub",
        S3_SECRET_KEY="lifehub12345",
    )
    assert settings.ENVIRONMENT == "development"
