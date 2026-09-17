# Correcciones aplicadas tras la auditoría

> Complementa [`AUDITORIA.md`](AUDITORIA.md). Documenta qué se corrigió en esta sesión, cómo, y qué se verificó después de cada cambio. Orden: seguridad/críticos primero, después funcionales, después el resto — tal como se planteó en la sección 11 de la auditoría.

> **Actualizado tras la segunda ronda** (ver sección 6 al final): se completaron los pendientes que quedaban documentados como "no implementado en esta pasada" — email real por SMTP, validaciones de esquema, límite defensivo en listados, mapeo de errores 422 por campo, accesibilidad y performance del frontend.

Verificación final (todo corrido dentro de los contenedores Docker reales, no solo lectura de código):
- **Backend: 135/135 tests** (`pytest`) — incluye los 6 de la primera ronda (lockout de login, revocación de sesión, allowlist de documentos, guardrail de `SECRET_KEY`) más 10 nuevos de la segunda ronda (email por SMTP, validadores de fecha cruzada, formato de color/moneda, patente única, mensaje de error limpio).
- **Frontend: 80/80 tests** (`vitest`) — incluye 8 tests nuevos de `extractFieldErrors`/`extractErrorMessage` y del nuevo `role="alert"` en toasts de error. **`tsc -b` limpio**, **`oxlint` 0 errores** (18 warnings preexistentes, mismo patrón ya conocido).
- Se construyeron y probaron **manualmente las imágenes de producción** (`docker build --target prod` del backend, `Dockerfile.prod` del frontend) — no solo las de desarrollo — confirmando: usuario no-root en ambas, arranque correcto del backend sin las dependencias de test, y los 5 headers de seguridad presentes en las respuestas reales de nginx.
- Prueba manual en navegador (dos rondas): registro, login, Dashboard y Finanzas con datos reales; formulario de evento con fecha de fin anterior al inicio mostrando el mensaje de validación limpio; panel de notificaciones con `role="dialog"` confirmado en el árbol de accesibilidad real. Sin errores de consola en una pestaña nueva (se verificó explícitamente para descartar falsos positivos de HMR de Vite).

---

## 1. Seguridad — Críticos/Altos (S1-S8)

### S1/S5 — Bloqueo de cuenta tras intentos de login fallidos
- **Archivos**: [`backend/app/models/user.py`](backend/app/models/user.py) (campos `failed_login_attempts`, `locked_until`), migración [`e5a2c9f1b4d3`](backend/alembic/versions/e5a2c9f1b4d3_add_login_lockout_to_users.py), [`backend/app/services/auth_service.py`](backend/app/services/auth_service.py) (`authenticate`).
- **Qué hace**: tras 5 intentos fallidos consecutivos, la cuenta queda bloqueada 15 minutos (`423 Locked`), mismo patrón que ya existía para el código de reset de contraseña. El contador se resetea en un login exitoso.
- **Tests nuevos**: `test_login_locks_after_too_many_failed_attempts`, `test_login_resets_failed_attempts_after_success` en `backend/tests/test_auth.py`.
- **Pendiente/no incluido**: rate limiting por IP (más allá del bloqueo por cuenta) — requeriría infra adicional (Redis) para ser consistente entre los 4 workers de producción; el bloqueo por cuenta ya cubre el escenario de fuerza bruta contra una cuenta puntual.

### S2 — Guardrail contra `SECRET_KEY`/credenciales inseguras en producción
- **Archivo**: [`backend/app/core/config.py`](backend/app/core/config.py) (`Settings.model_post_init`).
- **Qué hace**: si `ENVIRONMENT=production`, la app rechaza arrancar (`ValueError` en el import de `config.py`) si `SECRET_KEY` es el placeholder de `.env.example` o tiene menos de 32 caracteres, o si `POSTGRES_PASSWORD`/`S3_ACCESS_KEY`/`S3_SECRET_KEY` siguen en su valor default de desarrollo. En `development` no se aplica (no rompe el flujo local).
- **Tests nuevos**: `backend/tests/test_config.py` (6 tests: rechaza cada credencial débil individualmente, acepta credenciales válidas, no aplica en development).

