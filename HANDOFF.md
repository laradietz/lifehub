# HANDOFF — Life Under Control (documento de continuidad)

> Generado el 2026-09-15, actualizado el 2026-09-16 tras el rediseño de UI/UX post-Fase 11 (ver sección 13). Pegar este documento completo como primer mensaje en el chat nuevo. Cubre todo lo necesario para seguir el desarrollo sin releer la conversación anterior.
>
> **Importante sobre la Fase 7 (Asistente de IA): fue descartada explícitamente por el usuario**, no simplemente pospuesta. Se implementó completa (chat, resumen en Dashboard, sugerencias en Finanzas, OpenAI, toggle de acceso a datos), se probó de punta a punta y luego se revirtió por completo a pedido del usuario porque no consiguió una API key de OpenAI real (encontró un placeholder `sk-tu-clave-real` en una variable de entorno de Windows, no una key funcional, y decidió no conseguir una). El código de esa fase **no existe en el repo actual** — no asumas que hay nada de IA armado. Si el usuario la vuelve a pedir en el futuro, hay que rehacerla desde cero (el diseño ya está probado: ver el historial de la sesión donde se hizo, o simplemente volver a preguntar alcance/proveedor/acceso a datos como se hizo la primera vez).

---

## 1. Objetivo del proyecto

**Qué es:** Life Under Control (el proyecto se llamó LifeHub y después Vida En Orden; ver nota de rename en sección 6), un panel de control personal ("todo en un solo lugar") para organizar tareas, finanzas, compras, vencimientos, documentos, vehículos y más.

**Para quién:** Una persona (usuario final individual, no B2B) que quiere reducir la carga mental de organizar su vida cotidiana: qué tiene que hacer, qué tiene que pagar, qué está por vencer, cuánto gastó, qué tiene que comprar.

**Finalidad declarada del proyecto:** Debe ser un producto **real y profesional**, no una demo ni un CRUD básico — pensado también como pieza de portfolio que demuestre Python/FastAPI, React/TypeScript, PostgreSQL, JWT, Docker, testing, arquitectura y buen UI/UX.

**Requisito explícito del usuario sobre el proceso de trabajo:** desarrollar **por fases** (11 fases definidas de entrada, ver sección 11), ejecutando y verificando cada fase antes de seguir a la siguiente, sin generar todo de una sola vez, tomando decisiones técnicas de forma autónoma salvo que cambien el producto de forma importante.

---

## 2. Estado actual

### ✅ Terminado y verificado (Fases 1-6, 8-11 — Fase 7 descartada, ver nota arriba)

- **Fase 1** — Arquitectura, base de datos (esquema completo de 20 tablas), autenticación JWT completa.
- **Fase 2** — Dashboard configurable, Tareas, Recordatorios/vencimientos.
- **Fase 3** — Finanzas personales (ingresos/gastos) y Suscripciones.
- **Fase 4** — Compras (listas personales/de hogar, sugerencias de recompra) y Hogar (households multi-usuario **reales**: invitación por email, aceptar/rechazar, roles dueño/miembro, expulsar/abandonar/eliminar, tareas asignables a miembros de un hogar). Ver sección 2.1 para el detalle completo de esta fase.
- **Fase 5** — Documentos (CRUD + archivo adjunto real en storage S3-compatible/MinIO, con subida/descarga/reemplazo) y Vehículos (CRUD + historial de mantenimiento con actualización automática del odómetro). Decisiones de producto confirmadas con el usuario al arrancar la fase (ver también sección 6, puntos 18-19): (1) storage de archivos = MinIO/S3-compatible, no filesystem local; (2) Documentos y Vehículos son **estrictamente personales**, no se asocian a un hogar (a diferencia de tareas/compras en la Fase 4).
- **Fase 6** — Calendario (vista mensual, grilla de 6 semanas). Decisión de producto confirmada con el usuario al arrancar la fase: `Event` admite `household_id` opcional, igual que Tareas/Compras (a diferencia de Documentos/Vehículos que son estrictamente personales). El modelo `Event` ya existía completo desde la Fase 1, así que la fase fue schemas/repository/service/endpoints + frontend, sin cambios de esquema salvo agregar `CategoryType.EVENT` (migración a mano, mismo patrón que la Fase 4). Mismo patrón de visibilidad que Tareas: un evento de hogar es visible/editable por cualquier miembro `accepted`, pero solo quien lo creó puede borrarlo. Probado de punta a punta en navegador real (crear evento personal con categoría y ubicación, editar, activar "todo el día" y verificar que el input cambia de `datetime-local` a `date`, crear un hogar y un evento asociado a él, navegar entre meses, volver a "Hoy", borrar con confirmación). 99 tests de backend, todos pasando (89 de Fases 1-5 + 10 nuevos de Fase 6).
- **Fase 8** — Notificaciones. Decisiones de producto confirmadas con el usuario al arrancar la fase (vía `AskUserQuestion`, ver también sección 6, puntos 21-23): (1) disparador = worker en el mismo contenedor backend con **APScheduler** (`BackgroundScheduler`, `interval` trigger cada `NOTIFICATION_CHECK_INTERVAL_MINUTES` minutos, default 15, con `next_run_time=datetime.now()` para que corra una vez apenas arranca el backend), sin servicio/contenedor aparte; (2) canales = **in-app real + email placeholder** (el mismo `EmailService` que ya usaba el proyecto para recuperación de contraseña e invitaciones de hogar, sigue solo logueando, sin proveedor real ni credenciales); (3) alcance = **Recordatorios + Documentos + Vehículos + Eventos del Calendario** (Tareas y Suscripciones quedan afuera de esta fase; `NotificationType.TASK`/`SUBSCRIPTION` existen en el enum para el futuro). Implementación: `NotificationDispatchService` (`backend/app/services/notification_dispatch_service.py`) corre en un hilo de fondo con su propia sesión de DB (no usa `Depends(get_db)`, no hay request HTTP), revisa las 4 entidades y crea una notificación `IN_APP` + una `EMAIL` por cada vencimiento que cruza el umbral configurado — `Reminder.advance_notice_days` (ya existía, por-item) para Recordatorios, un umbral fijo `(7, 1)` días para Documentos/Vehículos/Eventos (no tienen ese campo configurable). Deduplicación: no vuelve a notificar la misma entidad si ya se creó una notificación para ella hoy (`NotificationRepository.exists_for_entity_today`), así que aunque el scheduler corra cada 15 minutos no spamea. 3 endpoints nuevos bajo `/api/notifications` (`GET ""`, `GET /unread-count`, `PATCH /{id}/read`, `POST /read-all`) + campanita real en el header (`NotificationBell.tsx`): badge con contador (poll cada 60s), panel desplegable con las notificaciones `IN_APP`, marcar individual o todas como leídas. El scheduler se desactiva en tests (`SCHEDULER_ENABLED=false`, fijado en `conftest.py` **antes** de importar `app.core.config` — ver sección 7 para el detalle de por qué el orden de ese import importa) para que la suite no dispare chequeos reales contra la base de datos de test en un hilo de fondo. Migración a mano agregando `'DOCUMENT'`/`'VEHICLE'` al enum `notification_type` (mismo patrón de la sección 7.4). Probado de punta a punta en navegador real: crear un recordatorio que vence mañana y un documento que vence mañana, reiniciar el backend para forzar un chequeo inmediato del scheduler, confirmar en los logs que se creó la notificación y que el email placeholder se logueó, ver el badge "1"/"2" en la campanita, abrir el panel, marcar una individualmente y luego "Marcar todas como leídas", recargar la página y confirmar que el estado de lectura persiste. 109 tests de backend, todos pasando (99 de Fases 1-6 + 10 nuevos de Fase 8).
- **Fase 9** — UX/UI avanzado. Alcance interpretado a partir de lo que ya dejaban anotado los "Problemas pendientes" (sin necesidad de `AskUserQuestion` porque no había una decisión de producto ambigua, solo trabajo técnico): (1) **dark mode real**, (2) **accesibilidad de teclado** en los overlays existentes, (3) **auditoría responsive** en mobile. 100% frontend, sin tocar el backend.
  - **Dark mode:** `frontend/src/utils/theme.ts` (módulo, no un store) centraliza todo: `applyCachedThemeEarly()` se llama en `main.tsx` **antes** de montar React para evitar un flash del tema incorrecto (usa el último tema guardado en `localStorage`, o `"system"` la primera vez); `setTheme()` aplica/quita la clase `.dark` al `<html>` y cachea; un listener de `prefers-color-scheme` vive a nivel de módulo (no por componente) para no perder de vista cuál es el tema activo si Configuración lo cambia mientras el listener sigue montado. `useThemeSync()` (`frontend/src/hooks/useThemeSync.ts`) sincroniza con `UserSettings.theme` (la fuente de verdad real) apenas el usuario se autentica. Nueva card "Apariencia" en `SettingsPage.tsx` con 3 botones (Claro/Oscuro/Sistema), feedback instantáneo.
  - **Accesibilidad de teclado:** `components/ui/Modal.tsx` (usado por todos los `*FormModal` y `ConfirmDialog` de la app) ahora tiene **focus trap** real (Tab/Shift+Tab cicla dentro del modal, ya no se escapa al fondo), mueve el foco al primer campo del formulario al abrir (saltando a propósito el botón "Cerrar" del header, que es el primer foco DOM pero no el mejor punto de partida) y **devuelve el foco** a quien abrió el modal al cerrarlo (con Escape, con el botón Cerrar, o clickeando el backdrop). Mismo tratamiento de Escape-para-cerrar en `NotificationBell.tsx` (el panel de notificaciones, Fase 8) y en el drawer de navegación mobile de `AppLayout.tsx`, ambos devolviendo el foco al botón que los abrió.
  - **Auditoría responsive:** revisado en navegador real a 375px (mobile) — Dashboard, Finanzas, Calendario, Vehículos, Tareas (con su fila de tabs de filtro) y las 3 páginas de auth (login/registro/recuperar contraseña, layout split-screen). No se encontraron problemas reales que corregir: todo ya colapsaba bien a una columna. El único caso "raro" (la fila de tabs de filtro de Tareas se ve cortada en mobile) resultó ser un scroll horizontal intencional que ya funcionaba (`overflow-x-auto`), no un bug.
  - Probado de punta a punta en navegador real: alternar los 3 modos desde Configuración con feedback instantáneo, recargar la página y confirmar que persiste, cerrar sesión y confirmar que el login también respeta el tema cacheado, emular un cambio de `prefers-color-scheme` del sistema en vivo (sin recargar) y confirmar que "Sistema" reacciona solo; abrir un modal y confirmar con JS (`document.activeElement`) que el foco entra al primer campo, que Tab/Shift+Tab quedan atrapados dentro (probado en ambas direcciones), y que Escape cierra y devuelve el foco al botón que abrió el modal; mismo chequeo de Escape+devolución de foco en la campanita de notificaciones y en el drawer mobile. Sin tests de backend nuevos (no hay backend involucrado); 109 tests de backend siguen pasando sin cambios, `tsc -b` y `oxlint` limpios.
