# HANDOFF — LifeHub (documento de continuidad)

> Generado el 2026-09-15. Pegar este documento completo como primer mensaje en el chat nuevo. Cubre todo lo necesario para seguir el desarrollo sin releer la conversación anterior.

---

## 1. Objetivo del proyecto

**Qué es:** LifeHub, un panel de control personal ("todo en un solo lugar") para organizar tareas, finanzas, compras, vencimientos, documentos, vehículos y más.

**Para quién:** Una persona (usuario final individual, no B2B) que quiere reducir la carga mental de organizar su vida cotidiana: qué tiene que hacer, qué tiene que pagar, qué está por vencer, cuánto gastó, qué tiene que comprar.

**Finalidad declarada del proyecto:** Debe ser un producto **real y profesional**, no una demo ni un CRUD básico — pensado también como pieza de portfolio que demuestre Python/FastAPI, React/TypeScript, PostgreSQL, JWT, Docker, testing, arquitectura y buen UI/UX.

**Requisito explícito del usuario sobre el proceso de trabajo:** desarrollar **por fases** (11 fases definidas de entrada, ver sección 11), ejecutando y verificando cada fase antes de seguir a la siguiente, sin generar todo de una sola vez, tomando decisiones técnicas de forma autónoma salvo que cambien el producto de forma importante.

---

## 2. Estado actual

### ✅ Terminado y verificado (Fases 1-3)

- **Fase 1** — Arquitectura, base de datos (esquema completo de 20 tablas), autenticación JWT completa.
- **Fase 2** — Dashboard configurable, Tareas, Recordatorios/vencimientos.
- **Fase 3** — Finanzas personales (ingresos/gastos) y Suscripciones.
- Cambio adicional (fuera del plan original, pedido por el usuario): recuperación de contraseña rediseñada de "link con token" a **código de 6 dígitos por email**.

Todo lo anterior fue probado de punta a punta en navegador real (no solo tests automáticos) y tiene **45 tests de backend, todos pasando**.

### 🚧 En desarrollo / no empezado

- **Fase 4** — Compras (lista inteligente) y Hogar. **No empezada.** Los modelos de BD (`ShoppingList`, `ShoppingItem`, `ShoppingHistory`) ya existen en el esquema desde la Fase 1, pero no hay servicios, endpoints, ni frontend.
- **Fase 5** — Documentos y Vehículos. No empezada. Modelos (`Document`, `Vehicle`, `VehicleMaintenance`) ya existen en el esquema, sin lógica ni UI.
- **Fase 6** — Calendario integrado. No empezada. Modelo `Event` existe en el esquema, sin lógica ni UI.
- **Fase 7** — Asistente de IA. No empezada. Config tiene `OPENAI_API_KEY` como variable opcional preparada, nada más.
- **Fase 8** — Notificaciones (in-app, email, push). No empezada. Modelo `Notification` existe en el esquema; `EmailService` existe como placeholder (ver sección 7) pero no hay disparo real de notificaciones ni lógica de "avisar N días antes" conectada a nada todavía (el campo `advance_notice_days` de `Reminder` se guarda pero no dispara nada).
- **Fase 9** — UX/UI avanzado, accesibilidad, responsive fino, **dark mode**. Parcialmente preparado pero no activado (ver "Problemas pendientes" abajo — es importante).
- **Fase 10** — Testing extendido, seguridad, optimización. Backend tiene buena cobertura de auth/tasks/reminders/finance/subscriptions con foco en IDOR. **Frontend NO tiene tests** (ver abajo).
- **Fase 11** — Docker + documentación final + preparación para producción. El README ya es bastante completo y se actualiza en cada fase; falta la pasada final (screenshots, checklist de producción, etc.).

### ⚠️ Errores/problemas pendientes conocidos (no bloqueantes, pero hay que saberlos)

1. **Dark mode no está activado en ningún lado.** `frontend/src/index.css` define `@custom-variant dark (&:where(.dark, .dark *));`, y todos los componentes ya usan clases `dark:...` de Tailwind — pero **nada en el código agrega la clase `.dark` al `<html>`**. `UserSettings.theme` (`light`/`dark`/`system`) se guarda en el backend pero el frontend nunca lo lee para aplicar el tema. Es decir: todo el trabajo de estilos dark ya está hecho pero es "código muerto" hasta que en la Fase 9 se implemente el toggle real (leer `theme` al cargar la app + guardar preferencia + listener de `prefers-color-scheme` si `theme === "system"`).
2. **Frontend sin tests.** `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom` están instalados como devDependencies desde la Fase 1 pero **nunca se escribió ningún test de frontend**. Pendiente para la Fase 10.
3. **Finanzas no hace conversión de moneda.** `FinanceSummaryService` (backend) suma montos de `Income`/`Expense` sin convertir divisas — asume que el usuario opera siempre en una sola moneda (razonable para una persona/hogar, pero está documentado como limitación intencional en el docstring del servicio, no un bug).
4. **Recurrencia `CUSTOM` no genera la siguiente ocurrencia automáticamente.** Tareas y Recordatorios con `recurrence = "daily" | "weekly" | "monthly"` sí generan automáticamente la siguiente ocurrencia al completarse; `recurrence = "custom"` se guarda pero no dispara nada (ver `backend/app/services/recurrence.py`).
5. **Docker Desktop está actualmente apagado** en esta máquina (el daemon no respondía al momento de escribir este handoff). Hay que arrancarlo antes de poder trabajar (ver sección 9).
6. **El repo Git no tiene remoto configurado.** Es un repo local nuevo (`git init` hecho en la Fase 1), 4 commits en `master`, sin `origin`. No está publicado en GitHub todavía (eso es parte de la Fase 11 / sección 28 del pedido original).
7. **Hay datos de prueba reales en la base de datos de desarrollo** (cuentas creadas manualmente durante las pruebas en navegador, ej. `lara.demo@example.com`). No es un seed formal (la Fase 25 del pedido original — "datos de demostración eliminables" — no está implementada), son solo restos de QA manual. No hay que tratarlos como fixtures ni depender de que existan.