### S3 — Credenciales default débiles en `docker-compose.prod.yml`
- **Archivo**: [`docker-compose.prod.yml`](docker-compose.prod.yml).
- **Qué hace**: se quitaron los fallbacks `${VAR:-lifehub}` de `POSTGRES_PASSWORD`/`POSTGRES_USER`/`POSTGRES_DB`/`S3_ACCESS_KEY`/`S3_SECRET_KEY`; ahora usan `${VAR:?mensaje}`, que hace fallar el `docker compose up` con un error explícito si el `.env` de producción no las define, en vez de degradar en silencio a una credencial conocida.
- **Verificado**: `docker compose -f docker-compose.prod.yml config` valida sin errores con el `.env` actual (que sí define esas variables).

### S4/S24 — Headers de seguridad en nginx (producción)
- **Archivos**: [`frontend/nginx.conf.template`](frontend/nginx.conf.template) (nuevo, reemplaza a `nginx.conf`), [`frontend/Dockerfile.prod`](frontend/Dockerfile.prod).
- **Qué hace**: agrega `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` y una `Content-Security-Policy` (`default-src 'self'`, sin scripts/estilos inline salvo el `style-src 'unsafe-inline'` que necesita Tailwind, `connect-src` restringido al origen de la API). También agrega `Cache-Control: no-cache` a `index.html` (evita servir referencias a assets viejos tras un deploy).
- **Detalle técnico importante encontrado y corregido durante la verificación**: nginx **no hereda** `add_header` de un nivel superior en un `location` que define su propio `add_header` (gotcha clásico) — los primeros headers que agregué en el bloque `server` no llegaban a las respuestas reales porque `location /` y `location /assets/` ya tenían su propio `Cache-Control`. Se repitieron los headers de seguridad dentro de cada `location`. **Esto se detectó recién al levantar la imagen real y curlear las respuestas**, no habría aparecido con una revisión solo de código — confirma la importancia de probar en vivo, no solo leer.
- **API_ORIGIN**: la CSP necesita saber el origen del backend para `connect-src`. Se resuelve en runtime vía `envsubst` (mecanismo nativo de la imagen oficial de nginx sobre archivos en `/etc/nginx/templates/`), configurable con la env var `API_ORIGIN` (agregada a `.env.example` y a `docker-compose.prod.yml`).
- **Verificado en vivo**: build de la imagen de producción real, contenedor corriendo, `curl -I` mostrando los 5 headers en `/` y en `/assets/*`.

### S6 — Contenedores corriendo como root
- **Backend** ([`backend/Dockerfile`](backend/Dockerfile)): reescrito como multi-stage (`builder` → `dev`/`prod`). El stage `prod` (el que se despliega, ver `docker-compose.prod.yml`) crea un usuario `appuser` no-root y corre la app con él; no incluye `gcc`/`libpq-dev` (solo quedan en el stage `builder`, que nunca llega a la imagen final).
- **Frontend producción** ([`frontend/Dockerfile.prod`](frontend/Dockerfile.prod)): cambiado de `nginx:1.27-alpine` a `nginxinc/nginx-unprivileged:1.27-alpine` (misma imagen oficial, pero pensada para correr sin root). Requirió cambiar el puerto interno de escucha de 80 a 8080 (ver detalle en S4) y actualizar el mapeo de puertos en `docker-compose.prod.yml` (`"80:8080"`).
- **Frontend desarrollo** ([`frontend/Dockerfile`](frontend/Dockerfile)): se dejó corriendo como root **a propósito** — el bind mount de `docker-compose.yml` sobre `/app` puede generar problemas de permisos con un usuario no-root en bind mounts de Windows (el host de este proyecto), y es la imagen de desarrollo, no la que se despliega. Se documentó la razón en el propio Dockerfile. Sí se corrigió `npm install` → `npm ci` ahí (reproducibilidad).
- **Verificado en vivo**: `docker run --rm <imagen> whoami` → `appuser` (backend) / `nginx` (frontend prod), en ambos casos no-root.