- **Fase 10** — Testing extendido y seguridad. Alcance interpretado directamente del punto "Próximos pasos" que ya dejaba la Fase 9 (sin `AskUserQuestion`, no había ambigüedad de producto): (1) **tests de frontend** (infraestructura instalada desde la Fase 1, nunca usada — ver problema pendiente #2), (2) **ampliar cobertura de seguridad del backend** en el flujo de auth.
  - **Infraestructura de tests de frontend:** `vitest.config.ts` (nuevo, en la raíz de `frontend/`) hace `mergeConfig` sobre `vite.config.ts` para no duplicar el alias `@` ni el plugin de React, agrega `environment: "jsdom"` y `setupFiles: ["./src/test/setup.ts"]`. `src/test/setup.ts` importa `@testing-library/jest-dom/vitest` (extiende `expect` con matchers tipo `toBeInTheDocument`), llama a `cleanup()` después de cada test, y **stubea `window.matchMedia`** (jsdom no lo implementa, y `utils/theme.ts` lo usa a nivel de módulo para el listener de `prefers-color-scheme` — sin el stub, cualquier test que toque ese módulo directa o indirectamente explota al importarlo). Scripts nuevos en `package.json`: `npm test` (`vitest run`, un solo pase) y `npm run test:watch`. `tsconfig.node.json` agrega `vitest.config.ts` a su `include` (vive fuera de `src/`, mismo tratamiento que `vite.config.ts`).
  - **Qué se cubrió (53 tests nuevos, en `docker compose exec frontend npx vitest run`):** utilidades puras con lógica no trivial (`utils/datetime.ts`, `utils/currency.ts`, `utils/taskMeta.ts`, `utils/calendar.ts`, `utils/cn.ts`, `utils/theme.ts`) con foco en los bugs de timezone ya documentados (sección 10, problema #5: `formatDate` de una fecha sin hora no debe correrse un día para atrás) y en el fallback de `Intl.NumberFormat` cuando el código de moneda es inválido; **regresión explícita del bug del Fase 3** (`CategorySelect.test.tsx`, sección 7.3: crear una categoría nueva desde el `<select>` inline NO debe disparar el `submit` del `<form>` externo que lo contiene — el test monta `CategorySelect` dentro de un `<form>` real con un `onSubmit` espiado y confirma que nunca se llama); **focus trap y devolución de foco de `Modal.tsx`** (`Modal.test.tsx`, sección 6 punto 26: el foco inicial salta el botón "Cerrar", Tab/Shift+Tab quedan atrapados en ambas direcciones, Escape y el click en el backdrop cierran y devuelven el foco a quien abrió el modal); `authStore.ts` completo (`authStore.test.ts`, mockeando `authService` con `vi.mock` — incluye una **regresión explícita del problema #3** de la sección 10: verifica que `status` nunca pasa por `"loading"` durante `login`, porque eso rompería `PublicOnlyRoute` y perdería el mensaje de error del formulario) y un test básico de `Button.tsx` (loading/disabled no dispara `onClick`).
  - **Qué NO se cubrió todavía (decisión consciente de alcance, no bug):** no hay tests de los componentes `Page`/`*FormModal` de cada módulo (Tareas, Finanzas, Documentos, etc. — son los que más *fetch* manual en `useEffect` tienen y requerirían mockear cada `service` por separado), no hay tests de la capa `services/*.ts` (wrappers finos sobre `api`, bajo valor unitario), no hay tests del interceptor de refresh de `services/api.ts`, y no hay ningún test end-to-end de navegador automatizado (Playwright/Cypress) — la verificación de flujos completos sigue siendo manual en el Browser pane, como en fases anteriores. Si se quiere ampliar, el patrón a seguir es el mismo que `authStore.test.ts` (mockear el `service` con `vi.mock`, nunca golpear el backend real desde un test de frontend).
  - **Seguridad de backend, 6 tests nuevos en `test_auth.py`** (115 tests de backend en total, 109 anteriores + 6 nuevos, todos pasando): `test_password_reset_revokes_existing_sessions` (un refresh token emitido ANTES de resetear la contraseña deja de servir después — ya lo hacía `AuthService.confirm_password_reset` desde antes, pero no estaba testeado explícitamente), `test_access_token_rejected_at_refresh_endpoint` y `test_refresh_token_rejected_as_bearer_token` (confusión de tipo de token en ambas direcciones — la validación `payload.get("type") != "access"/"refresh"` ya existía en `deps.py`/`auth_service.py`, sección 5, pero tampoco estaba testeada), `test_tampered_access_token_rejected` (firma JWT alterada un carácter → 401), `test_malformed_authorization_header_rejected` (un string cualquiera como bearer token → 401), `test_expired_access_token_rejected` (usa `monkeypatch` sobre `app.core.security.timedelta` para forzar un token ya vencido al crearlo, sin esperar en tiempo real). **Ninguno de estos tests encontró un bug real** — todo el comportamiento que verifican ya estaba implementado correctamente desde fases anteriores, simplemente no tenía cobertura explícita; se agregaron para que una regresión futura en `deps.py`/`auth_service.py`/`security.py` la agarre un test y no QA manual.
  - No se tocó ningún endpoint ni modelo del backend — la Fase 10 es 100% tests, sin cambios de comportamiento. `docker compose exec backend pytest -q`, `docker compose exec frontend npx vitest run`, `docker compose exec frontend npx tsc -b` y `docker compose exec frontend npx oxlint` corridos al final, todo en verde (los 17 warnings de `oxlint` son preexistentes de fases anteriores, ninguno en archivos tocados en esta fase). Verificado también que el frontend sigue sirviendo bien en el navegador tras los cambios de config (`vitest.config.ts`, `tsconfig.node.json`, `package.json`) — no son cambios de runtime, pero se confirmó igual.
- **Fase 11** — Empaquetado final para producción. Última fase del plan original de 11 fases. Alcance interpretado directamente de lo que la propia Fase 10 dejaba anotado como "Próximos pasos" (sin `AskUserQuestion` para el trabajo técnico; sí se preguntó explícitamente por las dos decisiones con impacto real fuera del repo, ver abajo): Docker de producción, checklist de producción en el README, y publicar el repo en GitHub.
  - **Limpieza previa:** `backend/app/core/config.py` todavía tenía el campo `OPENAI_API_KEY: str | None = None` y `.env.example` la variable correspondiente, pese a que este mismo documento (sección 9, nota sobre `OPENAI_API_KEY`) ya afirmaba que se habían quitado tras descartar la Fase 7. Era código muerto real (`grep OPENAI` en `backend/app/` no devolvía ningún otro uso) — se eliminaron ambos para que el HANDOFF y el código coincidan. Si en algún momento se retoma la Fase 7, hay que volver a agregarlos (ver también sección 6 punto 21).
  - **Docker de producción, archivo nuevo `docker-compose.prod.yml`** (standalone, **no** pensado para combinarse con `docker-compose.yml` vía `-f` — Compose concatena listas como `ports` en vez de reemplazarlas al combinar archivos, así que la única forma limpia de no exponer los puertos de `db`/`minio` al host en producción era un archivo autocontenido, aunque duplique esos dos servicios). Diferencias clave respecto al de desarrollo: el frontend se buildea con `frontend/Dockerfile.prod` (multi-stage: `npm run build` en una etapa `node:22-alpine`, después sirve `dist/` con `nginx:1.27-alpine` usando `frontend/nginx.conf` — SPA con `try_files ... /index.html` para que las rutas de React Router no den 404 al recargar); el backend corre `uvicorn --workers 4` sin `--reload` y sin bind-mount del código (usa lo que quedó copiado en la imagen al buildear, el `Dockerfile` de siempre ya no tenía `--reload` en su `CMD`, eso solo lo agregaba el `command` del compose de desarrollo); `db`/`minio` no exponen puertos al host. `VITE_API_URL` se pasa como build arg (`ARG`/`ENV` en `Dockerfile.prod`) porque Vite embebe las variables `VITE_*` en el JS compilado en build time, no se pueden cambiar después sin recompilar la imagen. **Probado:** build de ambas imágenes exitoso (`docker compose -f docker-compose.prod.yml build`), y smoke test del contenedor de frontend solo (`docker run -p 8081:80 lifehub-frontend`) confirmando que nginx sirve `index.html` en `/` y que el fallback de SPA funciona en una ruta cliente como `/tasks` (ambas devuelven 200, no 404). No se corrió el stack de producción completo de punta a punta (backend+frontend+db+minio juntos) para no chocar de puertos con el stack de desarrollo que seguía corriendo en la misma máquina durante la sesión — si se quiere validar eso, bajar el stack de dev primero o correr el de producción en otra máquina/red.
  - **README:** nueva sección "Despliegue en producción" explicando `docker-compose.prod.yml` y el build-arg de `VITE_API_URL`, más un **checklist de producción** explícito (`SECRET_KEY` propio, credenciales de MinIO/S3 reales, proveedor de email real, `BACKEND_CORS_ORIGINS` restringido, HTTPS vía reverse proxy — este repo no incluye terminación TLS a propósito, se asume que la pone la capa de infraestructura —, backups de los volúmenes de Postgres/MinIO, credenciales de Postgres propias, limpiar cuentas de QA antes de un lanzamiento real, y considerar rate limiting en login/password-reset que hoy no existe más allá del límite de intentos del código de recuperación). Roadmap actualizado (Fases 10 y 11 marcadas), stack actualizado (menciona Vitest/Testing Library y nginx), sección "Tests" ahora incluye el comando de Vitest además de pytest. **No se generaron capturas de pantalla** — decisión explícita del usuario (`AskUserQuestion`): automatizarlas requería descargar Chromium vía Playwright (~150-300MB) solo para esto, se prefirió omitirlas por ahora y agregarlas manualmente más adelante con datos curados (evitando exponer cuentas/datos de prueba en imágenes que terminan en un repo).
  - **Publicación en GitHub:** decisión explícita del usuario (`AskUserQuestion`, con la recomendación de arrancar privado dado que el objetivo declarado del proyecto es portfolio pero conviene una revisión antes de hacerlo público) — se creó el repo **privado** `laradietz/lifehub` con `gh repo create --private --source=. --remote=origin` y se pusheó `master` (`git push -u origin master`). Antes de crear el repo se verificó que `.env` nunca estuvo trackeado (ni está en el historial completo de commits, `git log --all --diff-filter=A --name-only` no encuentra ningún `.env`) y que `.gitignore` ya cubre `.env`, `node_modules/`, `dist/`, `backend/uploads/`, etc. **El repo Git ya tiene remoto** (`origin` → `https://github.com/laradietz/lifehub`, privado) — esto actualiza el problema pendiente #6 de más abajo, que hablaba de que no había remoto configurado.
  - Se corrieron los 115 tests de backend y se confirmó que el backend seguía respondiendo (`/api/docs` → 200) después de la limpieza de `config.py`. No se tocó ningún endpoint, modelo ni componente de UI — Fase 11 es infraestructura/documentación, sin cambios de comportamiento de la app.
- Cambio adicional (fuera del plan original, pedido por el usuario): recuperación de contraseña rediseñada de "link con token" a **código de 6 dígitos por email**.
- **Bug crítico encontrado y arreglado durante la Fase 4** (no relacionado con la fase, pre-existente desde antes): el registro de usuarios nuevos devolvía **500** siempre. Causa: la migración `39c2e9c87f49` había agregado el valor `'reminder'` (minúscula) al enum de Postgres `category_type`, pero SQLAlchemy serializa los miembros de un `class X(str, enum.Enum)` usando su **`.name`** (`'REMINDER'`, mayúscula) al armar el `INSERT`, no su `.value`. Como `seed_default_categories()` crea categorías `REMINDER` al registrarse, el insert fallaba con `invalid input value for enum` y tumbaba todo el registro. Arreglado con la migración `a47597b1593c` (agrega el valor `'REMINDER'` correcto). **Importante:** todos los enums de Postgres de este proyecto usan los nombres de los miembros en MAYÚSCULA como valor real en la base (`'TASK'`, `'OWNER'`, `'PENDING'`, etc.), **no** el `.value` en minúscula del lado Python — tenerlo en cuenta en cualquier migración nueva que agregue un enum o un valor a uno existente (ver sección 7.4, actualizada).

Todo lo anterior fue probado de punta a punta en navegador real (no solo tests automáticos — la Fase 4 incluyó un flujo completo de dos usuarios reales invitándose, compartiendo lista de compras y asignándose una tarea; la Fase 5 incluyó crear un documento con vencimiento, editarlo, subir/descargar/quitar un archivo real contra MinIO, crear un vehículo, agregar un mantenimiento y verificar que el odómetro se actualizó solo) y tiene **89 tests de backend, todos pasando** (45 de Fases 1-3 + 33 de Fase 4 + 11 nuevos de Fase 5).

### 🚧 En desarrollo / no empezado

- **Fase 7** — Asistente de IA. **Descartada por decisión explícita del usuario** (ver nota al principio del documento), no "pendiente" en el sentido normal. No retomarla sin que el usuario la pida de nuevo y vuelva a definir alcance/proveedor.
- **Fase 11** — Docker + documentación final + preparación para producción. **Siguiente fase.** El README ya es bastante completo y se actualiza en cada fase; falta la pasada final (screenshots, checklist de producción, etc.).

### ⚠️ Errores/problemas pendientes conocidos (no bloqueantes, pero hay que saberlos)

1. ~~Dark mode no está activado en ningún lado.~~ **✅ Resuelto en la Fase 9** (ver el bullet de la Fase 9 más arriba y sección 6 punto 25). Se deja este ítem con su número para no romper las referencias cruzadas "problema pendiente #N" del resto del documento.
2. ~~Frontend sin tests.~~ **✅ Resuelto parcialmente en la Fase 10** (ver el bullet de la Fase 10 más arriba): hay 53 tests de utilidades/componentes/store, pero **todavía no hay tests de los `Page`/`*FormModal` de cada módulo, de la capa `services/`, ni end-to-end** — eso sigue pendiente si se lo quiere ampliar más adelante. Se deja este ítem con su número para no romper las referencias cruzadas "problema pendiente #N" del resto del documento.
3. **Finanzas no hace conversión de moneda.** `FinanceSummaryService` (backend) suma montos de `Income`/`Expense` sin convertir divisas — asume que el usuario opera siempre en una sola moneda (razonable para una persona/hogar, pero está documentado como limitación intencional en el docstring del servicio, no un bug).
4. **Recurrencia `CUSTOM` no genera la siguiente ocurrencia automáticamente.** Tareas y Recordatorios con `recurrence = "daily" | "weekly" | "monthly"` sí generan automáticamente la siguiente ocurrencia al completarse; `recurrence = "custom"` se guarda pero no dispara nada (ver `backend/app/services/recurrence.py`).
5. **Docker Desktop puede estar apagado al arrancar la sesión** (pasó tanto al iniciar la Fase 1 como al retomar para la Fase 4). Hay que arrancarlo antes de poder trabajar (ver sección 9) — no asumir que ya está corriendo.
6. ~~El repo Git no tiene remoto configurado.~~ **✅ Resuelto en la Fase 11**: `origin` → `https://github.com/laradietz/lifehub`, repo **privado**, `master` pusheada. Se deja este ítem con su número para no romper las referencias cruzadas "problema pendiente #N" del resto del documento. Si se lo quiere hacer público más adelante, primero dar una pasada de revisión al historial de commits (aunque ya se verificó que `.env` nunca estuvo trackeado).
7. **Hay datos de prueba reales en la base de datos de desarrollo** (cuentas creadas manualmente durante las pruebas en navegador, ej. `lara.demo@example.com` — ojo, esta cuenta puede no existir/tener otra contraseña en la máquina actual, ya falló un login de prueba en la Fase 5 —, y de la Fase 4 `browser-a@example.com`/`browser-b@example.com`/`bugcheck-temp@example.com`, y de la Fase 5 `fase5-test@example.com` con un vehículo Toyota Corolla y un documento "Póliza seguro auto" de prueba, todas con password `supersecret123`). No es un seed formal (la Fase 25 del pedido original — "datos de demostración eliminables" — no está implementada), son solo restos de QA manual. No hay que tratarlos como fixtures ni depender de que existan.
8. **La asignación de una tarea a un miembro expulsado del hogar queda "huérfana".** Si a una tarea se le asigna `assigned_to_id` y después esa persona es expulsada del hogar (o abandona), `Task.assigned_to_id` **no se limpia automáticamente** — el backend simplemente deja de poder resolver ese usuario como miembro visible, y el frontend (`TaskItem.tsx`) deja de mostrar el badge "→ Nombre" porque ya no lo encuentra en `household.members`, pero el campo sigue apuntando a ese `user_id` en la base. No rompe nada (la tarea se sigue viendo y editando bien por los demás miembros), pero es un dato inconsistente que quedó sin resolver a propósito por alcance — si se quiere prolijo, limpiar `assigned_to_id` en `HouseholdService.remove_member`/`leave` para toda tarea de ese hogar asignada a esa persona.
9. **Los vencimientos de Documentos, el mantenimiento de Vehículos y los eventos del Calendario NO están integrados al widget "Próximos vencimientos" del dashboard** (dejado fuera de las Fases 4/5/6 a propósito, mismo criterio en las tres — ver "Pendiente menor" en la sección 11). Hoy ese widget (`DashboardService.summary`) solo lee `Reminder`; documentos por vencer, mantenimientos con `next_due_date`/`next_due_mileage` próximos y eventos del calendario solo se ven entrando a `/documents`, `/vehicles` o `/calendar`. Unificarlo requeriría cambiar `DashboardSummary.upcoming_reminders` (hoy tipado a `list[ReminderRead]`) por algo más genérico — no se hizo para no ampliar el alcance de cada fase.
10. **El archivo de un Documento se sirve siempre a través del backend (proxy), nunca con una URL firmada directa a MinIO.** Fue una decisión explícita para evitar el problema de que una URL presignada generada con el endpoint interno de Docker (`http://minio:9000`) no es alcanzable desde el navegador del usuario (que corre fuera de la red de Docker, en `localhost`). Si en el futuro se quiere servir archivos grandes o video, considerar agregar un endpoint público de MinIO y URLs firmadas — hoy no hace falta porque `MAX_UPLOAD_SIZE_MB` (10MB por defecto) mantiene los archivos chicos.
12. **El scheduler de notificaciones no tiene lógica de "catch-up".** Si el contenedor backend está apagado justo el día en que un vencimiento cruza su umbral (7/1 días, o el `advance_notice_days` de un Recordatorio), esa notificación se pierde para siempre — el chequeo solo mira "¿hoy coincide con un umbral?", no "¿me perdí algún umbral mientras estuve apagado?". Razonable para una app personal que no corre 24/7 en esta máquina, pero hay que saberlo.
13. **Notificaciones de Documentos/Vehículos/Eventos usan un umbral fijo `(7, 1)` días, no configurable por el usuario** (a diferencia de `Reminder.advance_notice_days`, que sí lo es). Decisión consciente de la Fase 8 para no agregarle un campo nuevo a esos tres modelos — si se quiere configurable, hay que agregar una columna vía Alembic a cada uno.
14. **Vehículos: solo se notifica por `next_due_date` (fecha), no por `next_due_mileage` (kilometraje).** Un mantenimiento que se vence solo por kilometraje (sin fecha) nunca dispara una notificación — se dejó fuera a propósito porque requeriría cruzar contra el odómetro actual del vehículo en cada chequeo, no solo comparar fechas.
15. **Tareas y Suscripciones no generan notificaciones todavía.** El alcance de la Fase 8 (decidido con el usuario) fue Recordatorios + Documentos + Vehículos + Eventos; `NotificationType.TASK`/`SUBSCRIPTION` ya existen en el enum para cuando se quiera sumarlas (mismo patrón que `_check_reminders`/etc. en `NotificationDispatchService`).
16. **El canal `EMAIL` de las notificaciones sigue siendo un placeholder que solo loguea** (mismo `EmailService` de siempre) — no hay un proveedor real conectado. Igual que con la recuperación de contraseña, esto es intencional hasta que se configure un proveedor real (probablemente en la Fase 11, producción).
17. **No hay canal `push` implementado.** Se decidió explícitamente no hacerlo en la Fase 8 (requeriría Service Worker + claves VAPID + flujo de permiso del navegador) — `NotificationChannel.PUSH` existe en el enum pero nada lo usa. Si se pide en el futuro, es una fase de trabajo aparte, no una extensión trivial de lo que ya existe.
18. **El filtro de rango de fechas del Calendario (`start_after`/`start_before`) solo mira `Event.start_at`, no hace overlap contra `end_at`** (`EventRepository.list`, Fase 6). Simplificación intencional, mismo criterio de "sin over-engineering" del punto 11 de la sección 6: un evento multi-día cuyo `start_at` cae ANTES de la grilla del mes visible pero cuyo `end_at` cae DENTRO no aparece en esa vista de mes (sí aparece en el mes donde arrancó). No es un problema hoy porque el frontend no ofrece crear eventos de más de un día de forma prominente (el campo "Fin" existe pero es opcional y poco usado en la práctica). Si se necesita soportar bien eventos multi-día, cambiar la query a `start_at <= start_before AND (end_at IS NULL OR end_at >= start_after)`.

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
- **APScheduler** 3.10.4 (Fase 8: `BackgroundScheduler` corriendo dentro del proceso del backend, dispara el chequeo periódico de notificaciones -- sin worker/contenedor aparte)
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
│   │       ├── 567e2b7bfb30_initial_schema.py          # crea las 20 tablas (incluye documents/vehicles/vehicle_maintenance)
│   │       ├── 7b71c7086eaa_add_attempts_to_password_reset_token.py
│   │       ├── 39c2e9c87f49_add_reminder_category_type.py   # ALTER TYPE manual, ver sección 8
│   │       ├── a47597b1593c_...                              # Fase 4
│   │       ├── 1deb3fc6c345_...                              # Fase 4 (household_member_status)
│   │       ├── c8f3a19d4b21_add_event_category_type.py        # Fase 6
│   │       └── d4a1f6e29b7c_add_document_vehicle_notification_type.py  # Fase 8
│   │       # Fase 5 (Documentos/Vehículos) NO agregó migraciones nuevas: las tablas
│   │       # ya existían completas desde el esquema inicial de la Fase 1.
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
│   │   │   ├── storage_service.py  # Fase 5: cliente boto3 hacia MinIO/S3, get_storage_service() singleton
│   │   │   ├── event_service.py    # Fase 6: mismo patron de visibilidad que task_service.py
│   │   │   ├── notification_service.py            # Fase 8: listar/marcar leidas, usado por los endpoints
│   │   │   └── notification_dispatch_service.py    # Fase 8: chequeo periodico (llamado por APScheduler, sesion de DB propia)
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
        ├── hooks/useThemeSync.ts    # Fase 9: sincroniza UserSettings.theme apenas el usuario se autentica
        ├── components/
        │   ├── ui/                  # Button, Input, Select, Textarea, Card, Modal, ConfirmDialog, Badge, Alert, Skeleton, Spinner, Logo
        │   ├── CategorySelect.tsx    # select de categoría + "crear nueva" inline (ver bug corregido, sección 10)
        │   ├── NotificationBell.tsx  # Fase 8: campanita en el header (AppLayout), badge + panel, poll de unread-count cada 60s
        │   └── charts/                # ExpenseCategoryChart (barras), IncomeExpenseTrendChart (líneas + tooltip)
        ├── pages/
        │   ├── auth/                  # LoginPage, RegisterPage, ForgotPasswordPage (wizard 2 pasos), (NO existe ResetPasswordPage — se eliminó)
        │   ├── dashboard/              # DashboardPage (widgets configurables), SettingsPage (perfil + moneda + widgets)
        │   ├── tasks/, reminders/, finance/, subscriptions/, shopping/, households/   # un módulo por dominio: Page + FormModal + Item
        │   ├── documents/               # DocumentsPage + DocumentFormModal + DocumentItem (Fase 5: upload/download/quitar archivo inline)
        │   ├── vehicles/                # VehiclesPage (tabs por vehículo, mismo patrón que ShoppingPage) + VehicleFormModal + MaintenanceFormModal + MaintenanceItem (Fase 5)
        │   ├── calendar/                 # CalendarPage (grilla mensual, sin librería externa) + EventFormModal (Fase 6)
        │   └── NotFoundPage.tsx
        └── utils/                     # cn, taskMeta (labels/formateo, reusado para vencimientos de documentos), datetime, currency, chartColors, financeMeta, documentMeta, vehicleMeta, calendar (Fase 6: grilla de mes, claves de fecha local), theme (Fase 9: aplicar/cachear el tema, ver sección 6 punto 25)
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

GET    /api/tasks?status=&priority=&category_id=&due_before=&due_after=&household_id=&assigned_to_me=
POST   /api/tasks                            (household_id/assigned_to_id opcionales, ver sección 6)
GET    /api/tasks/{id}                        # visible para el creador O cualquier miembro accepted del hogar
PATCH  /api/tasks/{id}                        # idem visibilidad; borrado (DELETE) sigue restringido al creador
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

GET    /api/households                                    # mis hogares (miembro accepted)
POST   /api/households                                     (name)
GET    /api/households/{id}                                # 404 si no soy accepted (incluye pending sin aceptar)
PATCH  /api/households/{id}                                # solo dueño
DELETE /api/households/{id}                                # solo dueño; SET NULL en tasks/shopping_lists
POST   /api/households/{id}/members                        (email) # invitar, solo dueño
DELETE /api/households/{id}/members/{member_id}             # expulsar/cancelar invitación, solo dueño
POST   /api/households/{id}/leave                           # miembro accepted no-dueño
GET    /api/households/invitations/pending                  # mis invitaciones pendientes, cualquier hogar
POST   /api/households/invitations/{member_id}/accept
POST   /api/households/invitations/{member_id}/decline      # borra la fila (permite re-invitar)

GET    /api/shopping/lists                                  # propias + de hogares donde soy accepted
POST   /api/shopping/lists                                   (name, household_id?)
GET    /api/shopping/lists/{id}                               # con items[]
PATCH  /api/shopping/lists/{id}                                # solo quien la creó (list.user_id)
DELETE /api/shopping/lists/{id}                                 # idem
POST   /api/shopping/lists/{id}/items                            (name, quantity?, unit?, notes?, category_id?)
PATCH  /api/shopping/lists/{id}/items/{item_id}                   # is_purchased=true -> registra ShoppingHistory
DELETE /api/shopping/lists/{id}/items/{item_id}
GET    /api/shopping/suggestions                                  # heurística de recompra, siempre personal (no por hogar)

GET    /api/documents?category=&expiring_within_days=
POST   /api/documents                                       (name, category, expiry_date?, notes?; sin archivo)
GET    /api/documents/{id}
PATCH  /api/documents/{id}
DELETE /api/documents/{id}                                    # borra tambien el archivo en el storage si tenia uno
POST   /api/documents/{id}/file                                (multipart/form-data: file) # sube/reemplaza el adjunto
GET    /api/documents/{id}/file                                 # streamea el archivo (el backend SIEMPRE actua de proxy, ver seccion 6.18)
DELETE /api/documents/{id}/file                                  # quita el adjunto, conserva la metadata del documento

GET    /api/vehicles
POST   /api/vehicles                                          (brand, model, year?, license_plate?, mileage?)
GET    /api/vehicles/{id}                                      # incluye maintenance_records[]
PATCH  /api/vehicles/{id}
DELETE /api/vehicles/{id}                                       # cascada sobre vehicle_maintenance
POST   /api/vehicles/{id}/maintenance                            (type, date, description?, mileage_at_service?, cost?, next_due_date?, next_due_mileage?)
PATCH  /api/vehicles/{id}/maintenance/{maintenance_id}
DELETE /api/vehicles/{id}/maintenance/{maintenance_id}

GET    /api/events?start_after=&start_before=&category_id=&household_id=   # filtro de rango solo sobre start_at, ver seccion 2 punto 11
POST   /api/events                                            (title, start_at, end_at?, all_day?, location?, category_id?, household_id?)
GET    /api/events/{id}                                        # visible para el creador O cualquier miembro accepted del hogar
PATCH  /api/events/{id}                                         # idem visibilidad; borrado sigue restringido al creador
DELETE /api/events/{id}

GET    /api/notifications?unread_only=&limit=            # solo canal IN_APP, mas nuevas primero
GET    /api/notifications/unread-count                    # {count: int}
PATCH  /api/notifications/{id}/read                        # idempotente
POST   /api/notifications/read-all                          # {updated: int}
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
14. **Hogares con multi-usuario real** (decisión explícita del usuario en la Fase 4, no un placeholder de un solo usuario). Diseño acordado: `HouseholdMember.status` (`pending`/`accepted`) modela la invitación — no hay un modelo `HouseholdInvitation` aparte. **Administrar el hogar (invitar, expulsar, renombrar, borrar) es exclusivo del dueño**; el uso cotidiano (crear tareas de hogar, asignarlas a cualquier miembro `accepted`, compartir listas de compras, agregar/marcar ítems) está abierto a cualquier miembro `accepted`, no solo al dueño. Rechazar una invitación **borra la fila** (no queda un estado `declined`) para poder re-invitar sin choque con el `UniqueConstraint`. El dueño no puede abandonar ni auto-expulsarse — su única salida es borrar el hogar completo. **No agregar un tercer rol ni un modelo de invitación separado sin que el usuario lo pida** — mantener esto simple fue una decisión consciente, no una limitación técnica.
15. **Visibilidad de tareas de hogar**: una tarea con `household_id` es visible (lectura y edición/completado) para **cualquier miembro `accepted` del hogar**, no solo para quien la asignó o la persona asignada — es una lista de tareas compartida del hogar, no un buzón privado por persona. **Borrar sigue restringido a quien la creó** (`task.user_id`), para que nadie borre por accidente una tarea ajena del hogar. Ver `TaskRepository.get_visible` vs. `get_owned` en `backend/app/repositories/task_repository.py`.
16. **Sugerencias de recompra siempre son personales, nunca por hogar** — `ShoppingHistory` no tiene `household_id` a propósito, aunque una lista de compras sí pueda ser de hogar. No inventarle al historial una noción de "consumo compartido" sin que el usuario lo pida explícitamente; mantiene el alcance chico (ver `backend/app/services/shopping_service.py::get_suggestions`, heurística simple de intervalo promedio entre compras, sin ML).
17. **Convención de enums de Postgres: MAYÚSCULA, no minúscula.** SQLAlchemy serializa los miembros de un `class X(str, enum.Enum)` por su `.name` (`'OWNER'`, `'PENDING'`), no por su `.value` en minúscula — confirmado empíricamente en la Fase 4 tras encontrar el bug de `category_type`/`'reminder'` (ver sección 2). **Cualquier migración nueva que cree un enum o le agregue un valor debe usar el nombre del miembro en mayúscula**, nunca el `.value` de Python.
18. **Almacenamiento de archivos: bucket S3-compatible (MinIO en desarrollo), no filesystem local.** Decisión explícita del usuario al arrancar la Fase 5 (ver `AskUserQuestion` de esa sesión). `StorageService` (`backend/app/services/storage_service.py`) envuelve un cliente `boto3` apuntando a `S3_ENDPOINT_URL`. **El archivo nunca se sirve con una URL firmada directa al navegador** — el backend siempre actúa de proxy (`DocumentService.get_file_stream` + `StreamingResponse`), porque el endpoint interno de MinIO (`http://minio:9000`, red de Docker) no es alcanzable desde el navegador del usuario en `localhost`. **No introducir URLs presignadas sin resolver ese problema de red primero** (ver un endpoint público separado si hiciera falta en el futuro).
19. **Documentos y Vehículos son estrictamente personales, sin `household_id`.** Decisión explícita del usuario al arrancar la Fase 5, a diferencia de Tareas/Compras (Fase 4) que sí admiten `household_id` opcional. Los modelos `Document`/`Vehicle`/`VehicleMaintenance` no tienen columna de hogar y **no se debe agregar** sin que el usuario lo pida explícitamente otra vez.
20. **Eventos del Calendario SÍ admiten `household_id` opcional**, igual que Tareas/Compras (a diferencia del punto 19). Decisión explícita del usuario al arrancar la Fase 6. Mismo patrón de visibilidad que Tareas: visible/editable por cualquier miembro `accepted` del hogar, borrado restringido a quien lo creó (`EventService`/`EventRepository`, espejo de `TaskService`/`TaskRepository`).
21. **La Fase 7 (Asistente de IA) fue descartada explícitamente por el usuario**, no pospuesta. Se construyó, se probó y luego se revirtió por completo porque el usuario no tenía una API key real de OpenAI y decidió no conseguir una (ver nota al principio del documento). **No la reintentes sin que el usuario la pida de nuevo.**
22. **Notificaciones: worker en el mismo contenedor backend con APScheduler, no un servicio aparte.** Decisión explícita del usuario al arrancar la Fase 8 (vía `AskUserQuestion`, alternativa descartada: Celery + Redis). `BackgroundScheduler` arranca en el `lifespan` de `main.py` **solo si `settings.SCHEDULER_ENABLED`** (default `True`; `tests/conftest.py` lo fija en `"false"` vía `os.environ` **antes** de importar `app.core.config`, para que la suite no dispare chequeos reales contra la DB de test en un hilo de fondo -- ver sección 7 para el porqué del orden de ese import). **No migrar a Celery/Redis sin que el usuario lo pida.**
23. **Notificaciones: canales in-app (real) + email (placeholder que solo loguea, mismo `EmailService` de siempre), sin push en esta fase.** Decisión explícita del usuario. `NotificationChannel.PUSH` existe en el enum pero no se usa -- agregar push real es una fase de trabajo aparte (Service Worker + VAPID), no una extensión trivial.
24. **Notificaciones: el alcance son Recordatorios + Documentos + Vehículos + Eventos del Calendario**, no Tareas ni Suscripciones. Decisión explícita del usuario. `Reminder` usa su propio `advance_notice_days` (por-item, ya existía); Documentos/Vehículos/Eventos usan un umbral fijo `_DEFAULT_NOTICE_DAYS = (7, 1)` en `notification_dispatch_service.py` porque no tienen ese campo configurable. **No sumar Tareas/Suscripciones ni cambiar el umbral fijo sin que el usuario lo pida** -- son decisiones de producto, no defaults técnicos arbitrarios.
25. **El tema (dark/light/system) se maneja con un módulo singleton (`frontend/src/utils/theme.ts`), no con un store de Zustand.** Decisión técnica de la Fase 9, consistente con el punto 11 (sin over-engineering, Zustand solo para auth): aplicar/leer la clase `.dark` del `<html>` es un efecto de DOM imperativo, no estado de React que algo necesite re-renderizar en base a él. `SettingsPage` sí mantiene su propio `useState<Theme>` local para pintar qué botón está seleccionado, igual que hace con moneda/widgets. **No migrar esto a un store global sin una razón concreta** (ej. que otro componente además de Configuración necesite leer el tema actual como estado reactivo de React, no solo aplicarlo al DOM).
26. **El focus trap de `Modal.tsx` salta a propósito el botón "Cerrar" al decidir el foco inicial** (busca el primer elemento focuseable cuyo `aria-label` no sea `"Cerrar"`), aunque ese botón sea el primer nodo DOM focuseable del panel. Encontrado probando con teclado en la Fase 9: sin este salto, cada modal arranca con el foco en la X en vez de en el primer campo del formulario, forzando a cualquier usuario de teclado a tabear de más para empezar a escribir. **Si se agrega un botón nuevo antes de los campos del formulario en algún `*FormModal`,** revisar que este salto siga aterrizando en el lugar correcto.
27. **El producto se renombró de "LifeHub" a "Vida En Orden" después de terminar las 11 fases originales**, a pedido explícito del usuario. Alcance del rename decidido con `AskUserQuestion`: **solo el nombre visible** (título de la UI, `<title>`/meta description del `index.html`, `Logo.tsx`, footer de `AuthLayout`, textos sueltos en Dashboard/Configuración, el email de invitación a un hogar, `PROJECT_NAME` en `config.py` que se ve en el título de Swagger, README/HANDOFF/LICENSE). **Deliberadamente NO se tocó** la carpeta local (`lifehub/`), el repo de GitHub (`laradietz/lifehub`), ni ningún identificador técnico en minúscula (`POSTGRES_DB=lifehub`, `S3_BUCKET_NAME=lifehub`, nombres de los loggers `"lifehub"`/`"lifehub.email"`/etc., nombres de volúmenes Docker `lifehub_pgdata`/`lifehub_minio_data`) — cambiar cualquiera de esos rompe cosas (rutas de esta sesión, volúmenes con datos ya creados, URLs de S3) sin ningún beneficio real, y el usuario no lo pidió. **Si se quiere ir más allá en el futuro** (renombrar el repo de GitHub, por ejemplo `gh repo rename`), es una decisión aparte que hay que volver a confirmar explícitamente, no asumirla por la relación obvia entre los nombres.
28. **El producto se renombró otra vez, de "Vida En Orden" a "Life Under Control"**, en una sesión posterior de auditoría de seguridad y correcciones pre-producción (2026-09-17; esa sesión generó `AUDITORIA.md`/`CORRECCIONES.md` en la raíz del repo, pero no está resumida como sección aparte acá en el HANDOFF — si hace falta retomarla, esos dos archivos tienen el detalle completo). Mismo alcance que el rename anterior (punto 27) y mismo criterio: **solo el nombre visible** — `index.html` (`<title>`/meta description), `Logo.tsx` (texto y la letra del ícono, de "V" a "L"), footer de `AuthLayout`, textos sueltos en Dashboard/Configuración, el email de invitación a un hogar y el de reset de contraseña, `PROJECT_NAME`/`SMTP_FROM_NAME`/`SMTP_FROM_EMAIL` en `config.py`, README/HANDOFF/LICENSE. **Deliberadamente NO se tocó** nada de lo que el punto 27 ya dejó documentado como intocable (carpeta local, repo de GitHub, `POSTGRES_DB`/`S3_BUCKET_NAME`/loggers/volúmenes Docker en minúscula `lifehub`) — se mantiene el mismo criterio aunque ya sea el segundo rename: esos identificadores técnicos no tienen que perseguir al nombre de marca. `AUDITORIA.md`/`CORRECCIONES.md` (de la sesión anterior) **no se tocaron** — quedan como snapshot histórico fechado que documenta el estado real de esa sesión, incluido el nombre que tenía el producto en ese momento; no tiene sentido reescribir retroactivamente un informe de auditoría.

### Qué NO cambiar sin que el usuario lo pida
- El esquema de tablas ya migrado (agregar columnas/tablas nuevas está bien vía Alembic; no renombrar/borrar lo existente).
- El flujo de auth (JWT access + refresh persistido y revocable).
- El código de recuperación de contraseña por email (no volver a link con token).
- La arquitectura por capas del backend.
- La ausencia de librerías de estado/data-fetching pesadas en el frontend.
- Que administrar un hogar (invitar/expulsar/renombrar/borrar) sea exclusivo del dueño.
- La convención de enums de Postgres en MAYÚSCULA (punto 17 arriba).
- Que Documentos y Vehículos sean estrictamente personales (sin `household_id`) y que sus archivos se sirvan siempre a través del backend, nunca con URL directa a MinIO (puntos 18-19 arriba).
- Reintentar la Fase 7 (IA) sin que el usuario la pida de nuevo (punto 21 arriba).
- El mecanismo de notificaciones (worker en el mismo contenedor con APScheduler, no Celery/Redis) y su alcance (Recordatorios/Documentos/Vehículos/Eventos, sin Tareas/Suscripciones, sin push) (puntos 22-24 arriba).

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

### 7.6 Por qué `SCHEDULER_ENABLED` se fija en `os.environ` antes de importar `app.core.config` (Fase 8)

`backend/tests/conftest.py` empieza así, **antes de cualquier otro import del proyecto**:

```python
import os
os.environ.setdefault("SCHEDULER_ENABLED", "false")

import pytest
# ... resto de imports, incluido `from app.core.config import settings`
```

**Motivo:** `app/core/config.py` termina con `settings = get_settings()` a nivel de módulo -- se ejecuta **una sola vez, en el momento en que el módulo se importa por primera vez** (gracias a `@lru_cache`). Si `SCHEDULER_ENABLED` no está ya en el entorno de proceso en ese momento, `Settings` toma el default (`True`), y ya no hay forma de cambiarlo después (el objeto `settings` importado en todos lados es el mismo singleton). Como `app/main.py` arranca un `BackgroundScheduler` real en el `lifespan` cuando `SCHEDULER_ENABLED=True`, sin este `os.environ.setdefault` la suite de tests dispararía un hilo de fondo que llama a `run_notification_dispatch()` contra la base de datos real de desarrollo (no la de test) en cada test que use el fixture `client` -- silencioso pero muy indeseable. **Si se agrega otra variable de `Settings` que un test necesite forzar, el patrón es el mismo: fijarla en `os.environ` antes del primer import de `app.core.config`.**

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
| `households` | `models/household.py` | ✅ Completo (Fase 4) | name, owner_id |
| `household_members` | `models/household.py` | ✅ Completo (Fase 4) | household_id, user_id, role (owner/member), **status (pending/accepted, agregado en Fase 4)**, unique(household_id, user_id) |
| `tasks` | `models/task.py` | ✅ Completo | user_id, household_id (nullable), **assigned_to_id (nullable, agregado a schema/service en Fase 4 — la columna ya estaba en la migración inicial)**, category_id, title, description, due_date (datetime), priority, status, recurrence, recurrence_rule, tags (array) |
| `reminders` | `models/reminder.py` | ✅ Completo | user_id, category_id, name, description, due_date (**date**, no datetime), priority, recurrence, advance_notice_days (array int, default [30,7,1]), is_completed |
| `events` | `models/event.py` | ✅ Completo (Fase 6) | user_id, household_id (nullable, admite hogar a diferencia de documents/vehicles), category_id, title, description, start_at, end_at, all_day, location |
| `incomes` | `models/finance.py` | ✅ Completo | user_id, category_id, amount (Numeric 12,2), currency, date, description, payment_method |
| `expenses` | `models/finance.py` | ✅ Completo | igual que incomes |
| `subscriptions` | `models/subscription.py` | ✅ Completo | user_id, category_id, name, price, currency, frequency (weekly/monthly/yearly), next_billing_date, payment_method, is_active |
| `shopping_lists` | `models/shopping.py` | ✅ Completo (Fase 4) | user_id, household_id, name |
| `shopping_items` | `models/shopping.py` | ✅ Completo (Fase 4) | shopping_list_id, category_id, name, quantity, unit, notes, is_purchased, purchased_at |
| `shopping_history` | `models/shopping.py` | ✅ Completo (Fase 4) | user_id, item_name, purchased_at — usada por `ShoppingService.get_suggestions` para estimar frecuencia de recompra |
| `documents` | `models/document.py` | ✅ Completo (Fase 5) | user_id, name, category (DocumentCategory), expiry_date, notes, storage_key (interno, nunca expuesto en la API), file_name, file_size, mime_type |
| `vehicles` | `models/vehicle.py` | ✅ Completo (Fase 5) | user_id, brand, model, year, license_plate, mileage (se actualiza solo al registrar un mantenimiento con `mileage_at_service` mayor) |
| `vehicle_maintenance` | `models/vehicle.py` | ✅ Completo (Fase 5) | vehicle_id, type, description, date, mileage_at_service, cost, next_due_date, next_due_mileage |
| `notifications` | `models/notification.py` | ✅ Completo (Fase 8) | user_id, type, channel, title, message, is_read, related_entity_type/id, scheduled_for (columna sin usar todavía -- pensada para notificaciones programadas a futuro, el dispatcher actual solo crea notificaciones "ya" cuando detecta el vencimiento), sent_at |

**Enums nativos de Postgres** (todos en `backend/app/models/enums.py`): `TaskStatus`, `Priority`, `RecurrenceType`, `PaymentMethod`, `SubscriptionFrequency`, `NotificationChannel`, `NotificationType` (Fase 8 agregó `DOCUMENT`/`VEHICLE`, ver migración abajo), `HouseholdRole`, `HouseholdMemberStatus` (nuevo en Fase 4: `PENDING`/`ACCEPTED`), `CategoryType`, `DocumentCategory`, `VehicleMaintenanceType`. **Importante (encontrado en la Fase 4, ver sección 2 "bug crítico"):** SQLAlchemy guarda estos enums usando el `.name` del miembro de Python en MAYÚSCULA (`'OWNER'`, `'PENDING'`, `'TASK'`...), no el `.value` en minúscula — confirmado corriendo `Enum(...).bind_processor(None)` y consultando los valores reales con `psql`. Cualquier migración nueva que cree un enum o le agregue un valor tiene que usar la forma MAYÚSCULA, igual que `567e2b7bfb30` ya hacía para el resto — el error real de este proyecto fue que `39c2e9c87f49` no siguió esa convención.

**Migraciones aplicadas** (en orden): `567e2b7bfb30` (esquema inicial) → `7b71c7086eaa` (agrega `attempts` a `password_reset_tokens`) → `39c2e9c87f49` (agrega `'reminder'` minúscula al enum `category_type` — **valor incorrecto, no lo uses de referencia**) → `a47597b1593c` (Fase 4: agrega el valor correcto `'REMINDER'` mayúscula y migra filas existentes) → `1deb3fc6c345` (Fase 4: crea el enum `household_member_status` y la columna `status` en `household_members`, `server_default='ACCEPTED'`) → `c8f3a19d4b21` (Fase 6: agrega el valor `'EVENT'` al enum `category_type`) → `d4a1f6e29b7c` (Fase 8: agrega los valores `'DOCUMENT'`/`'VEHICLE'` al enum `notification_type`).

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

# Almacenamiento de archivos (Fase 5, MinIO en desarrollo)
S3_ENDPOINT_URL=http://minio:9000
S3_ACCESS_KEY=lifehub
S3_SECRET_KEY=lifehub12345
S3_BUCKET_NAME=lifehub
S3_REGION=us-east-1

# Notificaciones (Fase 8) -- valores por defecto en Settings, no hace falta declararlas
# en .env salvo que se quieran cambiar: SCHEDULER_ENABLED=true, NOTIFICATION_CHECK_INTERVAL_MINUTES=15

VITE_API_URL=http://localhost:8000/api
```

**Nota sobre `OPENAI_API_KEY`:** la Fase 7 (Asistente de IA) fue descartada (ver nota al principio del documento) y su código no existe en el repo actual, así que `OPENAI_API_KEY`/`OPENAI_MODEL` ya no están en `config.py` ni en `.env.example`. Si se retoma esa fase en el futuro, hay que volver a agregarlos.

El `.env` real de esta máquina **ya existe** en `lifehub/.env` con un `SECRET_KEY` generado — no hace falta recrearlo salvo que se haya perdido.

### Puertos
- Backend: `8000` (`http://localhost:8000`, Swagger en `/api/docs`)
- Frontend: `5173` (`http://localhost:5173`)
- PostgreSQL: `5432`
- MinIO (Fase 5): API S3 en `9000`, consola web en `9001` (`http://localhost:9001`, login con `S3_ACCESS_KEY`/`S3_SECRET_KEY`)

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
| 9 | `docker compose up` fallaba al traer la imagen `minio/minio:...` con `pull access denied` | Docker Hub restringió el pull anónimo/sin login de algunas imágenes oficiales de MinIO; el mirror correcto sigue disponible sin login en otro registry | Cambiar la imagen en `docker-compose.yml` a `quay.io/minio/minio:RELEASE.2024-11-07T00-52-20Z` |
| 10 | Warning de FastAPI `on_event is deprecated` al arrancar el backend | `@app.on_event("startup")` es la API vieja para hooks de arranque | Reemplazado por un `lifespan` (`@asynccontextmanager`) en `main.py` que llama a `get_storage_service().ensure_bucket()` |

**Qué NO funcionó / se descartó:**
- Confiar en que Alembic `--autogenerate` detecte cambios de enum — no lo hace, siempre hay que revisar el diff generado.
- Poner el estado de "cargando" del login/register en el store global de auth — rompe el UX de error (ver problema #3).

---

## 11. Próximos pasos

**Las 11 fases del plan original ya están completas** (Fase 7 descartada explícitamente, ver nota al principio). No hay una "próxima fase" definida — lo que sigue depende de qué quiera el usuario:

1. **Si el usuario pide algo nuevo**, tratarlo como fuera del plan de fases original (como ya pasó con el cambio de recuperación de contraseña a código de 6 dígitos) — no inventarle un número de fase.
2. **Si el usuario quiere ir a producción de verdad** (no solo el empaquetado Docker de la Fase 11): recorrer el checklist del README sección "Despliegue en producción" — el más importante es reemplazar las credenciales de desarrollo de MinIO (`S3_ACCESS_KEY`/`S3_SECRET_KEY` hardcodeadas como default en `config.py`) por un storage S3 real, y conseguir un proveedor de email real para `EmailService` (usado por recuperación de contraseña/invitaciones de hogar y por las notificaciones de la Fase 8).
3. **Fase 7 (IA) — descartada, no está en la cola.** Solo retomarla si el usuario la pide explícitamente de nuevo (ver nota al principio del documento y sección 6 punto 21).
4. Si se quiere ampliar la cobertura de tests de frontend más allá de lo que dejó la Fase 10 (utilidades, componentes críticos, store de auth), el siguiente escalón natural son los `Page`/`*FormModal` de cada módulo y tests end-to-end de navegador (ver "Pendiente menor" más abajo).

### Pendiente menor arrastrado de fases anteriores (no bloqueante)
- Limpiar `Task.assigned_to_id` automáticamente cuando la persona asignada es expulsada del hogar o lo abandona (ver problema pendiente #8 en la sección 2).
- Widget de "Compras" en el Dashboard/Settings (conteo de ítems pendientes) — se dejó fuera de la Fase 4 a propósito para no ampliar el alcance; requiere tocar `DashboardService`/schema de dashboard.
- Integrar vencimientos de Documentos, mantenimientos de Vehículos y eventos del Calendario al widget "Próximos vencimientos" del dashboard — se dejó fuera de las Fases 5/6 a propósito, mismo criterio que el punto anterior (ver problema pendiente #9 en la sección 2). Ahora que la Fase 8 existe, esos vencimientos SÍ generan notificaciones (campanita), pero el widget del Dashboard sigue sin tocarse.
- El filtro de rango de fechas del Calendario no hace overlap con `end_at` (ver problema pendiente #18 en la sección 2) — no bloqueante mientras los eventos multi-día no sean un caso de uso central.
- Notificaciones: sin lógica de catch-up, umbral fijo (7,1) para Documentos/Vehículos/Eventos, sin canal push, sin Tareas/Suscripciones (ver problemas pendientes #12-17 en la sección 2) — todas decisiones conscientes de alcance de la Fase 8, no bugs.
- Fase 9: no se corrió ninguna herramienta automática de auditoría de accesibilidad (ej. axe-core, Lighthouse) ni un chequeo sistemático de contraste de colores -- la verificación fue manual (teclado + navegador real) sobre los overlays existentes (modales, campanita, drawer mobile).
- Fase 10: tests de `Page`/`*FormModal` por módulo, de la capa `services/`, y end-to-end de navegador (Playwright/Cypress) quedaron fuera de alcance a propósito (ver el bullet de la Fase 10 en la sección 2) -- si se quiere ampliar la cobertura de frontend, ese es el próximo escalón natural.

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
- **No toques el repo Git de la raíz de `Downloads`** (el padre de `lifehub/`) — `lifehub/` tiene su propio repo independiente, con remoto propio (`origin` → `https://github.com/laradietz/lifehub`, privado, desde la Fase 11).
- Los commits de git deben terminar con `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` (instrucción de sistema vigente en este entorno).
- Si algo del pedido del usuario no está claro o falta una decisión de producto, **preguntá antes de asumir** (usá `AskUserQuestion` con opciones concretas, no una pregunta abierta) — así se resolvieron el alcance/proveedor/acceso a datos de la Fase 7 y el disparador/canales/alcance de la Fase 8 (sección 6, puntos 21-24). Si el usuario cambia de opinión después de que ya implementaste y probaste algo (como pasó con la Fase 7), revertí con `git checkout`/borrando los archivos nuevos en vez de dejar código muerto a medio camino.

---

## 13. Rediseño de UI/UX (post plan de 11 fases, 2026-09-16)

Con las 11 fases originales ya completas, el usuario pidió una mejora integral de diseño visual y UX de **toda la app existente**, explícitamente **sin rehacer nada desde cero, sin tocar la lógica de negocio ni las APIs, y preservando toda la funcionalidad**. Antes de tocar código se analizó la base existente (Tailwind v4 con paleta `brand` violeta ya definida, componentes UI reutilizables en `components/ui/`, patrón `Page + *FormModal + *Item` por módulo, dark mode y accesibilidad de teclado ya resueltos en la Fase 9) y se decidió **construir sobre ese sistema, no reemplazarlo** — la identidad visual (paleta neutra + acento violeta, sin gradientes, sombras sutiles, decisión de la sección 6 punto 9) se mantuvo intacta a propósito.

### Infraestructura nueva (una sola vez, después reusada en todos lados)
- **`lucide-react`** (nueva dependencia, ~1.5KB por ícono usado, tree-shakeable): reemplaza los emoji sueltos que había en toda la app (nav, empty states, botones de editar/eliminar, etc.) por íconos SVG coherentes. Es la única librería nueva agregada — no se tocó nada del stack de gráficos (siguen siendo SVG a mano, sección 6 punto 8) ni de estado/data-fetching.
- **Sistema de toasts** (`frontend/src/store/toastStore.ts` + `frontend/src/components/ui/Toaster.tsx`): un store de Zustand minimalista (siguiendo el mismo patrón de `authStore.ts`, sección 6 punto 25 sobre cuándo SÍ usar Zustand) con una API imperativa `toast.success()/error()/info()` para poder llamarla desde cualquier handler async sin enganchar un hook. `<Toaster />` se monta una sola vez en `App.tsx`, fuera de las `Routes`, así que cubre tanto las páginas autenticadas como las de auth. Auto-dismiss a los 4 segundos, o manual con el botón de cerrar.
- **`SearchInput`** (`frontend/src/components/ui/SearchInput.tsx`): input de búsqueda reutilizable con ícono y botón de limpiar. El filtrado es siempre **client-side** (`useMemo` sobre la lista ya cargada) — no se agregó ningún parámetro nuevo a los endpoints existentes, para no tocar las APIs.
- **Animaciones** (`frontend/src/index.css`, dentro de `@theme`): `--animate-fade-in`, `--animate-modal-in`, `--animate-toast-in` (200-250ms, sin rebote exagerado a propósito — el usuario pidió explícitamente "no abuses de las animaciones"). Con `@media (prefers-reduced-motion: reduce)` que las anula casi por completo, para accesibilidad. `Modal.tsx` y el panel de `NotificationBell.tsx` usan `animate-modal-in` + `backdrop-blur-sm` en el fondo; el `Toaster` usa `animate-toast-in`.
- **`Button.tsx`**: se agregó `active:scale-[0.97]` (feedback táctil al presionar, con `transition-all`) sin tocar las variantes/colores existentes.
- **`Card.tsx`**: nueva prop opcional `interactive` (hover con elevación + borde violeta) para cards que son un link — no rompe ningún uso existente porque es opt-in.

### Qué se aplicó en cada módulo (Tareas, Recordatorios, Finanzas, Suscripciones, Compras, Documentos, Vehículos, Calendario, Hogar, Configuración, Dashboard, campanita de notificaciones)
- **Toasts en cada mutación**: crear/editar/eliminar/completar ahora muestra un toast de éxito, y los `catch` que antes solo seteaban un `error` local (o ni eso) ahora también hacen `toast.error(...)`. Los `Alert` inline que ya existían para errores de carga de página **se dejaron intactos** — el toast es un agregado, no un reemplazo.
- **Búsqueda client-side** en las listas más largas: Tareas, Recordatorios, Finanzas (transacciones), Suscripciones, Documentos. Compras y Vehículos no la necesitaban (listas cortas por naturaleza).
- **Orden en Finanzas**: los botones "Fecha"/"Monto" arriba de la lista de transacciones alternan ascendente/descendente (`useMemo`, mismo patrón que la búsqueda).
- **Íconos coherentes** reemplazando todos los emoji: nav del sidebar (`AppLayout.tsx`), empty states de cada página, botones de Editar/Eliminar en cada `*Item.tsx`, tipos de notificación en la campanita, iconos de tema (sol/luna/laptop) en Configuración.
- **Hover states** en las filas de lista que no los tenían (`rounded-lg` + `hover:bg-slate-50 dark:hover:bg-slate-800/60` + `transition-colors`), consistente en todos los `*Item.tsx`.
- **Dashboard**: cada card tiene ahora un ícono de cabecera (`CardHeading`, componente local nuevo en `DashboardPage.tsx`) y las `StatTile` muestran un ícono sutil además del número.

### Qué NO se tocó (a propósito)
- **Ningún endpoint, schema ni modelo del backend.** Todo el trabajo es 100% frontend. La única excepción es el texto del email de invitación a un hogar (`household_service.py`), tocado en el commit de rename anterior a esta sesión de rediseño, no en esta.
- **Ninguna lógica de negocio ni de fetching** — los `load*()`/`handle*()` de cada página siguen llamando a los mismos `services/*.ts` de siempre; lo único que cambió es que ahora también llaman a `toast.success/error` alrededor.
- **La paleta de colores, la tipografía y el sistema de componentes existente** (sección 6 punto 9) — no se introdujo un design system nuevo, se reforzó el que ya había.
- **Las páginas de auth (Login/Register/ForgotPassword) y `NotFoundPage`** quedaron prácticamente como estaban — ya eran limpias y minimalistas (layout split-screen de la Fase 1), y no tienen listas/tablas ni acciones que se beneficien de toasts.
- **No se convirtió ninguna lista en una tabla HTML real** (`<table>`) — se mantuvo el patrón de card-list con filas (`<li>`) que ya usaba toda la app, solo con mejor hover/spacing/íconos. Es un patrón visual legítimo de SaaS moderno, y cambiarlo hubiera sido un rediseño estructural, no visual.
- **No se tocaron los charts** (`ExpenseCategoryChart`/`IncomeExpenseTrendChart`, SVG a mano) más allá de lo que ya tenían.

### Verificado
`docker compose exec backend pytest -q` (115 passed, sin cambios), `docker compose exec frontend npx vitest run` (**72 passed** — los 53 de la Fase 10 más 19 nuevos, ver abajo), `docker compose exec frontend npx tsc -b` y `npx oxlint` (0 errores, mismos 17 warnings preexistentes) limpios. Probado en navegador real: creación/edición/borrado de una tarea con toast visible, dark mode completo (todas las páginas nuevas), drawer mobile a 375px con blur y animación, búsqueda y orden en Finanzas, focus trap de modales (Fase 9) sigue funcionando sin cambios.

### Tests nuevos agregados para lo de esta sección (19, después de la primera pasada)
El usuario preguntó explícitamente por qué no se habían escrito todavía — no era una limitación técnica, solo faltaba hacerlo — así que se agregó en la misma sesión:
- `toastStore.test.ts` (4 tests): agregar, ids únicos, `dismiss` selectivo, auto-descarte a los 4s (`vi.useFakeTimers`).
- `Toaster.test.tsx` (4 tests): no renderiza nada sin toasts, muestra el mensaje, varios toasts a la vez, cerrar con el botón. **Ojo con el patrón:** llamar a `toast.success(...)` desde un test actualiza el store de Zustand por fuera del ciclo de eventos de React, así que sin envolverlo en `act()` (de `@testing-library/react`) el DOM no llega a reflejar el cambio antes del assert — los primeros intentos fallaron por esto.
- `SearchInput.test.tsx` (5 tests): placeholder por defecto/personalizado, `onChange` por cada tecla, el botón de limpiar solo aparece con valor y vacía el input.
- **`src/test/a11y.test.tsx` (6 tests), auditoría automática de accesibilidad con `jest-axe`** (no `vitest-axe`, que solo tiene versiones `pre-release` — `jest-axe` es estable y su matcher no depende de nada específico de Jest, funciona igual con el `expect` de Vitest registrándolo en `src/test/setup.ts` + una augmentación de tipos en `src/test/vitest-axe.d.ts`). Corre axe-core contra `Button`, `Input`, `Select`, `SearchInput`, `Badge`/`Alert` y el `Modal` abierto (auditando `document.body`, no el container de `render()`, porque el Modal se monta en un portal). La regla `color-contrast` se desactiva a propósito: jsdom no calcula layout/estilos reales, así que esa regla específica no tiene con qué trabajar en este entorno — el resto (roles ARIA, labels, estructura) sí corre normal. **No cubre páginas completas** (requeriría mockear cada `service`), solo los primitivos de `components/ui/` — si se quiere ampliar, el siguiente paso natural es correr `axe()` contra el DOM ya renderizado de alguna página en un test de integración.

### Pendiente si se quiere ir más lejos (no bloqueante, fuera de alcance de este pedido)
- Auditoría de accesibilidad automática a nivel de página completa (hoy es solo a nivel de componente base, ver arriba).
- Si en el futuro las listas crecen mucho (cientos de ítems), la búsqueda/orden client-side actual dejaría de alcanzar y habría que paginar/filtrar en el backend — **decisión consciente de no construirlo ahora**: es una app personal, las listas reales son chicas, y agregar paginación/filtrado en el backend sin un caso de uso real sería sobre-ingeniería (va en contra de la sección 6 punto 11, "evitá sobreingeniería"). Si el usuario reporta que una lista se volvió lenta, ahí sí se justifica.

---

## PRÓXIMA ACCIÓN

**Las 11 fases del plan original ya están completas, y encima de eso ya se hizo un rediseño de UI/UX (sección 13), una auditoría de seguridad y correcciones pre-producción (`AUDITORIA.md`/`CORRECCIONES.md`, no resumida en sección aparte acá), y dos renames — a "Vida En Orden" y después a "Life Under Control" (sección 6, puntos 27 y 28).** No asumas que hay una "próxima fase" esperando — preguntale al usuario qué quiere hacer ahora (ver sección 11).

1. Confirmar que Docker Desktop esté corriendo (`docker info`); si no, arrancarlo (sección 9) y esperar. **Nota de la Fase 6:** en esta máquina, Docker Desktop puede quedar "corriendo" según `tasklist` pero con la VM de WSL2 (`docker-desktop`) en estado `Stopped` (`wsl -l -v` lo muestra) durante varios minutos hasta que termina de levantar del todo — no asumir que está roto solo porque `docker info` tarda; si pasan más de ~15-20 minutos sin responder, ahí sí puede hacer falta reiniciar Docker Desktop a mano.
2. `cd "C:\Users\Larita\Downloads\lifehub" && docker compose up -d` (si se tocó código del backend, correr `docker compose up -d --build` en su lugar). Este es el compose de **desarrollo** — para probar el empaquetado de producción de la Fase 11 es `docker compose -f docker-compose.prod.yml up -d --build` (ver README, sección "Despliegue en producción"), pero ojo que pisa los puertos 80/8000 así que no correrlo al mismo tiempo que el de desarrollo sin ajustar puertos.
3. Verificar que todo sigue sano: `docker compose exec backend alembic upgrade head`, `docker compose exec backend pytest -q` (debería dar **115 passed**), `docker compose exec frontend npx vitest run` (debería dar **72 passed** — incluye los tests de accesibilidad con `jest-axe`, sección 13), `docker compose exec frontend npx tsc -b` y `docker compose exec frontend npx oxlint`, y abrir `http://localhost:5173` en el navegador para confirmar que carga el login, que el sidebar tiene íconos (no emoji) y que las acciones muestran un toast.
4. El repo ya está publicado en GitHub (`https://github.com/laradietz/lifehub`, privado) — antes de hacer push de cambios nuevos, recordar que es un repo real ahora, no solo local (revisar que no se cuele nada sensible en el diff antes de commitear, mismo cuidado de siempre). La Fase 7 (IA) está descartada, no la propongas de nuevo salvo que el usuario la pida explícitamente.
5. **Verificar si los cambios del rediseño de UI/UX (sección 13) ya están commiteados** al retomar (`git status`/`git log`) — nunca commitear sin que el usuario lo pida explícitamente (instrucción de sistema vigente en este entorno).