---

## 3. Tecnologías utilizadas

### Backend
- **Python 3.12** (imagen `python:3.12-slim` en Docker; no hay Python instalado localmente en esta máquina fuera de Docker)
- **FastAPI** 0.115.6
- **SQLAlchemy** 2.0.36 (estilo 2.0 declarativo, `Mapped`/`mapped_column`)
- **PostgreSQL** 16 (imagen `postgres:16-alpine`)
- **psycopg** 3.2.3 (driver, `postgresql+psycopg://`)
- **Alembic** 1.14.0 (migraciones)
- **Pydantic** 2.10.4 + **pydantic-settings** 2.7.0
- **PyJWT** 2.10.1 (JWT propio, sin librerías de terceros tipo Authlib)
- **bcrypt** 4.2.1 (hash de contraseñas, uso directo del paquete `bcrypt`, no passlib)
- **pytest** 8.3.4 + pytest-cov 6.0.0 + httpx 0.28.1 (para `TestClient`)

### Frontend
- **React** 19.2.8
- **TypeScript** ~6.0.2
- **Vite** 8.3.0 (plugin `@vitejs/plugin-react` 6.1.1)
- **Tailwind CSS** 4.3.3 (vía `@tailwindcss/vite`, **sin** `tailwind.config.js` — Tailwind v4 usa `@theme` dentro de `index.css`)
- **React Router** 7.18.3
- **Zustand** 5.0.15 (estado global, solo para auth)
- **Axios** 1.20.0
- **clsx** 2.1.1
- **oxlint** 1.81.0 (linter, reemplaza ESLint)
- Sin librería de gráficos: los charts de Finanzas son **SVG hechos a mano** siguiendo la skill `dataviz` (ver sección 6).

### Infraestructura
- **Docker** + **Docker Compose** (`docker-compose.yml` en la raíz del proyecto)
- Sin CI/CD configurado todavía.

---

## 4. Estructura actual del proyecto

Ubicación: `C:\Users\Larita\Downloads\lifehub` (repo Git propio, independiente del repo que existe en la raíz de `Downloads` — **no tocar ese otro repo**).

```text
lifehub/
├── .env                      # NO versionado (real, con SECRET_KEY generado)
├── .env.example               # versionado, plantilla
├── .gitignore
├── LICENSE                    # MIT
├── README.md                  # documentación completa y actualizada por fase
├── HANDOFF.md                  # este documento
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── pytest.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │       ├── 567e2b7bfb30_initial_schema.py          # crea las 20 tablas
│   │       ├── 7b71c7086eaa_add_attempts_to_password_reset_token.py
│   │       └── 39c2e9c87f49_add_reminder_category_type.py   # ALTER TYPE manual, ver sección 8
│   ├── app/
│   │   ├── main.py            # crea la app FastAPI, registra logging, CORS, exception handlers, routers
│   │   ├── core/
│   │   │   ├── config.py      # Settings (pydantic-settings), lee .env
│   │   │   ├── security.py    # hash_password, verify_password, create/decode JWT
│   │   │   └── logging.py     # setup_logging() — IMPORTANTE, ver sección 10
│   │   ├── db/
│   │   │   ├── base_class.py  # Base (DeclarativeBase)
│   │   │   ├── base.py        # importa TODOS los modelos (necesario para Alembic Y para que SQLAlchemy resuelva relationships por string — ver sección 10)
│   │   │   └── session.py     # engine, SessionLocal, get_db()
│   │   ├── models/             # un archivo por entidad (ver sección 8 para la lista completa)
│   │   ├── schemas/             # Pydantic: *Create, *Update, *Read por entidad
│   │   ├── repositories/        # acceso a datos, un repo por entidad principal
│   │   ├── services/            # lógica de negocio (capa que orquesta repos + reglas)
│   │   ├── api/
│   │   │   ├── deps.py         # get_current_user, get_current_active_user (JWT)
│   │   │   └── v1/
│   │   │       ├── api.py      # agrega todos los routers con sus prefijos
│   │   │       └── endpoints/   # un archivo por recurso REST
│   │   └── middleware/
│   │       └── error_handler.py # handlers de RequestValidationError, IntegrityError, Exception genérica
│   └── tests/                   # pytest, un archivo por dominio (ver sección 8)
└── frontend/
    ├── Dockerfile
    ├── vite.config.ts            # alias "@" -> src, plugin Tailwind
    ├── tsconfig.app.json          # paths "@/*"
    └── src/
        ├── main.tsx / App.tsx     # rutas (React Router), carga auth al montar
        ├── index.css              # Tailwind v4 + @theme (paleta "brand") + custom-variant dark
        ├── layouts/                # AuthLayout (split-screen), AppLayout (sidebar + drawer mobile)
        ├── routes/                 # ProtectedRoute, PublicOnlyRoute
        ├── store/authStore.ts      # Zustand: user, status, login/register/logout/loadCurrentUser
        ├── services/                # un archivo por recurso, todos usan la instancia `api` (axios)
        ├── types/                   # tipos TS por dominio, espejo de los schemas Pydantic
        ├── hooks/useCategories.ts   # fetch + creación inline de categorías, reusado en todos los formularios
        ├── components/
        │   ├── ui/                  # Button, Input, Select, Textarea, Card, Modal, ConfirmDialog, Badge, Alert, Skeleton, Spinner, Logo
        │   ├── CategorySelect.tsx    # select de categoría + "crear nueva" inline (ver bug corregido, sección 10)
        │   └── charts/                # ExpenseCategoryChart (barras), IncomeExpenseTrendChart (líneas + tooltip)
        ├── pages/
        │   ├── auth/                  # LoginPage, RegisterPage, ForgotPasswordPage (wizard 2 pasos), (NO existe ResetPasswordPage — se eliminó)
        │   ├── dashboard/              # DashboardPage (widgets configurables), SettingsPage (perfil + moneda + widgets)
        │   ├── tasks/, reminders/, finance/, subscriptions/   # un módulo por dominio: Page + FormModal + Item
        │   └── NotFoundPage.tsx
        └── utils/                     # cn, taskMeta (labels/formateo), datetime, currency, chartColors, financeMeta
```

