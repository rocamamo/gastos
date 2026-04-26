# Guía de despliegue

> **Escaneo rápido:** no se detectaron `Dockerfile`, `docker-compose` ni flujos en `.github/workflows/` en el repositorio.

## Recomendación habitual para Next.js

- **Vercel** (mencionado en el `README` de plantilla): conectar el repo, definir variables de entorno de Supabase en el panel del proyecto, y desplegar ramas con preview.

## Variables de entorno en producción

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Asegurar que las **URL de callback** y **redirects** de SupAuth coinciden con el dominio de producción (y con `app/auth/callback`).

## Imágenes remotas

- `next.config.ts` restringe imágenes a `**.supabase.co` (revisar si se añaden otros orígenes).

## CI/CD

- No hay pipeline versionado aún. Opciones: GitHub Actions para `lint` y `build` en cada PR, o el flujo del proveedor de hosting.

## Base de datos

- Las migraciones viven en `supabase/migrations/`. Aplicarlas con el flujo de Supabase (CLI o consola) según el entorno; no duplicar lógica de esquema solo en el código de aplicación.