### S7 — Sin CI
- **Archivo nuevo**: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
- **Qué hace**: en cada push/PR a `master`, corre `pytest` del backend (contra un Postgres real como servicio de GitHub Actions) y `tsc -b` + `oxlint` + `vitest` del frontend. Es un piso mínimo, no un pipeline de deploy.
- **No verificado en esta sesión**: no se puede ejecutar un workflow de GitHub Actions localmente; su sintaxis sigue el formato estándar de `actions/checkout`+`actions/setup-python`+`actions/setup-node`, pero recomendamos confirmar que corre bien la primera vez que se pushee.

### S8 — `EmailService` placeholder
- No se tocó código: es una decisión de producto (conectar un proveedor real de email), no un bug. Sigue en el checklist de producción de `AUDITORIA.md` y del propio `README.md`.

---

## 2. Seguridad — Medios (S9, S11, S12, S13, S14, S15)

### S9 — Reuso de refresh token ahora revoca toda la sesión
- **Archivo**: [`backend/app/services/auth_service.py`](backend/app/services/auth_service.py) (`refresh`).
- **Qué hace**: si se presenta un refresh token que ya fue rotado (`revoked=True`), se interpreta como señal de robo y se revocan **todos** los refresh tokens activos de ese usuario, no solo el reusado.
- **Test nuevo**: `test_refresh_token_reuse_revokes_all_sessions` — verifica que una segunda sesión legítima e independiente también queda invalidada tras detectarse el reuso.

### S11/S12 — Upload de documentos: límite en streaming + allowlist de extensión
- **Archivo**: [`backend/app/services/document_service.py`](backend/app/services/document_service.py).
- **Qué hace**: (1) el archivo se lee en chunks de 1MB y se corta apenas se supera `MAX_UPLOAD_SIZE_MB`, en vez de bufferear todo el archivo en memoria antes de recién ahí rechazarlo; (2) se agregó un allowlist de extensiones razonables para documentos personales (pdf, imágenes, office, texto) — cualquier otra extensión devuelve `415`.
- **Test nuevo**: `test_upload_rejects_disallowed_extension` en `backend/tests/test_documents.py`.

### S13 — Emails de notificación duplicados tras rollback parcial
- **Archivo**: [`backend/app/services/notification_dispatch_service.py`](backend/app/services/notification_dispatch_service.py).
- **Qué hace**: se commitea por entidad (justo después de crear las filas de notificación, antes de mandar el email) en vez de un único commit al final de las 4 fases del dispatcher. Así, si una entidad posterior tira una excepción, el rollback ya no revierte notificaciones cuyo email real ya se había enviado.

### S14 — Dependencias de test en la imagen de producción
- **Archivos**: [`backend/requirements.txt`](backend/requirements.txt) (ahora solo prod), [`backend/requirements-dev.txt`](backend/requirements-dev.txt) (nuevo, `-r requirements.txt` + pytest/pytest-cov/httpx), `backend/Dockerfile` (stage `prod` instala solo `requirements.txt`; stage `dev` instala `requirements-dev.txt`).

### S15/D2 — Índices faltantes en foreign keys
- **Archivos**: `backend/app/models/{event,finance,reminder,subscription,task,shopping}.py` (`index=True` agregado a `category_id`; `Task.assigned_to_id` también), migración [`f1c6d8a02e7b`](backend/alembic/versions/f1c6d8a02e7b_add_missing_fk_indexes.py).

---

## 3. Errores funcionales (F1-F4)

### F1/F2 — Dashboard y Finanzas quedaban en blanco ante un error de carga
- **Archivos**: [`frontend/src/pages/dashboard/DashboardPage.tsx`](frontend/src/pages/dashboard/DashboardPage.tsx), [`frontend/src/pages/finance/FinancePage.tsx`](frontend/src/pages/finance/FinancePage.tsx).
- **Qué hace**: ambas páginas ahora capturan el error de la carga inicial y muestran un mensaje claro + botón "Reintentar", siguiendo el mismo patrón ya usado en Tareas/Compras/Documentos (`error` state + `extractErrorMessage`).
- **Verificado**: build/tests pasan; probado manualmente en navegador con datos reales (no se pudo simular fácilmente una falla de red real en esta sesión, pero el código sigue exactamente el patrón ya probado en las otras páginas).