### Relación entre capas (backend)
`endpoint (api/v1/endpoints/*.py)` → recibe request, valida con schema Pydantic, llama a → `service (services/*.py)` → contiene la lógica de negocio, usa → `repository (repositories/*.py)` → hace las queries SQLAlchemy contra → `model (models/*.py)`.

Los endpoints **nunca** acceden a la DB directamente. La autorización (que un usuario solo vea sus propios datos) se aplica en el `repository` filtrando siempre por `user_id`, y en el `service` con métodos `get_owned_or_404` que devuelven 404 (no 403) si el recurso no es del usuario — así no se filtra si el recurso existe pero es de otro.

### Relación entre capas (frontend)
`Page` (ej. `TasksPage.tsx`) → mantiene el estado de lista/filtros/loading, llama a → `service` (ej. `taskService.ts`, wrapper fino sobre `api` de axios) → pega al backend. Los formularios de creación/edición viven en un `*FormModal.tsx` separado por módulo, todos siguen el mismo patrón: `useState` local, `useEffect` para popular el form si es edición, `onSubmit` async que llama al service y cierra el modal.

---

## 5. Arquitectura

### Backend — organización
Ver árbol en sección 4. Arquitectura por capas: `api → service → repository → model`. Un `AuthService` centraliza registro/login/logout/refresh/recuperación de contraseña. Un `CategoryService` con función standalone `seed_default_categories()` se llama desde `AuthService.register()` para crear categorías iniciales.

### Frontend — organización
Ver árbol en sección 4. Sin Redux — solo Zustand para auth (estado realmente global), todo lo demás es estado local de cada página con `useState`/`useEffect` + servicios axios. Sin React Query ni SWR (fetch manual en `useEffect`, patrón repetido a propósito para mantener el proyecto simple, ver sección 6).

### API — endpoints existentes

Prefijo base: `/api` (definido en `Settings.API_V1_STR`).

```
POST   /api/auth/register
POST   /api/auth/login                      (OAuth2PasswordRequestForm: username=email, password)
POST   /api/auth/refresh                    (body: refresh_token)
POST   /api/auth/logout                     (body: refresh_token, revoca en DB)
POST   /api/auth/password-reset/request     (body: email)
POST   /api/auth/password-reset/confirm     (body: email, code, new_password)

GET    /api/users/me
PATCH  /api/users/me                        (full_name, avatar_url)

GET    /api/settings
PATCH  /api/settings                        (language, currency, timezone, theme, enabled_modules, dashboard_widgets, notification_preferences, ai_data_access_enabled)

GET    /api/categories?type=<CategoryType>
POST   /api/categories
DELETE /api/categories/{id}

GET    /api/tasks?status=&priority=&category_id=&due_before=&due_after=
POST   /api/tasks
GET    /api/tasks/{id}
PATCH  /api/tasks/{id}
DELETE /api/tasks/{id}

GET    /api/reminders?include_completed=&category_id=
POST   /api/reminders
GET    /api/reminders/{id}
PATCH  /api/reminders/{id}
DELETE /api/reminders/{id}

GET    /api/dashboard/today                  # agrega tasks + reminders + finance + subscriptions

GET    /api/incomes
POST   /api/incomes
GET    /api/incomes/{id}
PATCH  /api/incomes/{id}
DELETE /api/incomes/{id}

GET    /api/expenses          (mismo shape que incomes)
POST/GET/PATCH/DELETE /api/expenses/{id}

GET    /api/finance/summary?month=YYYY-MM-DD   # resumen mensual + evolución 6 meses

GET    /api/subscriptions?include_inactive=
POST   /api/subscriptions
GET    /api/subscriptions/summary              # OJO: registrado ANTES de /{id} en el router, a propósito
GET    /api/subscriptions/{id}
PATCH  /api/subscriptions/{id}
DELETE /api/subscriptions/{id}
```

Documentación interactiva (Swagger): `http://localhost:8000/api/docs` — se regenera sola desde el código, siempre confiar en esa antes que en este listado si hay dudas.

### Base de datos y relaciones
Ver sección 8 completa.

### Autenticación/autorización
- JWT stateless para el **access token** (`type: "access"`, expira en `ACCESS_TOKEN_EXPIRE_MINUTES`, default 30 min).
- **Refresh token** también JWT (`type: "refresh"`) pero además persistido en la tabla `refresh_tokens` como **hash SHA-256** — esto permite revocación real: logout marca `revoked=True`, y cada `refresh` rota el token (revoca el viejo, emite uno nuevo). Expira en `REFRESH_TOKEN_EXPIRE_DAYS`, default 30 días.
- El frontend guarda ambos tokens en `localStorage` (`frontend/src/services/tokenStorage.ts`) y un interceptor de axios (`frontend/src/services/api.ts`) reintenta automáticamente con refresh si recibe 401 (una sola vez, con una promesa compartida para evitar refrescos en paralelo).
- Cada request protegido usa `Depends(get_current_active_user)` (`backend/app/api/deps.py`), que decodifica el JWT y busca el usuario por `sub` (el `user.id`).
- **IDOR:** todos los queries de listado/detalle filtran por `user_id` en el repository; nunca se confía en un ID recibido del cliente sin cruzarlo contra el usuario autenticado.

