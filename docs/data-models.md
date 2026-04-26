# Modelo de datos (Gastos)

> **Escaneo rápido**: tablas identificadas desde `supabase/migrations/20240101000000_initial_schema.sql` (líneas `CREATE TABLE`). Migraciones posteriores pueden añadir columnas o políticas RLS; revisar cada archivo en `supabase/migrations/` para el esquema exacto.

## Tablas principales (esquema inicial)

| Tabla | Propósito (inferido del nombre) |
|--------|----------------------------------|
| `public.users` | Usuarios de la aplicación |
| `public.categories` | Categorías de gastos |
| `public.expenses` | Registros de gastos |

## Migraciones

Archivos presentes (orden aproximado por nombre):

- `20240101000000_initial_schema.sql`
- `20260308000000_add_divided_amounts.sql`
- `20260308000001_add_divided_by_3_amounts.sql`
- `20260308000002_add_divided_by_4_and_update_defaults.sql`
- `20260308000003_update_servicios_publicos.sql`

## Validación en aplicación

- Esquemas Zod en `lib/validations/` (p. ej. `expense.ts`) deben alinearse con columnas y reglas de Supabase.

## Próximos pasos recomendados

- Escaneo **profundo**: leer migraciones completas y documentar columnas, claves foráneas, índices y políticas RLS.