### F3 — Handlers de mutación sin manejo de error
- **Archivos**: [`frontend/src/pages/shopping/ShoppingPage.tsx`](frontend/src/pages/shopping/ShoppingPage.tsx) (`handleAddSuggestion`, `handleToggleItem`, `handleDeleteItem`), [`frontend/src/pages/tasks/TasksPage.tsx`](frontend/src/pages/tasks/TasksPage.tsx) (`handleSetInProgress`).
- **Qué hace**: se agregó `try/catch` + `toast.error(...)` a cada uno, igual que ya tenían sus handlers "hermanos" en el mismo archivo.

### F4 — Ver S13 (mismo hallazgo, sección de errores funcionales y de seguridad se solapan).

### F5 — `Task.assigned_to_id` huérfano al expulsar/abandonar un miembro
- **No corregido en esta sesión**: ya estaba documentado como decisión consciente de alcance en `HANDOFF.md`. Queda para una fase aparte si se decide resolverlo (limpiar `assigned_to_id` en `HouseholdService.remove_member`/`leave`).

---

## 4. Qué quedó pendiente (no se tocó en esta sesión)

(Resuelto en la segunda ronda — ver sección 6 — todo lo que decía "no implementado" acá excepto los dos ítems que siguen siendo decisiones de arquitectura/alcance deliberadas):

- **S10 — Política de contraseñas contra filtraciones conocidas**: sigue sin implementarse. Requiere una lista de contraseñas comunes o una API externa (ej. Have I Been Pwned); no se agregó una dependencia nueva ni una llamada de red en el flujo de auth sin discutirlo primero.
- **Mover tokens a cookies `httpOnly`**: sigue sin implementarse. Cambio de arquitectura con implicancias de CSRF que requiere diseño propio; se mitigó el riesgo principal (exfiltración vía XSS) con la CSP (S4), que es la protección de mayor impacto por menor esfuerzo/riesgo de romper el login actual.
- **S16 — Paginación real (con `limit`/`offset` en la API y UI de paginado)**: sigue sin implementarse — se aplicó en cambio un límite defensivo (`.limit(1000)`) en los repositorios de listado como mitigación de bajo riesgo (ver sección 6). La paginación real de punta a punta queda pendiente para cuando el volumen de datos lo justifique.

---

## 5. Resultado de tests después de todas las correcciones

```
Backend:  135 passed  (pytest, dentro del contenedor)
Frontend:  80 passed  (vitest, dentro del contenedor)
tsc -b:    sin errores
oxlint:    0 errores, 18 warnings (preexistentes, mismo patrón conocido)
```

Build de producción verificado manualmente (no forma parte de la suite automática):
```
docker build --target prod ./backend        → OK, corre como appuser, falla cerrado sin SECRET_KEY
docker build -f frontend/Dockerfile.prod .   → OK, corre como nginx (no-root), headers de seguridad confirmados con curl
```

---

## 6. Segunda ronda — pendientes hacia producción

Continuación pedida explícitamente por el usuario ("continuá con los pendientes, que quede lista para usar"). Mismo criterio: verificar cada cambio con tests reales, no solo lectura de código.

### Email real por SMTP (bloqueante de producción más importante que quedaba)
- **Archivos**: [`backend/app/services/email_service.py`](backend/app/services/email_service.py) (reescrito), [`backend/app/core/config.py`](backend/app/core/config.py) (`SMTP_*`), `.env.example`.
- **Qué hace**: si `SMTP_HOST` está configurado, manda emails de verdad por SMTP (sirve para Gmail, SES, Postmark, Mailgun, cualquier proveedor SMTP estándar — sin agregar un SDK de proveedor específico). Si no está configurado, sigue cayendo a solo loguear, igual que antes — no rompe el flujo de desarrollo. También sanea el `Subject` contra inyección de headers (`\r`/`\n`), cerrando el hallazgo de la auditoría sobre `household.name` sin sanitizar en el asunto del email de invitación.
- **Tests nuevos**: `backend/tests/test_email_service.py` (5 tests: fallback a log, saneo de header injection, envío real vía SMTP mockeado, password reset).
- **Pendiente real**: para que mande emails de verdad en producción, alguien tiene que configurar `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` con un proveedor real en el `.env` — esto es configuración de despliegue, no algo que el código pueda resolver por sí solo.

