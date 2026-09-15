import logging

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger("lifehub")


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        # exc.errors() puede incluir objetos no serializables (p. ej. excepciones dentro de 'ctx');
        # si json.dumps falla al serializarlos, la respuesta nunca sale y el navegador lo reporta
        # como un error de CORS (porque el 500 resultante no pasa por el middleware de CORS).
        errors = [{k: v for k, v in error.items() if k != "ctx"} for error in exc.errors()]
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": jsonable_encoder(errors)},
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
        logger.warning("Integrity error on %s", request.url.path)
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": "Conflicto de datos: el recurso ya existe o viola una restricción."},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error on %s", request.url.path)
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"detail": "Ha ocurrido un error interno."})
