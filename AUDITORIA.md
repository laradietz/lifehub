# Auditoría técnica integral — Vida En Orden

> Generado el 2026-09-17. Auditoría completa de seguridad, arquitectura, base de datos, dependencias, calidad de código, performance, testing y funcionalidad, realizada antes de exponer la aplicación a producción.
>
> Metodología: 5 revisiones exhaustivas en paralelo (auth/autorización, capa de datos, servicios/lógica de negocio, frontend completo, dependencias/tests/infraestructura) sobre el 100% del código de `backend/app` y `frontend/src`, más verificación manual de los archivos más sensibles (auth, config, deps, middleware, storage) y **ejecución real** de la suite de tests y builds dentro de los contenedores Docker (no solo lectura estática).
>
> Clasificación: 🔴 CRÍTICO · 🟠 ALTO · 🟡 MEDIO · 🟢 BAJO

---

## 1. Estado general del proyecto

Vida En Orden es una app personal/de hogar (FastAPI + PostgreSQL + React/TS) con una arquitectura por capas consistente (`endpoint → service → repository → model`), autorización por `user_id`/membresía de hogar aplicada en la capa de servicio y repositorio (no solo en el frontend), IDs UUID en todas las tablas, contraseñas y tokens siempre hasheados, y **cero SQL injection, cero XSS activo y cero IDOR** encontrados en una revisión endpoint-por-endpoint de los 18 routers. El equipo dejó una documentación de continuidad (`HANDOFF.md`) inusualmente completa y honesta sobre sus propias limitaciones conocidas.

Verificación en vivo durante esta auditoría (no solo lectura de código):
- **Backend: 115/115 tests pasando** (`pytest` dentro del contenedor).
- **Frontend: 72/72 tests pasando** (`vitest` dentro del contenedor).
- **`tsc -b`**: build limpio, sin errores de tipos.
- **`oxlint`**: 0 errores, 17 warnings preexistentes (ya conocidos, patrón `setState` dentro de `useEffect` en varios `FormModal`, no son bugs funcionales).

**Conclusión general**: la base de código está en un nivel de madurez notablemente bueno para su tamaño — sobre todo en autorización, manejo de contraseñas/tokens y cobertura de tests de seguridad (IDOR, tipos de token, rate limiting del código de reseteo). Los problemas reales están concentrados en: (1) endurecimiento pre-producción que nunca se hizo a propósito (rate limiting de login, headers de seguridad, usuarios no-root en Docker, CI), (2) un par de bugs funcionales concretos en el frontend (pantallas en blanco ante errores de red) y en el dispatcher de notificaciones (emails duplicados), y (3) deuda de performance conocida (sin paginación, sin índices en algunas FK) que hoy no duele por el volumen de datos pero conviene resolver antes de escalar. **No es una app insegura por diseño: es una app bien diseñada a la que le falta el último tramo de endurecimiento operacional.**

---

## 2. Vulnerabilidades encontradas

### 🟠 ALTO