---

## 6. Decisiones que ya tomamos

1. **Arquitectura por capas estricta** (`api → service → repository → model`) en el backend, un servicio/repo por entidad principal salvo el caso de agregación (`DashboardService`, `FinanceSummaryService` combinan varias entidades a propósito). **No colapsar capas** ni meter lógica de negocio en los endpoints.
2. **IDs = UUID** en todas las tablas (no autoincrement), por seguridad (evita enumeración) y porque ya está así en el esquema completo desde la Fase 1. **No cambiar a IDs numéricos.**
3. **Esquema de base de datos completo diseñado en la Fase 1**, aunque los endpoints se implementan fase a fase. Esto significa: si una fase futura necesita una tabla que "ya existe" en `backend/app/models/`, **no crear una tabla nueva ni duplicar** — usar la que ya está (ej. `ShoppingList`/`ShoppingItem`/`ShoppingHistory` para la Fase 4, `Document`/`Vehicle`/`VehicleMaintenance` para la Fase 5, `Event` para la Fase 6, `Notification` para la Fase 8).
4. **Recuperación de contraseña por código de 6 dígitos**, NO por link con token. Esto fue un cambio explícito pedido por el usuario sobre el diseño original de la Fase 1 (que era un token en URL). Motivo: preferencia directa del usuario. **No revertir a link con token.**
5. **Categorías por usuario con seed inicial al registrarse** (`seed_default_categories` en `category_service.py`), en vez de categorías "del sistema" compartidas globalmente. Cada usuario nuevo recibe su propio set editable/borrable (Trabajo, Personal, Hogar, Salud, Estudio para tareas; Seguros, Documentos, Suscripciones, Servicios, Turnos para recordatorios; Sueldo, Freelance, Ventas, Otros para ingresos; Comida, Transporte, Vivienda, Servicios, Entretenimiento, Salud, Educación, Otros para gastos; Streaming, Software, Gimnasio, Internet, Almacenamiento, Otros para suscripciones).
6. **Recurrencia automática**: al marcar una tarea/recordatorio con `recurrence` diaria/semanal/mensual como completado, el sistema **crea automáticamente la siguiente ocurrencia** con la fecha avanzada (`backend/app/services/recurrence.py`), y el ítem original queda marcado como completado (historial). `custom` no auto-genera (ver sección 2).
7. **Dashboard configurable de verdad**: `UserSettings.dashboard_widgets` (array de strings: `today`, `finance_summary`, `upcoming_due`, `week_summary`, más `shopping` reservado para la Fase 4) controla qué tarjetas se muestran. El toggle vive en `SettingsPage`, cambios se guardan al toque (sin botón "guardar" aparte para los widgets).
8. **Sin librería de gráficos.** Los charts de Finanzas son SVG a mano siguiendo la skill `dataviz` cargada explícitamente: paleta categórica validada para daltonismo (colores fijos, ver `frontend/src/utils/chartColors.ts`), un solo eje Y (nunca dual-axis), leyenda siempre presente con ≥2 series, notación compacta en stat tiles (`formatCompactCurrency`, con el valor completo en `title=` del span para hover). **Si se agregan más gráficos, seguir el mismo patrón** (SVG propio + paleta de `chartColors.ts`), no instalar Recharts/Chart.js/etc. sin que el usuario lo pida.
9. **Estilo visual "SaaS moderno, no genérico"**: paleta neutra (slate) + un solo acento violeta (`brand-*`, definido en `index.css`), sin gradientes, sombras sutiles, sidebar en desktop + drawer en mobile, estados vacíos/carga/error en cada página, modales para crear/editar, `ConfirmDialog` para borrar. **Mantener esta identidad visual** en fases futuras — no introducir otra paleta ni otro sistema de componentes.
10. **Moneda por usuario configurable** (`UserSettings.currency`, default `USD`), y los formularios de Ingreso/Gasto/Suscripción toman esa moneda como default para movimientos nuevos (ver `defaultCurrency` prop en `TransactionFormModal` y `SubscriptionFormModal`) — **no hardcodear USD** en ningún componente nuevo.
11. **Sin over-engineering**: no se usó React Query/Redux/GraphQL, no hay capa de caché, fetch directo en `useEffect` + servicio axios, repetido conscientemente en cada página. El usuario pidió explícitamente "evitá sobreingeniería" y "priorizá mantenibilidad" — **mantener este nivel de simplicidad**, no introducir estas librerías salvo pedido explícito.
12. **Idioma**: toda la UI y los mensajes de error del backend están en **español** (Argentina, "vos"). Mantener ese tono/idioma en todo lo nuevo.
13. **Repo Git independiente** en `lifehub/`, separado del repo (probablemente accidental) que ya existía en la raíz de `Downloads`. **No mezclar con ese repo padre ni tocarlo.**

### Qué NO cambiar sin que el usuario lo pida
- El esquema de tablas ya migrado (agregar columnas/tablas nuevas está bien vía Alembic; no renombrar/borrar lo existente).
- El flujo de auth (JWT access + refresh persistido y revocable).
- El código de recuperación de contraseña por email (no volver a link con token).
- La arquitectura por capas del backend.
- La ausencia de librerías de estado/data-fetching pesadas en el frontend.

---

## 7. Código — fragmentos indispensables

