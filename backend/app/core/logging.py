import logging

from app.core.config import settings


def setup_logging() -> None:
    """Configura el logging de la app. Sin esto, logger.info() se pierde en silencio
    porque el root logger no tiene handlers por defecto."""
    level = logging.DEBUG if settings.ENVIRONMENT == "development" else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    logging.getLogger("lifehub").setLevel(level)
