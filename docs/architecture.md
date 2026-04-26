# Arquitectura — Gastos

## Resumen ejecutivo

La aplicación sigue un patrón **full-stack en un solo desplegable Next.js**: la interfaz (Server y Client Components) y la capa HTTP (route handlers) conviven bajo `app/`. El estado persistente y la autenticación se delegan a **Supabase**; el tráfico del navegador pasa por **middleware** que refresca la sesión basada en cookies (SSR con `@supabase/ssr`).

## Patrón de arquitectura

- **UI:** componentes en `app/` y `components/`, con hidratación selectiva de componentes cliente (`'use client'` donde aplica).
- **API interna:** convención Next `app/api/<recurso>/route.ts` (REST-like).
- **Datos:** Postgres vía Supabase; esquema versionado en `supabase/migrations/`.
- **Estado de servidor hacia el cliente:** TanStack Query para caché y reintentos; sesión y usuario vía Supabase.
- **Documentación de API:** `swagger-jsdoc` + ruta `GET /api/docs-json` y página `app/docs/`.

## Stack tecnológico

| Categoría | Tecnología | Notas |
|-----------|------------|--------|
| Runtime | Node (Next) | `dev` / `start` en puerto **3003** |
| Lenguaje | TypeScript 5 | `strict: true` |
| Estilos | Tailwind 4 | PostCSS vía `@tailwindcss/postcss` |
| Auth / DB | Supabase | Cliente en `lib/supabase/*` (browser, server, middleware) |
| Formularios | react-hook-form + Zod | Validación alineada con APIs |

## Arquitectura de datos

- Tablas base: `users`, `categories`, `expenses` (ver [data-models.md](./data-models.md)).
- Evolución del esquema: migraciones SQL con cambios de columnas (importes divididos, servicios públicos, etc.).

## Diseño de API

- Endpoints bajo `/api/*` documentados en [api-contracts.md](./api-contracts.md).
- Patrón de seguridad: comprobar usuario en cada handler que acceda a datos del titular (ver [project-context](../_bmad-output/project-context.md)).

## Componentes (alto nivel)

- Inventario: [component-inventory.md](./component-inventory.md).
- **Estado de UI / sesión:** `hooks/use-auth.tsx` y consultas React Query en pantallas bajo `app/(app)/`.

## Flujo de desarrollo y despliegue

- [development-guide.md](./development-guide.md)
- [deployment-guide.md](./deployment-guide.md)

## Pruebas

- Jest con `next/jest`, tests bajo `__tests__/`; ejemplo: `__tests__/services/currency.test.ts`.

## Fuentes de verdad

- Dependencias: `package.json`
- Reglas de equipo/IA: `_bmad-output/project-context.md`
- Esquema DB: `supabase/migrations/*.sql`
