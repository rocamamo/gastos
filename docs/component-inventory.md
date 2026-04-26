# Inventario de componentes UI

> **Escaneo rápido**: listado por estructura de archivos bajo `components/`. No se ha verificado uso en páginas ni props.

## `components/expenses/`

| Archivo | Rol probable |
|---------|----------------|
| `ExpenseForm.tsx` | Formulario de gastos (react-hook-form + Zod) |

## `components/ui/`

| Archivo | Rol probable |
|---------|----------------|
| `Layout.tsx` | Layout de shell de la app |
| `button.tsx` | Botón reutilizable |
| `card.tsx` | Contenedor tipo tarjeta |
| `input.tsx` | Campo de entrada |
| `modal.tsx` | Diálogo modal |
| `multi-select.tsx` | Selección múltiple |
| `file-uploader.tsx` | Subida de archivos |

## Patrones

- Utilidades: `lib/utils.ts` (p. ej. `cn` con tailwind-merge/clsx según convención del proyecto).
- Tema: `next-themes` (dependencia en `package.json`).
