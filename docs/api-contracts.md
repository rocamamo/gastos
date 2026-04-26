# Contratos de API (Gastos)

> Generado con **escaneo rápido**: métodos inferidos por búsqueda de exportaciones en `app/api/**/route.ts`. Para cuerpos exactos, validaciones y códigos de error, usar escaneo profundo o leer cada ruta.

Base: rutas relativas al origen de la aplicación Next (p. ej. `/api/...`).

## Resumen

| Ruta | Métodos | Notas |
|------|---------|--------|
| `/api/me` | GET | Perfil / sesión actual |
| `/api/users` | GET | Usuarios (según lógica de negocio y auth) |
| `/api/categories` | GET | Categorías |
| `/api/expenses` | GET, POST | Listado y creación de gastos |
| `/api/expenses/[id]` | PATCH, DELETE | Actualización y borrado por id |
| `/api/upload` | POST | Subida de archivos |
| `/api/exchange-rate` | GET | Tipo de cambio |
| `/api/analytics/summary` | GET | Resumen analítico |
| `/api/analytics/categories` | GET | Análisis por categorías |
| `/api/analytics/monthly` | GET | Análisis mensual |
| `/api/docs-json` | GET | JSON para documentación (Swagger/OpenAPI vía `lib/swagger.ts`) |

## Autenticación

- Patrón esperado (según `project-context.md`): en handlers, `getUser()` con cliente Supabase servidor; 401 si no hay sesión.
- Middleware global en `middleware.ts` delega en `updateSession` de Supabase.

## GET `/api/expenses`

Listado de gastos con filtros y **paginación server-side**.

**Query params:**

- `month`: `YYYY-MM` (repetible)
- `category_id`: string (repetible)
- `user_id`: string (repetible)
- `search`: string (búsqueda por `detail`)
- `page`: entero \(\ge 1\). Default: `1`
- `per_page`: uno de `10 | 20 | 50`. Default: `20`

**Respuesta 200 (shape):**

```json
{
  "data": [/* expense[] */],
  "pagination": {
    "total": 123,
    "page": 2,
    "per_page": 20,
    "total_pages": 7
  },
  "totals": {
    "amount_cop": 0,
    "amount_usd": 0,
    "amount_divided_cop": 0,
    "amount_divided_usd": 0,
    "amount_divided_3_cop": 0,
    "amount_divided_3_usd": 0,
    "amount_divided_4_cop": 0,
    "amount_divided_4_usd": 0
  }
}
```

Notas:

- `data` mantiene la forma de gasto existente (incluye `users(...)` y `categories(...)` como antes), pero ahora viene envuelto.
- `totals` refleja la suma del **dataset completo filtrado**, no solo de la página actual.

## Documentación interactiva

- Existe UI en `app/docs/page.tsx` y generación en `app/api/docs-json/route.ts` (stack swagger-jsdoc / swagger-ui-react).

## Rutas de aplicación (no bajo `/api`)

- `app/auth/callback/route.ts`: flujo OAuth/callback de Supabase (revisar método en el archivo).