### 7.1 Por qué `app/db/base.py` se importa en `main.py` (bug real que costó tiempo, Fase 1)

`backend/app/main.py` importa `app.db.base` explícitamente:

```python
from app.db.base import Base  # noqa: F401  (registra todos los modelos antes de configurar los mappers)
```

**Motivo:** SQLAlchemy resuelve relaciones declaradas por string (ej. `relationship("HouseholdMember", ...)`) de forma perezosa, la primera vez que se usa el mapper. Si `app/db/base.py` (que importa TODOS los modelos) nunca se importa en el proceso de la app real, un modelo como `HouseholdMember` puede no estar registrado todavía cuando `User` intenta resolver su relationship, y explota en producción con `InvalidRequestError` **aunque los tests pasen** (los tests sí importan `app.db.base` desde `conftest.py`). **Si se agrega un modelo nuevo con relationships, verificar que quede importado en `app/db/base.py`.**

### 7.2 Por qué existe `backend/app/core/logging.py`

Sin esto, cualquier `logger.info(...)` en el código (ej. el que loguea el código de recuperación de contraseña en desarrollo) se pierde en silencio porque el root logger de Python no tiene handlers por defecto:

```python
# backend/app/core/logging.py
def setup_logging() -> None:
    level = logging.DEBUG if settings.ENVIRONMENT == "development" else logging.INFO
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)-8s %(name)s: %(message)s", datefmt="%H:%M:%S")
    logging.getLogger("lifehub").setLevel(level)
```

Se llama una vez en `main.py` antes de crear la app. **Si algo deja de aparecer en `docker compose logs backend`, revisar que este setup siga corriendo.**

### 7.3 Bug del `<form>` anidado en `CategorySelect` (Fase 3, corregido)

`frontend/src/components/CategorySelect.tsx` se usa DENTRO de los `<form>` de Tarea/Recordatorio/Ingreso-Gasto/Suscripción para el selector de categoría con "+ Nueva categoría" inline. La primera versión renderizaba su propio `<form onSubmit={...}>` para el modo de creación inline — esto es **HTML inválido (form anidado)** y el evento `submit` del form interno burbujeaba y disparaba también el `onSubmit` del form externo, dejando la creación a medias **sin ningún POST real** (ni la categoría ni la transacción se guardaban, y el modal se cerraba solo). Solución aplicada — **nunca usar un `<form>` propio ahí, solo `<div>` + botones con `onClick`**:

```tsx
// frontend/src/components/CategorySelect.tsx (fragmento relevante)
async function handleCreate() {
  if (!newName.trim()) return
  setIsSubmitting(true)
  try {
    const created = await onCreate(newName.trim())
    onChange(created.id)
    setIsCreating(false)
    setNewName("")
  } finally {
    setIsSubmitting(false)
  }
}
// ...
if (isCreating) {
  return (
    <div className="flex flex-col gap-2">  {/* <- div, NO <form> */}
      <Input label="Nueva categoría" autoFocus value={newName} onChange={...} onKeyDown={handleKeyDown} />
      <div className="flex gap-2">
        <Button type="button" onClick={() => void handleCreate()}>Crear</Button>
        <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancelar</Button>
      </div>
    </div>
  )
}
```

**Regla general para código nuevo:** cualquier control con su propia acción de "crear/confirmar" que viva dentro de un formulario más grande debe usar `<div>` + botón `type="button"` con `onClick`, nunca un `<form>` anidado.

### 7.4 Enum de Postgres — cómo se agregó `CategoryType.REMINDER`

Alembic `--autogenerate` **no detecta** altas de valores en un `ENUM` nativo de Postgres. Cuando se agregó `REMINDER` a `CategoryType` (backend/app/models/enums.py), la migración se escribió a mano:

```python
# backend/alembic/versions/39c2e9c87f49_add_reminder_category_type.py
def upgrade() -> None:
    op.execute("ALTER TYPE category_type ADD VALUE IF NOT EXISTS 'reminder'")

def downgrade() -> None:
    pass  # Postgres no permite quitar un valor de un enum sin recrear el tipo
```

**Si se agrega un nuevo valor a cualquier `enum.Enum` usado en un modelo (`CategoryType`, `TaskStatus`, `Priority`, etc.), hay que escribir esta migración a mano** — `alembic revision --autogenerate` va a generar un archivo vacío (`upgrade(): pass`) que hay que editar.

### 7.5 Cálculo de estimado mensual/anual de suscripciones

`backend/app/services/subscription_service.py` — normaliza cualquier frecuencia a un estimado comparable:

```python
_MONTHLY_FACTOR = {
    SubscriptionFrequency.WEEKLY: Decimal("52") / Decimal("12"),
    SubscriptionFrequency.MONTHLY: Decimal("1"),
    SubscriptionFrequency.YEARLY: Decimal("1") / Decimal("12"),
}
_ANNUAL_FACTOR = {
    SubscriptionFrequency.WEEKLY: Decimal("52"),
    SubscriptionFrequency.MONTHLY: Decimal("12"),
    SubscriptionFrequency.YEARLY: Decimal("1"),
}
```

Solo suma suscripciones con `is_active=True`. Redondeo con `ROUND_HALF_UP` a centavos.

---

## 8. Base de datos

**20 tablas**, todas creadas en la migración inicial `567e2b7bfb30_initial_schema.py`. Todas usan `UUIDMixin` (PK `id: UUID`) y `TimestampMixin` (`created_at`, `updated_at`) de `backend/app/models/mixins.py`.

