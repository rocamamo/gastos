# Test Automation Summary

## Marco detectado

- **Unit / integración API (Jest + `next/jest`):** `__tests__/**/*.test.ts` — se excluye `e2e/` del runner de Jest.
- **E2E (Playwright):** carpeta `e2e/`, `npm run dev` en **:3003**; binarios en `node_modules/.cache/playwright` (`PLAYWRIGHT_BROWSERS_PATH` en script `npm run test:e2e`). Instalación: `npm run playwright:install`.

## Estrategia CRUD gastos **sin tocar Supabase / producción**

- **Mocks de red** (`page.route`): respuestas sintéticas para `GET/POST/PATCH/DELETE` bajo `/api/expenses*`, `GET /api/categories`, `GET /api/users`, `GET /api/exchange-rate*`, y `GET **/rest/v1/categories**` (el formulario lee categorías con el cliente Supabase).
- **Bypass solo en desarrollo:** cookie `pw-e2e=1` + `NODE_ENV !== 'production'` en `lib/supabase/middleware.ts` (no aplica en `next start` / producción).
- **Usuario simulado en cliente:** `window.__E2E_USER_ID__` vía `addInitScript` + `hooks/use-auth.tsx` (sin suscripción a `onAuthStateChange` en ese modo, para que no pise el usuario mock).

## Pruebas generadas / actualizadas

### API (Jest, mocks)

- [x] `__tests__/api/expenses.route.test.ts`
- [x] `__tests__/services/currency.test.ts`

### E2E (Playwright)

- [x] `e2e/api-backend.spec.ts` — OpenAPI, `exchange-rate`, 401 en rutas con auth.
- [x] `e2e/app-http.spec.ts` — redirecciones y HTML público vía `request`.
- [x] `e2e/expenses-crud.spec.ts` — **CRUD UI en `/expenses`** con mocks (crear, editar detalle, eliminar con confirmación, listado + paginación página 2).

### Corrección de producto detectada por E2E

- [x] `components/expenses/ExpenseForm.tsx` — en edición el API envía `amount_cop`; el formulario usaba solo `initialData.amount` (0) y Zod bloqueaba el envío. Ahora usa `amount ?? amount_cop`.

## Cobertura (orientativa)

| Área | Cobertura |
|------|-----------|
| CRUD gastos en UI | Crear / editar / eliminar / listar + paginación (todo con datos en memoria del mock) |
| API real con sesión | No (siguen los smoke 401 + contratos públicos) |

## Comandos ejecutados (verificación)

- `npm test` — **PASS**
- `npm run test:e2e` — **PASS** (12 pruebas Playwright)

## Próximos pasos sugeridos

- CI: `npm run playwright:install` (o `npx playwright install chromium`) y luego `npm run test:e2e`.
- Si en local ya tienes `next dev` en 3003, Playwright **reutiliza** ese proceso (`reuseExistingServer: true`); no hace falta variable `E2E_TEST` en el servidor (el bypass depende de `NODE_ENV` + cookie de test).
