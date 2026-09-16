# LifeHub

Panel de control personal para organizar tareas, finanzas, compras, vencimientos, documentos, vehículos y más, todo en un solo lugar.

> **Estado actual: Fase 8 completada.** Arquitectura, base de datos, autenticación (con recuperación de contraseña por código), dashboard configurable, tareas, recordatorios/vencimientos, finanzas personales, suscripciones, compras inteligentes, hogares multi-usuario, documentos/vehículos, calendario y notificaciones (in-app + email) funcionando de punta a punta. La Fase 7 (asistente de IA) se descartó a pedido del usuario. El resto de los módulos se construyen en las fases siguientes — ver [Roadmap](#roadmap).

## Why LifeHub?

Organizar la vida cotidiana hoy implica saltar entre una app de notas, el home banking, una lista de compras en el celular, recordatorios sueltos y un calendario que nunca está del todo actualizado. Nada conversa entre sí, así que las cosas se olvidan: una suscripción que se cobra sin que la esperes, un seguro que vence, una compra que se repite todas las semanas sin que nadie lo note.

LifeHub existe para bajar esa carga mental: un único panel que responde preguntas simples como *"¿qué tengo que hacer hoy?"*, *"¿en qué gasté este mes?"* y *"¿qué está por vencer?"* — sin abrir cinco aplicaciones distintas.

## Funcionalidades (Fases 1-6, 8)

- Registro e inicio de sesión con JWT (access + refresh token).
- Refresh tokens persistidos y revocables: el logout invalida la sesión de verdad, no solo del lado del cliente.
- Recuperación de contraseña por código de 6 dígitos enviado por email (expira a los 15 minutos, con límite de intentos y reenvío con cooldown). El envío de email es un servicio con interfaz lista para enchufar un proveedor real.
- Perfil de usuario editable.
- Dashboard **configurable**: el usuario elige qué widgets ver (Hoy, Finanzas, Próximos vencimientos, Resumen semanal) desde Configuración.
- Tareas con prioridad, categoría, etiquetas y repetición (diaria/semanal/mensual): al completar una tarea recurrente se genera automáticamente la siguiente ocurrencia.
- Recordatorios/vencimientos con recordatorios anticipados configurables (ej: avisar 30/7/1 días antes) y la misma lógica de repetición automática.
- **Finanzas personales**: ingresos y gastos con categoría y método de pago, resumen mensual (ingresos, gastos, saldo, categoría donde más gastó, comparación con el mes anterior), gráfico de gastos por categoría y gráfico de evolución de los últimos 6 meses.
- **Suscripciones**: Netflix, Spotify, gimnasio, etc., con cálculo automático del gasto mensual y anual estimado (normalizando semanal/mensual/anual) y próximo cobro.
- Moneda configurable por usuario (afecta cómo se muestran y se cargan por defecto los nuevos movimientos).
- Categorías por usuario, con un set inicial sembrado al registrarse y creación rápida desde los formularios.
- Sidebar de navegación, menú responsive para mobile, estados vacíos, de carga y de error en toda la app.
- Esquema de base de datos completo para todos los módulos futuros (20 tablas), migrado con Alembic.
- **Hogares multi-usuario reales**: crear un hogar, invitar a otras personas por email, aceptar/rechazar la invitación, roles dueño/miembro, expulsar o abandonar, eliminar el hogar (las tareas y listas compartidas quedan como personales, no se borran).
- **Tareas de hogar**: asignar una tarea a cualquier miembro aceptado del hogar; la tarea es visible y editable por todo el hogar, pero solo quien la creó puede borrarla.
- **Compras**: listas personales o compartidas con un hogar, ítems con cantidad/unidad/categoría, y **sugerencias de recompra** calculadas a partir del historial de compras propio (heurística simple por intervalo promedio entre compras, presentada siempre como sugerencia, nunca como certeza).
- **Documentos**: DNI, pasaporte, seguros, garantías, contratos y facturas con categoría, vencimiento opcional y notas. Cada documento admite un archivo adjunto (subida, descarga y reemplazo) guardado en un bucket S3-compatible privado (MinIO en desarrollo) — el backend siempre hace de proxy al leerlo, nunca se expone una URL pública directa. Filtro por categoría y por "vencen en los próximos N días".
- **Vehículos**: alta de vehículos (marca, modelo, año, patente, kilometraje) con historial de mantenimiento (cambios de aceite, service, neumáticos, etc.), costo, y próximo vencimiento por fecha o kilometraje. Registrar un mantenimiento con un kilometraje mayor al actual actualiza automáticamente el odómetro del vehículo. Documentos y vehículos son estrictamente personales (no se asocian a un hogar), a diferencia de tareas/compras.
- **Calendario**: vista mensual con eventos personales o de hogar (título, descripción, ubicación, categoría, todo el día o con horario). Igual que las tareas, un evento de hogar es visible y editable por cualquier miembro aceptado, pero solo quien lo creó puede borrarlo.
- **Notificaciones**: campanita en el header con contador de no leídas, panel con el historial, marcar individual o todas como leídas. Un chequeo periódico en segundo plano (cada 15 minutos, corre dentro del propio contenedor del backend) avisa recordatorios próximos a vencer (según el aviso anticipado configurado por el usuario), documentos por vencer, mantenimientos de vehículos próximos y eventos del calendario cercanos, por canal in-app y por email (el envío de email sigue siendo un servicio placeholder, igual que en el resto de la app).

## Stack

**Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0, PostgreSQL 16, Pydantic v2, Alembic, JWT (PyJWT), bcrypt, boto3 (storage S3-compatible), APScheduler (chequeo periódico de notificaciones), pytest.

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Zustand, Axios.

**Infraestructura:** Docker, Docker Compose, MinIO (almacenamiento de archivos S3-compatible en desarrollo).

## Arquitectura

```text
lifehub/
├── backend/
│   ├── app/
│   │   ├── api/            # Routers y dependencias de FastAPI
│   │   ├── core/           # Configuración y seguridad (JWT, hashing)
│   │   ├── models/         # Modelos SQLAlchemy (todas las tablas del dominio)
│   │   ├── schemas/        # Esquemas Pydantic (entrada/salida de la API)
│   │   ├── services/       # Lógica de negocio (AuthService, EmailService, ...)
│   │   ├── repositories/   # Acceso a datos
│   │   ├── db/             # Engine, sesión y registro de modelos
│   │   ├── middleware/     # Manejo centralizado de errores
│   │   └── main.py
│   ├── alembic/            # Migraciones
│   └── tests/              # pytest (auth, usuarios, permisos)
├── frontend/
│   └── src/
│       ├── components/ui/  # Primitivas reutilizables (Button, Input, Card, ...)
│       ├── layouts/        # AuthLayout, AppLayout (sidebar + nav mobile)
│       ├── pages/          # Login, Register, Dashboard, Settings, ...
│       ├── routes/         # ProtectedRoute / PublicOnlyRoute
│       ├── services/       # Cliente Axios + interceptores de refresh
│       ├── store/          # Estado global (Zustand)
│       └── types/
└── docker-compose.yml
```

La API sigue una arquitectura por capas: **endpoint → service → repository → modelo**. Los endpoints no acceden a la base de datos directamente; la lógica de negocio vive en `services/`, y el acceso a datos está aislado en `repositories/` para poder testear y reemplazar cada capa de forma independiente.

## Puesta en marcha

### Requisitos

- Docker y Docker Compose.

No hace falta tener Python ni Node instalados localmente: todo corre en contenedores.

### 1. Configurar variables de entorno

```bash
cp .env.example .env
```

Editá `.env` y generá un `SECRET_KEY` propio:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 2. Levantar todo

```bash
docker compose up -d
```

Esto levanta PostgreSQL, MinIO (almacenamiento de archivos), el backend (aplicando las migraciones automáticamente al arrancar) y el frontend.

- Frontend: http://localhost:5173
- API: http://localhost:8000
- Documentación interactiva (Swagger): http://localhost:8000/api/docs
- Consola de MinIO: http://localhost:9001 (usuario/clave: los valores de `S3_ACCESS_KEY`/`S3_SECRET_KEY` del `.env`)

### 3. Migraciones

Se aplican solas al iniciar el contenedor `backend`. Para generar una nueva migración después de modificar un modelo:

```bash
docker compose exec backend alembic revision --autogenerate -m "descripcion"
docker compose exec backend alembic upgrade head
```

### 4. Tests

```bash
docker compose exec backend pytest -v
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `SECRET_KEY` | Clave para firmar los JWT. Generar una propia, nunca usar la de ejemplo. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | Duración de los tokens. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credenciales de la base de datos. |
| `BACKEND_CORS_ORIGINS` | Lista JSON de orígenes permitidos por CORS. |
| `SCHEDULER_ENABLED` / `NOTIFICATION_CHECK_INTERVAL_MINUTES` | Notificaciones (Fase 8). Opcionales, valores por defecto `true` / `15`. |
| `S3_ENDPOINT_URL` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `S3_BUCKET_NAME` / `S3_REGION` | Almacenamiento de archivos (documentos adjuntos). MinIO en desarrollo, cualquier storage S3-compatible en producción. |
| `VITE_API_URL` | URL base de la API que consume el frontend. |

## Seguridad

- Contraseñas hasheadas con bcrypt (nunca en texto plano).
- Refresh tokens almacenados como hash (SHA-256) y revocables individualmente.
- El logout revoca el refresh token en el servidor, no solo lo borra del cliente.
- El endpoint de recuperación de contraseña nunca revela si un email existe o no.
- Cada usuario solo puede leer/modificar sus propios datos (`/users/me` opera siempre sobre el usuario del token, nunca sobre un ID recibido del cliente).
- CORS configurado explícitamente por entorno.

## Roadmap

- [x] **Fase 1** — Arquitectura, base de datos y autenticación.
- [x] **Fase 2** — Dashboard configurable, tareas, recordatorios y vencimientos.
- [x] **Fase 3** — Finanzas personales y suscripciones.
- [x] **Fase 4** — Lista de compras inteligente y hogar.
- [x] **Fase 5** — Documentos y vehículos.
- [x] **Fase 6** — Calendario integrado.
- [ ] ~~**Fase 7** — Asistente de IA.~~ Descartada a pedido del usuario, no está en la cola.
- [x] **Fase 8** — Notificaciones (in-app y email; push queda para más adelante).
- [ ] **Fase 9** — Pulido de UX/UI, accesibilidad y responsive avanzado.
- [ ] **Fase 10** — Testing extendido, seguridad y optimización.
- [ ] **Fase 11** — Empaquetado final para producción.

## Licencia

MIT.
