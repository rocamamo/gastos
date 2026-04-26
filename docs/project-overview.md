# Resumen del proyecto: Gastos

## Propósito

Aplicación web para **seguimiento y análisis de gastos** personales o domésticos, con autenticación, categorías, registro de gastos y analíticas (resumen, por categoría, mensual), integración con **Supabase** y tipos de cambio.

## Tipo de repositorio

- **Monolito** (un solo desplegable Next.js).
- **Clasificación:** aplicación *web* (Next.js App Router, API route handlers, React 19).

## Stack (breve)

| Categoría | Tecnología |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| Datos | Supabase (Postgres, auth) |
| Cliente de datos | TanStack React Query |
| Validación | Zod 4 |
| Gráficos | Recharts |
| Calidad | ESLint 9, Jest (next/jest) |

## Documentación detallada

- [Arquitectura](./architecture.md)
- [Árbol de fuentes](./source-tree-analysis.md)
- [Contratos de API](./api-contracts.md)
- [Modelo de datos](./data-models.md)
- [Inventario de componentes](./component-inventory.md)
- [Guía de desarrollo](./development-guide.md)
- [Despliegue](./deployment-guide.md)
- [Reglas para agentes / contexto de proyecto](../_bmad-output/project-context.md) (en `_bmad-output/`)

## Contexto de negocio (inferido)

- Entidades: usuarios, categorías, gastos; campos de importe dividido reflejados en migraciones con nombre `divided_*`.
- Recomendación: alinear PRDs con políticas de seguridad por usuario (RLS) en Supabase; validar con migraciones reales.