| Tabla | Modelo (archivo) | Estado de implementación | Campos clave |
|---|---|---|---|
| `users` | `models/user.py` | ✅ Completo | email (unique), hashed_password, full_name, avatar_url, is_active, is_verified, onboarding_completed |
| `refresh_tokens` | `models/auth_token.py` | ✅ Completo | user_id, token_hash (SHA-256, unique), expires_at, revoked |
| `password_reset_tokens` | `models/auth_token.py` | ✅ Completo | user_id, token_hash, expires_at, used, **attempts** (int, límite 5) |
| `user_settings` | `models/user_settings.py` | ✅ Completo | user_id (unique), language, currency, timezone, theme, enabled_modules (array), dashboard_widgets (array), notification_preferences (JSONB), ai_data_access_enabled |
| `categories` | `models/category.py` | ✅ Completo | user_id (nullable = categoría de sistema, no usado actualmente), type (CategoryType), name, color, icon, is_system |
| `households` | `models/household.py` | ⚠️ Modelo existe, sin servicio/endpoint/UI | name, owner_id |
| `household_members` | `models/household.py` | ⚠️ Modelo existe, sin servicio/endpoint/UI | household_id, user_id, role (owner/member), unique(household_id, user_id) |
| `tasks` | `models/task.py` | ✅ Completo | user_id, household_id (nullable), category_id, title, description, due_date (datetime), priority, status, recurrence, recurrence_rule, tags (array) |
| `reminders` | `models/reminder.py` | ✅ Completo | user_id, category_id, name, description, due_date (**date**, no datetime), priority, recurrence, advance_notice_days (array int, default [30,7,1]), is_completed |
| `events` | `models/event.py` | ⚠️ Modelo existe, sin servicio/endpoint/UI (Fase 6) | user_id, household_id, category_id, title, description, start_at, end_at, all_day, location |
| `incomes` | `models/finance.py` | ✅ Completo | user_id, category_id, amount (Numeric 12,2), currency, date, description, payment_method |
| `expenses` | `models/finance.py` | ✅ Completo | igual que incomes |
| `subscriptions` | `models/subscription.py` | ✅ Completo | user_id, category_id, name, price, currency, frequency (weekly/monthly/yearly), next_billing_date, payment_method, is_active |
| `shopping_lists` | `models/shopping.py` | ⚠️ Modelo existe, sin servicio/endpoint/UI (Fase 4) | user_id, household_id, name |
| `shopping_items` | `models/shopping.py` | ⚠️ ídem | shopping_list_id, category_id, name, quantity, unit, notes, is_purchased, purchased_at |
| `shopping_history` | `models/shopping.py` | ⚠️ ídem | user_id, item_name, purchased_at — pensada para calcular frecuencia de recompra |
| `documents` | `models/document.py` | ⚠️ Modelo existe, sin servicio/endpoint/UI (Fase 5) | user_id, name, category (DocumentCategory), expiry_date, notes, storage_key, file_name, file_size, mime_type |
| `vehicles` | `models/vehicle.py` | ⚠️ ídem | user_id, brand, model, year, license_plate, mileage |
| `vehicle_maintenance` | `models/vehicle.py` | ⚠️ ídem | vehicle_id, type, description, date, mileage_at_service, cost, next_due_date, next_due_mileage |
| `notifications` | `models/notification.py` | ⚠️ Modelo existe, sin lógica de disparo (Fase 8) | user_id, type, channel, title, message, is_read, related_entity_type/id, scheduled_for, sent_at |

**Enums nativos de Postgres** (todos en `backend/app/models/enums.py`): `TaskStatus`, `Priority`, `RecurrenceType`, `PaymentMethod`, `SubscriptionFrequency`, `NotificationChannel`, `NotificationType`, `HouseholdRole`, `CategoryType`, `DocumentCategory`, `VehicleMaintenanceType` — valores exactos en la sección de código ya listados arriba (sección de verificación previa a este documento).

**Migraciones aplicadas** (en orden): `567e2b7bfb30` (esquema inicial) → `7b71c7086eaa` (agrega `attempts` a `password_reset_tokens`) → `39c2e9c87f49` (agrega `'reminder'` al enum `category_type`, ALTER TYPE manual).

**Datos iniciales:** no hay seed global. Lo único automático es `seed_default_categories()` al registrar un usuario nuevo (ver sección 6, punto 5).

**Consultas importantes:**
- `backend/app/services/finance_summary_service.py` — `GROUP BY category_id` con `outerjoin` a `Category` para el desglose de gastos por categoría; loop de 6 meses con `month_bounds()`/`shift_month()` (`backend/app/services/date_utils.py`) para la evolución.
- `backend/app/services/dashboard_service.py` — agrega counts de tareas (hoy/vencidas/pendientes), recordatorios próximos (`limit(5)`), tareas de la semana (`limit(10)`, acotado a `>= today_start` para no repetir vencidas — bug corregido en Fase 3), más el resumen financiero y de suscripciones.

---

## 9. Configuración

### Variables de entorno (`.env`, no versionado — copiar de `.env.example`)

```
ENVIRONMENT=development
SECRET_KEY=<generar con: python -c "import secrets; print(secrets.token_urlsafe(64))">
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30
POSTGRES_USER=lifehub
POSTGRES_PASSWORD=lifehub
POSTGRES_DB=lifehub
POSTGRES_HOST=db
POSTGRES_PORT=5432
BACKEND_CORS_ORIGINS=["http://localhost:5173"]
OPENAI_API_KEY=            # opcional, Fase 7
VITE_API_URL=http://localhost:8000/api
```

El `.env` real de esta máquina **ya existe** en `lifehub/.env` con un `SECRET_KEY` generado — no hace falta recrearlo salvo que se haya perdido.

### Puertos
- Backend: `8000` (`http://localhost:8000`, Swagger en `/api/docs`)
- Frontend: `5173` (`http://localhost:5173`)
- PostgreSQL: `5432`

