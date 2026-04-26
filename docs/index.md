# Índice de documentación del proyecto

## Resumen del proyecto

- **Tipo:** monolito (una sola aplicación Next.js)
- **Idioma principal:** TypeScript
- **Arquitectura:** aplicación web full-stack (App Router + API route handlers + Supabase)

## Referencia rápida

- **Stack:** Next.js 16, React 19, Tailwind 4, Supabase, TanStack Query, Zod
- **Entrada app:** `app/layout.tsx`, páginas en `app/` y `app/(app)/`
- **API:** prefijo `/api/*` (ver listado en [api-contracts.md](./api-contracts.md))
- **Patrón:** capa de presentación en `app/` y `components/`; persistencia y auth en Supabase; sesión vía `middleware.ts`

## Documentación generada

- [Resumen del proyecto](./project-overview.md)
- [Arquitectura](./architecture.md)
- [Análisis del árbol de fuentes](./source-tree-analysis.md)
- [Inventario de componentes](./component-inventory.md)
- [Guía de desarrollo](./development-guide.md)
- [Guía de despliegue](./deployment-guide.md)
- [Contratos de API](./api-contracts.md)
- [Modelo de datos](./data-models.md)

## Documentación existente en el repo

- [README principal](../README.md) (plantilla create-next-app; el puerto efectivo de desarrollo es **3003**, no 3000)
- [Contexto para agentes / reglas de implementación](../_bmad-output/project-context.md)

## Cómo empezar

1. Clonar el repositorio y `npm install`.
2. Configurar variables `NEXT_PUBLIC_SUPABASE_*` (ver [development-guide.md](./development-guide.md)).
3. `npm run dev` y abrir `http://localhost:3003`.

## Nota sobre el escaneo

Esta documentación se generó con **escaneo rápido** (patrones, manifiestos y estructura). Para detalle de cuerpos de API, columnas exactas y políticas RLS, conviene un **escaneo profundo o exhaustivo** o revisión manual de `app/api/**` y `supabase/migrations/**`.
