from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración centralizada de la aplicación, cargada desde variables de entorno / .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "LifeHub"
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

    # Fase 7 (IA): la API key se lee solo desde el entorno, nunca se persiste ni se loguea.
    OPENAI_API_KEY: str | None = None

    MAX_UPLOAD_SIZE_MB: int = 10

    @property
    def sqlalchemy_database_uri(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