### Comandos

**⚠️ Antes que nada: Docker Desktop está apagado en esta máquina al momento de escribir esto.** Hay que arrancarlo primero. En Windows, si no abre desde el acceso directo:
```bash
powershell -Command "Start-Process 'C:\Users\Larita\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe'"
```
Esperar a que el daemon responda (`docker info`) antes de seguir.

**Levantar todo:**
```bash
cd "C:\Users\Larita\Downloads\lifehub"
docker compose up -d
```
El backend corre `alembic upgrade head` automáticamente al arrancar (definido en el `command` del servicio `backend` en `docker-compose.yml`).

**Tests backend:**
```bash
docker compose exec backend pytest -v
```

**Generar una migración nueva tras cambiar un modelo:**
```bash
docker compose exec backend alembic revision --autogenerate -m "descripcion"
docker compose exec backend alembic upgrade head
```
⚠️ Revisar el archivo generado antes de aplicarlo — recordar el caso de los enums (sección 7.4), que requiere edición manual.

**Type-check y lint frontend:**
```bash
docker compose exec frontend npx tsc -b
docker compose exec frontend npx oxlint
```

**No hay Python ni Node instalados localmente fuera de Docker en esta máquina** (Python: solo el stub de Microsoft Store; Node sí está disponible globalmente y se usó puntualmente para `npm create vite`, pero el flujo normal de trabajo es todo dentro de contenedores).

### Configuraciones especiales
- El backend corre con `--reload` (uvicorn) montado por volumen (`./backend:/app`), así que los cambios de código en `backend/` se reflejan solos sin rebuildear la imagen.
- El frontend igual, con `npm run dev -- --host 0.0.0.0` y volumen montado (`./frontend:/app`), `node_modules` en un volumen Docker aparte para no pisarlo con el host.
- CORS restringido a `http://localhost:5173` vía `BACKEND_CORS_ORIGINS`.

---

## 10. Problemas y errores — qué pasó y qué funcionó

| # | Problema | Causa | Solución que funcionó |
|---|---|---|---|
| 1 | `InvalidRequestError: ... HouseholdMember is not defined` al usar la app real (pero tests pasaban) | `app/main.py` no importaba `app/db/base.py`, entonces no todos los modelos estaban registrados cuando SQLAlchemy resolvía relationships por string | Importar `app.db.base` en `main.py` (ver 7.1) |
| 2 | Error de CORS en el navegador al registrar con datos inválidos | El handler de `RequestValidationError` devolvía `exc.errors()` crudo, que puede tener objetos no serializables (`ctx`) → `json.dumps` fallaba → 500 sin pasar por el middleware de CORS → el navegador lo reportaba como error de CORS en vez de 422 | Filtrar la clave `ctx` de cada error y pasar el resto por `jsonable_encoder` antes de armar el `JSONResponse` (`backend/app/middleware/error_handler.py`) |
| 3 | El formulario de login/registro perdía el mensaje de error y lo tipeado al fallar | `authStore.login/register` ponía `status: "loading"` durante el request, y `PublicOnlyRoute` reemplazaba TODO el contenido por un spinner mientras `status === "loading"`, desmontando el formulario | Sacar el `set({status: "loading"})` de `login`/`register` en `authStore.ts` — el spinner de carga del botón ya lo maneja el estado local `isSubmitting` de cada página, no hace falta tocar el estado global de auth |
| 4 | Los `logger.info(...)` (ej. código de recuperación de contraseña) no aparecían nunca en los logs | El root logger de Python no tiene handlers por defecto sin `logging.basicConfig()` | `backend/app/core/logging.py` (ver 7.2), llamado en `main.py` |
| 5 | Fechas de recordatorios (`YYYY-MM-DD`, sin hora) se mostraban un día antes en el frontend | `new Date("2026-10-20")` se interpreta como medianoche UTC; en husos horarios negativos, `toLocaleDateString` la muestra un día antes | En `frontend/src/utils/taskMeta.ts`, `formatDate()` fuerza medianoche **local** agregando `T00:00:00` cuando el string tiene longitud 10 (solo fecha, sin hora) |
| 6 | Al completar una tarea/gasto usando "+ Nueva categoría" inline, no se creaba nada y el modal se cerraba solo | `<form>` anidado en `CategorySelect` dentro del `<form>` del modal — evento `submit` burbujeaba (ver 7.3) | Reemplazar el `<form>` interno por `<div>` + botones `type="button"` con `onClick` |
| 7 | "Resumen semanal" del dashboard mostraba tareas ya vencidas mezcladas con las próximas | La query de `week_tasks` en `DashboardService` no tenía cota inferior de fecha | Agregar `Task.due_date >= today_start` a la query (antes solo tenía `< week_end`) |
| 8 | Alembic autogenerate no detectaba el nuevo valor `'reminder'` en el enum `category_type` | Limitación conocida de Alembic con enums nativos de Postgres | Migración escrita a mano con `op.execute("ALTER TYPE category_type ADD VALUE IF NOT EXISTS 'reminder'")` (ver 7.4) |