### Validaciones de esquema que faltaban
- **Fechas cruzadas**: `EventBase`/`EventUpdate` (fin no puede ser antes que el inicio) y `VehicleMaintenanceBase`/`Update` (próximo vencimiento no puede ser antes que la fecha del servicio) — [`backend/app/schemas/event.py`](backend/app/schemas/event.py), [`backend/app/schemas/vehicle.py`](backend/app/schemas/vehicle.py).
- **Formato de `Category.color`**: ahora exige `#RRGGBB` — [`backend/app/schemas/category.py`](backend/app/schemas/category.py).
- **Formato de `currency`**: ahora exige 3 letras mayúsculas (`^[A-Z]{3}$`) en vez de solo `max_length=3` — `finance.py`, `subscription.py`, `settings.py`. Verificado que el frontend nunca mandaba un valor libre acá (siempre sale de un `<select>` con códigos fijos), así que no había riesgo de romper el flujo real.
- **Límite de longitud en texto libre**: `description`/`notes` ahora tienen `max_length=2000` en `task.py`, `event.py`, `reminder.py`, `document.py`, `shopping.py`, `vehicle.py` (antes no tenían límite).
- **`Reminder.advance_notice_days`**: cada valor ahora debe estar entre 0 y 365 días (antes cualquier entero, incluso negativo, pasaba).
- **`Vehicle.license_plate` único por usuario**: constraint `UniqueConstraint("user_id", "license_plate")`, migración [`a9d3f7c1e6b2`](backend/alembic/versions/a9d3f7c1e6b2_add_unique_vehicle_license_plate.py). `NULL` sigue permitiendo múltiples vehículos sin patente cargada.
- **Mensaje de error limpio**: se descubrió **probando en navegador real** (no en los tests automáticos) que los errores de los validadores cruzados (`@model_validator`) le llegaban al usuario con el prefijo interno de Pydantic "Value error, " antepuesto (ej. "Value error, La fecha de fin no puede ser anterior..."). Se corrigió centralizado en [`backend/app/middleware/error_handler.py`](backend/app/middleware/error_handler.py), afecta a **todos** los validadores cruzados del proyecto, no solo los dos agregados ahora. Este es exactamente el tipo de bug que solo aparece probando la app real, tal como advierte el propio `HANDOFF.md` del proyecto.
- **Tests nuevos**: `test_event_rejects_end_before_start`, `test_maintenance_rejects_next_due_date_before_service_date`, `test_create_category_rejects_invalid_color_format`, `test_duplicate_license_plate_for_same_user_is_rejected`, `test_multiple_vehicles_without_license_plate_are_allowed`.

### Límite defensivo en listados (mitigación parcial de S16)
- **Archivos**: los 9 repositorios con un método `list()` (`category`, `expense`, `income`, `reminder`, `subscription`, `vehicle`, `event`, `task`, `document`) más `ShoppingListRepository.list_visible`.
- **Qué hace**: agrega `.limit(1000)` a cada query de listado, para que un hogar con años de datos no pueda traer un número no acotado de filas en una sola respuesta.
- **Deliberadamente NO tocado**: `ShoppingHistoryRepository.list_for_user` — se usa para calcular sugerencias de recompra ordenando cronológicamente y agrupando en Python; capar mal esta lista (ej. cortando las compras más viejas en vez de las más nuevas) podía romper la lógica de sugerencias sin que ningún test lo detectara. Se prefirió no tocarlo antes que arriesgar una regresión silenciosa.

### Reuso de refresh token y notificaciones — ver sección 2 (ya estaba en la primera ronda)

