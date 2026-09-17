from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración centralizada de la aplicación, cargada desde variables de entorno / .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "Life Under Control"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    POSTGRES_USER: str = "lifehub"
    POSTGRES_PASSWORD: str = "lifehub"
    POSTGRES_DB: str = "lifehub"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str | None = None

    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    MAX_UPLOAD_SIZE_MB: int = 10

    # Email (ver AUDITORIA.md, hallazgo S8): si SMTP_HOST no está configurado, el
    # EmailService cae a solo loguear (comportamiento de siempre en desarrollo). Con
    # SMTP_HOST configurado, manda emails de verdad -- sirve para cualquier proveedor
    # que hable SMTP (Gmail, SES, Postmark, Mailgun, etc.), sin agregar un SDK nuevo.
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_USE_TLS: bool = True
    SMTP_FROM_EMAIL: str = "no-reply@lifeundercontrol.local"
    SMTP_FROM_NAME: str = "Life Under Control"

    # Fase 8 (Notificaciones): worker en el mismo contenedor backend (APScheduler),
    # sin servicio aparte. Se desactiva en tests (ver conftest.py) para que la suite
    # no dispare chequeos reales contra la base de datos de test en un hilo de fondo.
    SCHEDULER_ENABLED: bool = True
    NOTIFICATION_CHECK_INTERVAL_MINUTES: int = 15

    # Almacenamiento de archivos (Fase 5): bucket S3-compatible, MinIO en desarrollo.
    # S3_ENDPOINT_URL es la direccion INTERNA (red de Docker) que usa el backend para hablar
    # con el storage. Los archivos nunca se sirven con URLs firmadas directas al navegador:
    # el backend siempre hace de proxy (ver DocumentService.get_file_stream), asi que no hace
    # falta que este endpoint sea alcanzable desde fuera de la red de contenedores.
    S3_ENDPOINT_URL: str = "http://minio:9000"
    S3_ACCESS_KEY: str = "lifehub"
    S3_SECRET_KEY: str = "lifehub12345"
    S3_BUCKET_NAME: str = "lifehub"
    S3_REGION: str = "us-east-1"

    @property
    def sqlalchemy_database_uri(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    def model_post_init(self, __context: object) -> None:
        # Auditoría de seguridad (ver AUDITORIA.md, hallazgo S2): en producción no debe
        # poder arrancar con el SECRET_KEY placeholder de .env.example ni con las
        # credenciales default de desarrollo de Postgres/S3 (hallazgo S3).
        if self.ENVIRONMENT != "production":
            return

        placeholder_secret = "change-this-to-a-long-random-string"
        if self.SECRET_KEY == placeholder_secret or len(self.SECRET_KEY) < 32:
            raise ValueError(
                "SECRET_KEY inválido para producción: generá uno propio con "
                "`python -c \"import secrets; print(secrets.token_urlsafe(64))\"` "
                "y configuralo en el .env real (nunca uses el valor de .env.example)."
            )

        weak_defaults = {
            "POSTGRES_PASSWORD": "lifehub",
            "S3_ACCESS_KEY": "lifehub",
            "S3_SECRET_KEY": "lifehub12345",
        }
        for field_name, weak_value in weak_defaults.items():
            if getattr(self, field_name) == weak_value:
                raise ValueError(
                    f"{field_name} sigue en su valor default de desarrollo ('{weak_value}'). "
                    "Configurá una credencial real en el .env de producción antes de arrancar."
                )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