| # | Archivo | Problema | Riesgo | Solución recomendada |
|---|---|---|---|---|
| S1 | `backend/app/api/v1/endpoints/auth.py:20-23`, `services/auth_service.py:55-67` | Sin rate limiting ni bloqueo de cuenta en `/api/auth/login` | Fuerza bruta / credential stuffing sin límite contra cualquier cuenta | Bloqueo de cuenta tras N intentos fallidos (igual patrón que ya usan los códigos de reset) |
| S2 | `backend/app/core/config.py:15` + `.env.example:8` | Sin guardrail que impida arrancar en producción con el `SECRET_KEY` placeholder de `.env.example` | Si se despliega sin generar un secreto propio, cualquiera puede forjar JWT válidos y tomar el control de cualquier cuenta | Validar en el arranque que `SECRET_KEY` no sea el valor placeholder y tenga longitud mínima cuando `ENVIRONMENT=production` |
| S3 | `docker-compose.prod.yml` (db/minio), `backend/app/core/config.py:20-21,43-44` | Contraseña de Postgres y credenciales de MinIO caen silenciosamente en defaults débiles (`lifehub`/`lifehub12345`) si `.env` no las define | Un despliegue apurado sin `.env` completo queda con credenciales públicas y conocidas | Quitar los fallbacks `:-lifehub` en `docker-compose.prod.yml`: que falle el arranque si no están seteadas, en vez de degradar en silencio |
| S4 | `frontend/nginx.conf` (completo) | Sin ningún header de seguridad: no hay CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` | Sin CSP, cualquier XSS futuro (dependencia comprometida, componente nuevo mal escapado) puede exfiltrar los tokens de `localStorage` sin restricción; sin `X-Frame-Options`, el login es clickjackeable | Agregar los headers en `nginx.conf` (detalle en sección 12 del checklist) |
| S5 | `frontend/src/services/tokenStorage.ts:5-9` | Access **y** refresh token guardados en `localStorage` | Cualquier XSS (hoy no existe ninguno conocido, pero es la superficie estándar de robo de sesión) da acceso persistente a finanzas, documentos y datos del hogar, no solo por 30 minutos sino indefinidamente vía el refresh token | Mitigación inmediata: CSP (S4). Mitigación de fondo (cambio de arquitectura, requiere diseño de CSRF): mover el refresh token a cookie `httpOnly`+`Secure`+`SameSite`. Se documenta como cambio de arquitectura a futuro, no se hizo en esta pasada por el riesgo de romper el flujo de auth actual sin una fase dedicada |
| S6 | `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/Dockerfile.prod` | Ningún contenedor define `USER`; todos corren como root | Aumenta el radio de daño de cualquier RCE futura en cualquiera de los dos servicios | Agregar usuario no-root en ambos Dockerfiles |
| S7 | Repo raíz | No existe pipeline de CI (`.github/workflows` no existe) | Tests/lint/build solo corren manualmente; una regresión (incluso de seguridad) puede mergearse sin que nadie la note | Agregar un workflow mínimo de GitHub Actions (backend: pytest; frontend: tsc + oxlint + vitest) |
| S8 | `backend/app/services/email_service.py` | El servicio de email es un placeholder permanente que solo loggea — reset de contraseña, invitaciones a hogar y notificaciones **no se envían de verdad** | No es una vulnerabilidad de código, pero es un bloqueante de producción: hoy nadie recibe el código de reset por email fuera de los logs del servidor | Conectar un proveedor real (SES/SendGrid/Postmark) antes de exponer la app a usuarios reales — ya está en el propio checklist del README |

### 🟡 MEDIO

| # | Archivo | Problema | Riesgo | Solución recomendada |
|---|---|---|---|---|
| S9 | `backend/app/services/auth_service.py:77-97` | Reutilizar un refresh token ya rotado no dispara revocación de toda la sesión, solo un 401 | Señal clásica de robo de token pasa desapercibida; el atacante puede seguir usando su copia mientras no choque con la del usuario legítimo | Si el token presentado está `revoked=True` (reuso, no solo expirado), revocar todos los refresh tokens activos de ese usuario |
| S10 | `backend/app/schemas/user.py:14`, `schemas/token.py:21` | Política de contraseña solo por longitud (8-72), sin chequeo contra contraseñas comunes/filtradas | Contraseñas débiles tipo `password1` son válidas, lo que potencia S1 | Documentado como mejora futura (requiere lista de contraseñas comunes o API externa); no se implementó en esta pasada |
| S11 | `backend/app/services/document_service.py:66-72` | El archivo subido se lee entero en memoria antes de validar el tamaño máximo | DoS de memoria con uploads muy grandes y repetidos | Chequeo de tamaño en streaming, cortando apenas se supera el límite, en vez de leer todo primero |
| S12 | `backend/app/services/document_service.py`, `storage_service.py` | Sin allowlist de extensión/tipo de contenido en el upload de documentos | Se puede subir cualquier tipo de archivo (ej. HTML/SVG); mitigado hoy por `Content-Disposition: attachment` en la descarga, pero sin defensa en profundidad | Agregar allowlist de extensiones razonables para documentos personales (pdf, imágenes, office, txt) |
| S13 | `backend/app/services/notification_dispatch_service.py:39-83` | El email se envía **antes** del commit final; si una entidad posterior del mismo `run()` tira una excepción, el rollback deja sin persistir notificaciones cuyo email ya se mandó → se reenvían duplicadas en el próximo ciclo | Emails duplicados a usuarios reales | Commitear (o al menos flushear+commitear) por entidad/lote en vez de un único commit al final de las 4 fases |
| S14 | `backend/requirements.txt`, `backend/Dockerfile` | `pytest`/`pytest-cov`/`httpx` (dependencias de test) se instalan también en la imagen de producción, sin separación dev/prod | Imagen más pesada y con más superficie de la necesaria en producción | Separar `requirements.txt` (prod) de `requirements-dev.txt`, Dockerfile multi-stage |
| S15 | `backend/app/models/event.py`, `finance.py`, `reminder.py`, `subscription.py`, `task.py`, `shopping.py` | `category_id` (FK) sin índice en 7 tablas; `Task.assigned_to_id` tampoco | Postgres no indexa FKs automáticamente; los filtros por categoría/asignado harán table scan a medida que crezcan los datos | Migración Alembic agregando `index=True` a esas columnas |
| S16 | Todos los repositorios de listado | Ningún endpoint de listado pagina (`limit`/`offset`) | Un hogar con años de datos eventualmente trae miles de filas en una sola respuesta | Agregar paginación — no implementado en esta pasada por alcance (afecta ~10 endpoints y sus contratos de respuesta), queda documentado como mejora prioritaria antes de escalar |
| S17 | `frontend/src/services/api.ts:60-69`, usado en todos los `*FormModal` | Los errores 422 del backend (que traen un array por campo) se colapsan en un solo mensaje genérico | El usuario no sabe cuál de varios campos inválidos corregir | Mapear `detail[].loc` al campo específico — no implementado en esta pasada, alcance amplio (toca ~10 formularios) |

### 🟢 BAJO

| # | Archivo | Problema |
|---|---|---|
| S18 | `auth_service.py:55-61` | Canal lateral de timing: `verify_password` (bcrypt) solo corre si el email existe, filtrando por latencia qué emails están registrados |
| S19 | `auth.py:13-17` | `/register` devuelve 409 explícito si el email ya existe (enumeración de cuentas) |
| S20 | `auth_service.py:99-104` | `logout` no invalida el access token (JWT sin estado) — vive hasta su expiración natural (30 min default). Trade-off estándar de JWT sin estado, no es un bug |
| S21 | `models/household.py:16-18` | `Household.owner_id` tiene `ON DELETE CASCADE` — si algún día se agrega "borrar mi cuenta", borra el hogar entero de todos los miembros sin transferencia de dueño. Hoy no explotable: no existe endpoint de borrado de usuario |
| S22 | `.dockerignore` (ambos) | No excluyen defensivamente `.env`/`.git` (hoy inofensivo porque no existen esos archivos en esos subdirectorios) |
| S23 | Varios `schemas/*.py` | Varios campos de texto libre (`notes`, `description`) sin `max_length` |
| S24 | `frontend/nginx.conf` | `index.html` sin `Cache-Control: no-cache` explícito — riesgo cosmético de servir referencias a assets viejos tras un deploy |
| S25 | `components/NotificationBell.tsx`, `SearchInput.tsx`, `Toaster.tsx` | Detalles menores de accesibilidad (foco al abrir el panel de notificaciones, label del buscador, `role="alert"` en toasts de error) |

**No se encontraron**: SQL injection (100% ORM parametrizado), XSS activo (cero `dangerouslySetInnerHTML`/`innerHTML`, todo el contenido de usuario pasa por el escapado automático de React), CSRF explotable (arquitectura de bearer token, no cookies, así que CSRF clásico no aplica hoy), IDOR (los 18 routers fueron revisados uno por uno y todos filtran por `user_id`/membresía de hogar a nivel SQL), secretos hardcodeados en el código fuente, ni comandos/paths inyectables.

---

## 3. Errores funcionales encontrados

| # | Archivo | Problema | Severidad |
|---|---|---|---|
| F1 | `frontend/src/pages/dashboard/DashboardPage.tsx:60-72` | La carga inicial no tiene `catch`; si falla la red o hay un error del backend, el dashboard queda **en blanco sin mensaje de error**, indistinguible de "no tengo datos" | 🟠 ALTO |
| F2 | `frontend/src/pages/finance/FinancePage.tsx:76-99` | Mismo problema que F1 en la carga inicial de resumen/listas de Finanzas | 🟠 ALTO |
| F3 | `frontend/src/pages/shopping/ShoppingPage.tsx:108-124`, `frontend/src/pages/tasks/TasksPage.tsx:83-86` | Varios handlers de mutación (marcar ítem, tildar tarea "en progreso") no tienen `try/catch`; si la request falla, no hay ningún aviso al usuario — la UI queda inconsistente en silencio | 🟡 MEDIO |
| F4 | `backend/app/services/notification_dispatch_service.py:39-83` | Ver S13 — duplicación de emails de notificación tras un rollback parcial | 🟡 MEDIO |
| F5 | (documentado ya en `HANDOFF.md`, problema pendiente #8) | `Task.assigned_to_id` queda huérfano cuando esa persona es expulsada del hogar o lo abandona | 🟡 MEDIO (ya conocido por el equipo) |
| F6 | `frontend/src/pages/auth/{Login,Register,ForgotPassword}Page.tsx` | Formularios con `noValidate` sin revalidación manual — se puede enviar un formulario vacío y depender 100% del round-trip al backend | 🟢 BAJO |
| F7 | `backend/app/schemas/event.py`, `vehicle.py` | Sin validación cruzada de fechas (`end_at >= start_at`, `next_due_date >= date`) — se puede guardar un evento que termina antes de empezar | 🟢 BAJO |

---

## 4. Problemas de arquitectura

- **Autorización de hogar verificada solo en el service, no en el repository** (`event_repository.py:48-49`, `task_repository.py:53-54`): funciona correctamente hoy porque todos los call sites actuales chequean membresía antes de llamar al repositorio, pero es un "foot-gun" — un futuro nuevo endpoint que se salte el service filtraría datos entre hogares sin que ningún test lo detecte. 🟢 BAJO, recomendado: mover el chequeo un nivel más abajo o agregar un assert defensivo.
- **Lógica de "dueño o visible" duplicada casi idéntica en 11 servicios** (`get_owned_or_404`/`get_visible_or_404`) y **SQL de visibilidad de hogar duplicado byte-a-byte entre `task_repository.py` y `event_repository.py`**. No es un bug, es deuda de mantenibilidad — un helper genérico reduciría el código repetido. 🟢 BAJO.
- **`PaymentMethod` (un solo enum de Python) se materializa como 3 tipos de enum distintos en Postgres** (`income_payment_method`, `expense_payment_method`, `subscription_payment_method`). Agregar un valor nuevo requiere 3 migraciones separadas y es fácil olvidarse de una. 🟡 MEDIO.
- **`APScheduler` en memoria, sin lock distribuido**: hoy corre en un solo proceso/contenedor, así que no hay problema, pero si el backend se escala a más de una réplica, cada una dispararía su propio ciclo de notificaciones cada 15 minutos, duplicando emails (se suma a S13/F4). 🟡 MEDIO, documentado para cuando se decida escalar horizontalmente.
- **Sin capa de paginación en ningún listado** (ver S16) — no es un error hoy, es una limitación de diseño que conviene resolver antes de que el volumen de datos crezca.

---

## 5. Problemas de performance

| # | Descripción | Archivo | Severidad |
|---|---|---|---|
| P1 | `FinanceSummaryService.get_summary()` hace ~15 queries de agregación separadas (loop de 6 meses × 2 sumas) en cada carga del dashboard, en vez de 1-2 queries agrupadas por mes | `finance_summary_service.py:26-79` | 🟡 MEDIO |
| P2 | `NotificationDispatchService` recorre **todas** las entidades de la base entera en cada ciclo, con una query de "ya notificado hoy" + hasta 2 inserts por entidad, más un envío de email síncrono por ítem dentro del loop | `notification_dispatch_service.py:89-167` | 🟡 MEDIO |
| P3 | Sin índices en `category_id` (7 tablas) y `Task.assigned_to_id` | ver S15 | 🟡 MEDIO |
| P4 | Sin paginación en ningún listado | ver S16 | 🟡 MEDIO |
| P5 | Frontend: todas las páginas se cargan en el bundle inicial, sin `React.lazy`/code-splitting por ruta | `frontend/src/App.tsx:7-23` | 🟢 BAJO |
| P6 | Frontend: sin `React.memo` en filas de listas (`TaskItem`, `TransactionItem`, etc.) — no duele hoy por el volumen de datos personal/hogar, pero limita el crecimiento | varios `*Item.tsx` | 🟢 BAJO |

---

## 6. Problemas de calidad del código

- Duplicación de lógica de autorización/visibilidad entre servicios y repositorios (ver sección 4).
- 17 warnings preexistentes de `oxlint` (patrón `setState` síncrono dentro de `useEffect` en varios `FormModal` — funciona bien, pero no es el patrón recomendado por React 19).
- Campos de texto libre sin `max_length` en varios schemas (S23).
- `ShoppingItem.quantity` es `float` en vez de `Decimal`, inconsistente con el resto del código financiero que sí usa `Decimal` correctamente en todos lados (esto no es dinero, así que el riesgo real es bajo, pero rompe la convención).
- Sin validación de contenido para `Category.color` (debería matchear `^#[0-9a-fA-F]{6}$`) ni de `currency` contra ISO-4217.
- **Lo que está bien**: nombres claros y consistentes en español (dominio) / inglés (código), servicios pequeños de una sola responsabilidad (nada de "God objects"), sin código muerto detectado, cálculos de dinero 100% en `Decimal` con redondeo correcto, manejo de excepciones centralizado y consistente (nunca se filtran stack traces ni detalles internos al cliente).

---

## 7. Problemas de base de datos

| # | Problema | Severidad |
|---|---|---|
| D1 | `Household.owner_id` con `ON DELETE CASCADE` — trampa latente para cuando se implemente borrado de cuenta (ver S21) | 🟢 BAJO (no explotable hoy) |
| D2 | Sin índice en `category_id` (7 tablas) ni en `Task.assigned_to_id` | 🟡 MEDIO |
| D3 | `PaymentMethod` como 3 enums de Postgres separados | 🟡 MEDIO |
| D4 | Residuo del valor `'reminder'` (minúscula, incorrecto) que quedó permanentemente en el enum `category_type` de Postgres tras un bug ya corregido en una migración vieja — no rompe nada, es basura cosmética imposible de limpiar sin reconstruir el tipo | 🟢 BAJO |
| D5 | Migración `7b71c7086eaa` agrega una columna `NOT NULL` sin `server_default` — hoy inofensivo porque la tabla estaba vacía en ese momento, pero es un patrón riesgoso a futuro | 🟢 BAJO |
| D6 | `Vehicle.license_plate` sin constraint `unique` | 🟢 BAJO |
| D7 | Sin soft-delete/auditoría en ningún modelo — todo borrado es físico e irreversible | 🟢 BAJO (informativo, decisión de diseño válida para el alcance actual) |

**Lo que está bien**: 100% ORM parametrizado (cero SQL injection), UUID como PK en todas las tablas, `TimestampMixin`/`UUIDMixin` aplicados consistentemente en los 16 modelos, `ON DELETE SET NULL` usado correctamente en relaciones cruzadas (categoría/hogar) para no arrastrar borrados en cascada de datos del usuario, constraints `unique` correctos donde importan (email, membresía de hogar, categoría), cadena de migraciones lineal y bien comentada, `alembic/env.py` registra el 100% de los modelos.

---

## 8. Dependencias vulnerables o innecesarias

No se encontraron CVEs conocidos activos en las versiones pineadas actuales (revisión estática, sin acceso a base de datos de CVEs en vivo — se recomienda correr `pip-audit`/`npm audit` como seguimiento).

- **Backend** (`requirements.txt`): todas las 16 dependencias pineadas exactas (`==`), buena práctica de reproducibilidad. `pytest`/`pytest-cov`/`httpx` mezcladas con dependencias de producción (S14). `cryptography` no está pineada directamente (llega transitivamente vía `bcrypt`/`psycopg`), lo que hace su versión resuelta no reproducible/auditable — recomendado pinearla explícitamente.
- **Frontend** (`package.json`): dependencias livianas y actuales (React 19, Vite 8, TypeScript 6, sin librería de gráficos pesada), usan rangos `^` pero el lockfile fija versiones exactas. El `Dockerfile` de desarrollo usa `npm install` en vez de `npm ci` (permite drift silencioso del lockfile en cada build de dev); `Dockerfile.prod` sí usa `npm ci` correctamente.
- Ninguna dependencia detectada como no utilizada en el muestreo realizado.

---

## 9. Correcciones realizadas

Ver [`CORRECCIONES.md`](CORRECCIONES.md) para el detalle línea por línea de cada cambio aplicado después de esta auditoría, junto con los resultados de tests/build tras cada corrección.

---

## 10. Checklist final de producción

> Actualizado tras la segunda ronda de correcciones (ver `CORRECCIONES.md` sección 6). Lo tildado ya está resuelto en el código; lo que sigue sin tildar requiere una decisión/acción del operador al desplegar (credenciales reales, DNS, TLS) o es una mejora de arquitectura deliberadamente pospuesta.

- [ ] Generar `SECRET_KEY` único y aleatorio (nunca el placeholder de `.env.example`) — **el código ahora falla el arranque en producción si no lo hacés** (guardrail agregado)
- [ ] Configurar credenciales reales de Postgres y S3/MinIO (no los defaults `lifehub`/`lifehub12345`) — **el código ahora falla el arranque en producción si no lo hacés**
- [ ] Configurar `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` con un proveedor real de email — **el código ya soporta enviar por SMTP de verdad**, falta la credencial real
- [ ] Restringir `BACKEND_CORS_ORIGINS` al dominio real de producción
- [ ] Terminar TLS en un reverse proxy delante de la app (no incluido por diseño)
- [ ] Definir política de backups para los volúmenes `lifehub_pgdata`/`lifehub_minio_data`
- [ ] Limpiar cuentas de prueba de QA manual en la base de desarrollo antes de ir a producción real
- [x] Agregar bloqueo de cuenta en `/api/auth/login` (5 intentos → 15 min de bloqueo); rate limiting por IP sigue sin implementarse (requeriría Redis para ser consistente entre los 4 workers de producción)
- [x] Agregar headers de seguridad (CSP, X-Frame-Options, etc.) en nginx y en la API
- [x] Configurar CI (lint + tests + build)
- [ ] Evaluar migración de tokens a cookies `httpOnly` como mejora de arquitectura (requiere diseño de CSRF, no trivial) — mitigado mientras tanto con la CSP
- [x] Límite defensivo (`.limit(1000)`) en todos los listados; paginación real de punta a punta (API + UI) sigue pendiente para cuando el volumen de datos lo justifique
- [ ] Correr `pip-audit`/`npm audit` contra una base de CVEs real como seguimiento de esta auditoría estática
- [x] Contenedores de producción corriendo como usuario no-root (backend y frontend)
- [x] Separar dependencias de test de la imagen de producción (`requirements-dev.txt`)
- [x] Validaciones de esquema: fechas cruzadas, formato de color/moneda, límites de texto libre, patente de vehículo única
- [x] Mapeo de errores de validación por campo en los formularios principales del frontend
- [ ] Política de contraseñas contra filtraciones conocidas (ej. Have I Been Pwned) — requiere agregar una dependencia/llamada externa, no implementado

---

## 11. Plan de corrección (orden de ejecución)

1. **Críticos/seguridad** (S1-S8): rate limiting/bloqueo de login, guardrail de `SECRET_KEY`, defaults de credenciales, headers de seguridad, Docker no-root, CI mínimo.
2. **Errores funcionales** (F1-F4): pantallas en blanco del dashboard/finanzas, handlers sin manejo de error, emails duplicados.
3. **Medios de seguridad y base de datos** (S9-S17, D2-D3): revocación de sesión por reuso de refresh token, validación de upload, separación requirements dev/prod, índices faltantes.
4. **Performance** (P1-P4): reducir queries del resumen financiero, batchear el dispatcher de notificaciones, agregar los índices, evaluar paginación.
5. **Calidad de código / arquitectura**: deduplicar helpers de autorización, unificar el enum de `PaymentMethod`.
6. **UX/UI**: mapeo de errores 422 por campo, mejoras de accesibilidad menores.
7. **Mejoras opcionales**: code-splitting de rutas, `React.memo` en listas, política de contraseñas contra filtraciones conocidas.

---

*Continúa en [`CORRECCIONES.md`](CORRECCIONES.md) con el detalle de qué se corrigió efectivamente en esta sesión.*