**Qué NO funcionó / se descartó:**
- Confiar en que Alembic `--autogenerate` detecte cambios de enum — no lo hace, siempre hay que revisar el diff generado.
- Poner el estado de "cargando" del login/register en el store global de auth — rompe el UX de error (ver problema #3).

---

## 11. Próximos pasos

Orden sugerido (retomando el plan de fases original del usuario):

1. **Fase 4 — Compras y Hogar** (siguiente fase, no empezada):
   - Backend: `ShoppingListService`/`ShoppingItemService` (o un service combinado), endpoints `/api/shopping/lists`, `/api/shopping/lists/{id}/items`, marcar comprado, y lógica de **historial de compras** (`ShoppingHistory`) para estimar frecuencia de recompra ("Probablemente necesites comprar leche próximamente" — presentado como sugerencia, no afirmación, según el pedido original).
   - Hogar: permitir asignar tareas a miembros — esto toca `households`/`household_members`, que hoy son modelos sin servicio. Definir si Hogar en la Fase 4 ya implica invitar usuarios reales (multi-usuario) o si por ahora es solo "tareas del hogar" de un único usuario con el modelo de households preparado pero no expuesto todavía. **[NO DEFINIDO — decidir con el usuario si hace falta.]**
   - Frontend: `ShoppingListPage`, ítem con checkbox de comprado, historial visual, sugerencias de recompra.
2. **Fase 5 — Documentos y Vehículos**: subida de archivos privados (definir almacenamiento: filesystem local en volumen Docker vs. S3-compatible — **[NO DEFINIDO]**, el modelo `Document` ya tiene `storage_key` genérico pensado para esto), vencimientos de documentos y de mantenimiento de vehículos integrados al dashboard de "próximos vencimientos" (hoy ese widget solo lee `Reminder`, habría que unificar o agregar estas fuentes).
3. **Fase 6 — Calendario**: vista mensual/semanal/diaria que junte `Task.due_date`, `Reminder.due_date`, `Event`, pagos/suscripciones.
4. **Fase 7 — IA**: capa de servicio separada (ya se dejó `OPENAI_API_KEY` preparado en config), que solo use datos que el usuario autorice explícitamente.
5. **Fase 8 — Notificaciones**: conectar `advance_notice_days` de `Reminder` y `scheduled_for` de `Notification` a un disparador real (requiere definir: ¿cron/worker dentro del mismo contenedor, o un servicio aparte tipo Celery/APScheduler? **[NO DEFINIDO]**).
6. **Fase 9 — UX/UI avanzado**: **activar el dark mode real** (ver problema pendiente #1) es la tarea más concreta y de mayor impacto visual aquí; también accesibilidad por teclado y auditoría responsive fina.
7. **Fase 10 — Testing**: escribir tests de frontend (la infra ya está instalada, ver problema pendiente #2), ampliar cobertura de seguridad.
8. **Fase 11 — Producción**: publicar el repo en GitHub (hoy no tiene remoto), README con screenshots, checklist de producción.

---

## 12. Instrucciones para el próximo Claude

- **Trabajá por fases**, igual que hasta ahora: no generes todo de una vez. Al terminar una fase (o un pedido puntual), ejecutá el proyecto, corré los tests de backend (`docker compose exec backend pytest -v`), corré `tsc -b` y `oxlint` en el frontend, y **probá el flujo en el navegador real** (Browser pane) antes de dar algo por terminado — varios de los bugs reales de este proyecto (sección 10) solo aparecieron probando en navegador, no con los tests automáticos.
- **Docker Desktop puede estar apagado** al arrancar la sesión — arrancalo primero (sección 9) antes de intentar `docker compose up`.
- **Mantené el estilo de código existente**: arquitectura por capas en el backend (no metas lógica de negocio en los endpoints), patrón `Page + *FormModal + *Item` por módulo en el frontend, comentarios solo cuando expliquen un "por qué" no obvio (el codebase ya sigue esta convención — ver ejemplos en `db/base.py`, `CategorySelect.tsx`, `recurrence.py`).
- **Respetá las decisiones de la sección 6**, en particular: no cambiar el esquema de auth, no volver a link-con-token para recuperar contraseña, no usar IDs numéricos, no traer librerías de gráficos/estado pesadas sin que el usuario lo pida, no introducir otra paleta de colores.
- **Antes de crear una tabla nueva, revisá si ya existe** en `backend/app/models/` — el esquema completo de 20 tablas ya está diseñado desde la Fase 1 (sección 8).
- **Si agregás un valor nuevo a un `enum.Enum` de un modelo**, escribí la migración de Alembic a mano (sección 7.4) — el autogenerate no lo detecta.
- **Si agregás un modelo nuevo con `relationship()`**, asegurate de importarlo en `backend/app/db/base.py` (sección 7.1).
- **Toda la UI y los mensajes de error van en español** (tono "vos", Argentina).
- **No toques el repo Git de la raíz de `Downloads`** (el padre de `lifehub/`) — `lifehub/` tiene su propio repo independiente, sin remoto configurado todavía.
- Los commits de git deben terminar con `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` (instrucción de sistema vigente en este entorno).
- Si algo del pedido del usuario no está claro o falta una decisión de producto (ej. los puntos marcados `[NO DEFINIDO]` en la sección 11), **preguntá antes de asumir**, tal como se hizo hasta ahora con decisiones de producto importantes.

---

## PRÓXIMA ACCIÓN

1. Confirmar que Docker Desktop esté corriendo (`docker info`); si no, arrancarlo (sección 9) y esperar.
2. `cd "C:\Users\Larita\Downloads\lifehub" && docker compose up -d`
3. Verificar que todo sigue sano: `docker compose exec backend pytest -q` (debería dar **45 passed**) y abrir `http://localhost:5173` en el navegador para confirmar que carga el login.
4. Empezar la **Fase 4 (Compras y Hogar)**: antes de escribir código, confirmar con el usuario el punto `[NO DEFINIDO]` de la sección 11 sobre el alcance de "Hogar" (¿multi-usuario real en esta fase, o solo tareas del hogar de un usuario por ahora?). Luego seguir el mismo patrón ya establecido: modelos ya existen → schemas → repository → service → endpoints → tests de backend → tipos/servicios/páginas de frontend → probar en navegador → commit.
