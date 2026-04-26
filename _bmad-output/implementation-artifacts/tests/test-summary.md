# Test Automation Summary

## Marco detectado

- **Unit / integración API (Jest + `next/jest`):** `__tests__/**/*.test.ts` — ya existía; se excluye `e2e/` del runner de Jest.
- **E2E contra servidor real (Playwright):** carpeta `e2e/`, arranque automático con `npm run dev` en **puerto 3003** (`playwright.config.ts`).

## Pruebas generadas / actualizadas

### API (Jest, mocks)

- [x] `__tests__/api/expenses.route.test.ts` — validación `per_page`, respuesta paginada + totales, valores no finitos en columnas monetarias.
- [x] `__tests__/services/currency.test.ts` — conversión COP/USD (existente).

### E2E backend + “frontend” HTTP (Playwright `request`, sin UI Chromium)

- [x] `e2e/api-backend.spec.ts` — `GET /api/docs-json` (OpenAPI 3.0), `GET /api/exchange-rate` (`rate` finito), rutas protegidas sin cookie → **401** + `{ error: 'Unauthorized' }` (muestra representativa de la API: `me`, `users`, `categories`, `expenses`, analytics, `POST/PATCH/DELETE` gastos, `POST` upload).
- [x] `e2e/app-http.spec.ts` — redirecciones `/` → login, `/dashboard` y `/expenses` sin sesión → login; HTML de `/login` y `/docs` (smoke sin ejecutar JavaScript del cliente).

### E2E UI con Chromium (clics, DOM)

- [ ] No incluido por defecto: en algunos entornos (p. ej. sandbox) **Chromium headless puede fallar con SIGSEGV**; las comprobaciones equivalentes de rutas públicas/protegidas están cubiertas por **`app-http.spec.ts`** vía HTTP.

## Cobertura (orientativa)

| Área | Cobertura en esta pasada |
|------|---------------------------|
| Rutas App Router listadas en el repo (`/`, `/login`, `/dashboard`, `/expenses`, `/docs`) | Smoke HTTP + redirecciones auth |
| API bajo `/api/*` | Contrato público (`docs-json`, `exchange-rate`) + **401** uniforme en rutas con sesión obligatoria (lista anterior) |
| Flujos autenticados (dashboard con datos, CRUD gastos en UI) | **No** — requieren sesión real (p. ej. `storageState` tras login Google o usuario de prueba + credenciales en `.env` no versionado). |

## Comandos ejecutados (verificación)

- `npm test` — **PASS** (5 pruebas Jest).
- `npm run test:e2e` — **PASS** (8 pruebas Playwright).

## Próximos pasos sugeridos

- Añadir en CI: `npm test` y `npm run test:e2e` (Playwright instala Chromium en el runner con `npx playwright install --with-deps chromium`).
- Para E2E **con sesión** en dashboard/expenses: definir estrategia (usuario de prueba Supabase, o `storageState` generado localmente) y ampliar `e2e/` con pruebas basadas en `page` (Chromium estable en máquina local / CI estándar).
