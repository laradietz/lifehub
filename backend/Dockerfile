# Multi-stage (ver AUDITORIA.md, hallazgos S6/S14):
#   - builder: unico stage con gcc/libpq-dev (necesarios para compilar psycopg/etc.),
#     nunca llega a la imagen final.
#   - dev: la que usa docker-compose.yml (necesita pytest para `docker compose exec
#     backend pytest` y curl es util para debug manual). Corre como root: el bind
#     mount de docker-compose.yml sobre /app rompe con permisos de usuario no-root
#     en bind mounts de Windows, así que se deja como root a propósito, mitigado por
#     no ser la imagen que se despliega de verdad.
#   - prod: imagen final que se despliega (docker-compose.prod.yml), sin gcc/libpq-dev,
#     sin pytest/httpx, corriendo como usuario no-root.
FROM python:3.12-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt


FROM python:3.12-slim AS dev

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-dev.txt ./
RUN pip install -r requirements-dev.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]


FROM python:3.12-slim AS prod

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1000 --shell /usr/sbin/nologin appuser

COPY --from=builder /install /usr/local
COPY --chown=appuser:appuser . .

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