### Mapeo de errores 422 por campo (S17)
- **Archivo**: [`frontend/src/services/api.ts`](frontend/src/services/api.ts) — nueva función `extractFieldErrors()` que mapea `detail[].loc` (formato de FastAPI/Pydantic) a `{ nombreDeCampo: mensaje }`.
- **Aplicado en**: `TransactionFormModal`, `EventFormModal`, `VehicleFormModal`, `MaintenanceFormModal`, `TaskFormModal`, `ReminderFormModal`, `DocumentFormModal`, `SubscriptionFormModal` — los 8 formularios con más campos / más probabilidad real de un error de validación específico. `Input`/`Textarea` ya tenían soporte para `error` (usado hoy en los mensajes de campo); `Textarea` no lo tenía y se le agregó (mismo patrón que `Input`: borde rojo, `aria-invalid`, mensaje debajo).
- **No aplicado a propósito**: `HouseholdFormModal`/`ShoppingListFormModal` (formularios de un solo campo, donde el mensaje general ya es equivalente al de campo) — para no inflar el diff sin beneficio real.
- **Comportamiento con errores de validación cruzada** (ej. "fin antes que inicio"): esos no tienen un campo específico en `loc` (Pydantic los asocia al modelo completo), así que siguen mostrándose en el banner general del formulario — correcto, porque no son culpa de un campo en particular.
- **Test nuevo**: `frontend/src/services/api.test.ts` (7 tests).

### Accesibilidad
- **`SearchInput`**: agrega `aria-label` (usa el mismo texto que el `placeholder`) — antes dependía solo del placeholder, que WCAG no considera un label válido.
- **`NotificationBell`**: el panel ahora es `role="dialog"` con `aria-label`, el botón que lo abre tiene `aria-haspopup="true"`, y el foco se mueve al panel al abrirse (antes se quedaba en el botón, sin ninguna señal para un lector de pantalla de que se abrió un popup).
- **`Toaster`**: los toasts de error ahora usan `role="alert"` (anuncio inmediato/assertive) en vez de `role="status"` (anuncio cuando el lector esté libre/polite) — un error merece interrumpir, no esperar.
- **Test actualizado**: `Toaster.test.tsx` (se ajustó el test que contaba toasts por `role="status"`, ya que uno de los dos toasts del test ahora es `role="alert"` por ser de error; se agregó un test dedicado al nuevo comportamiento).

### Performance del frontend
- **Code-splitting por ruta** ([`frontend/src/App.tsx`](frontend/src/App.tsx)): las 12 páginas autenticadas + 3 de auth ahora se cargan con `React.lazy()` + `Suspense`, en vez de ir todas en el bundle inicial. Alguien que solo visita `/login` ya no descarga el código de Finanzas, Documentos, Vehículos, etc.
- **`React.memo`** en los 7 componentes de fila de lista: `TaskItem`, `TransactionItem`, `DocumentItem`, `ShoppingItemRow`, `ReminderItem`, `SubscriptionItem`, `MaintenanceItem`. Nota honesta: el beneficio real hoy es parcial, porque las páginas que los usan todavía pasan callbacks (`onEdit`, `onDelete`, etc.) como funciones inline nuevas en cada render, lo que igual dispara un re-render en cada fila. Envolver esos callbacks en `useCallback` en cada página padre sería el siguiente paso para capturar el beneficio completo — no se hizo en esta pasada para no ampliar el diff en 6 páginas más sin un beneficio medible hoy (las listas de esta app personal no son de miles de ítems).

### Verificación en navegador (esta ronda)
- Formulario de evento con fecha de fin anterior al inicio → mensaje de validación limpio confirmado visualmente (sin el prefijo "Value error,").
- Panel de notificaciones → confirmado `role="dialog"` en el árbol de accesibilidad real de la página.
- Páginas Tareas, Calendario, Vehículos cargadas correctamente con lazy-loading, sin errores de consola en una pestaña nueva (se abrió una pestaña nueva específicamente para descartar falsos positivos del HMR de Vite, que mostraba errores viejos en el historial de la pestaña reciclada).
