---
title: 'Paginación del listado de gastos (Registro de Gastos)'
type: 'feature'
created: '2026-04-26'
status: 'done'
baseline_commit: '358ab963b6f02a963117b23686b268669a532502'
context:
  - '_bmad-output/project-context.md'
  - 'docs/api-contracts.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** En Registro de Gastos se cargan todos los gastos que cumplen los filtros en una sola respuesta, sin paginación. Con el volumen actual (~120 registros al mes) y crecimiento futuro, la lista y la API no escalan bien y la experiencia de lectura se degrada.

**Approach:** Paginación **server-side** (Supabase `range` + `count`) con metadatos de página en la API; en la UI, controles de pagina siguiendo patrones accesibles y **sincronización de `page` y `per_page` con la query string** para compartir URL y navegación con historial. La fila de **TOTALES** del pie debe reflejar la **suma de todo el conjunto filtrado**, no solo de la página visible, calculada en el servidor con los mismos criterios de filtro.

## Boundaries & Constraints

**Always:** Validar y acotar `page` (entero ≥ 1) y `per_page` (valores permitidos, p. ej. 10, 20, 50; por defecto 20). Misma autenticación y filtros actuales (`month`, `category_id`, `user_id`, `search`) en la consulta paginada y en el cálculo de totales. Respuestas API y textos de validación alineados con el criterio existente (español donde ya aplica). Tras cambiar filtros, **reiniciar a página 1** y reflejarlo en la URL. Usar `keepPreviousData` (o equivalente) en la query de listado para transiciones de página suaves. Incluir `total` (conteo) y metadatos necesarios para el control de paginación.

**Ask First:** Cambiar el juego de tamaños de página (10/20/50) o añadir ruta dedicada solo para agregados.

**Never:** Paginación solo en cliente sobre el array completo (no cumple el objetivo). Mostrar totales del pie que sumen **solo** la página actual. Omitir manejo de `page` fuera de rango (p. ej. enlace con `page=999` sin resultados). Modificar lógica de negocio de creación/edición/borrado de gastos salvo lo necesario para invalidar queries.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error handling |
|----------|---------------|----------------------------|----------------|
| Lista paginada | Filtros válidos, `page=1`, `per_page=20` | JSON con filas de esa página, `total` = número de filas que cumplen filtros, metadatos de paginación coherentes | 401 sin sesión como hoy |
| Última página parcial | `page` = última, resto de filas < `per_page` | Solo N filas, mismos metadatos | N/A |
| Filtro cambiado | Usuario modifica mes/categoría/usuario/búsqueda | Página vuelve a 1; URL actualizada; datos nuevos | N/A |
| Página fuera de rango | `page` > total de páginas o sin resultados | Comportamiento definido: p. ej. normalizar a última página o vacío + totales 0, sin 500 | Respuesta 200 con lista vacía o redirección lógica documentada en implementación |
| Totales | Cualquier combinación de filtros | Cuerpo incluye agregados **globales** del filtro (mismas reglas que hoy en el tfoot) | Si falla agregado, 500 con mensaje controlado |

</frozen-after-approval>

## Code Map

- `app/api/expenses/route.ts` -- GET: añadir `page`, `per_page`, `range`/`count`, agregación de totales y forma de respuesta; POST sin cambios de negocio.
- `app/(app)/expenses/page.tsx` -- `useSearchParams` o equivalente, ampliar `queryKey` y `fetch` con params de paginación; barra de paginación; reinicio de página al filtrar; tfoot con datos del agregado del servidor.
- `docs/api-contracts.md` -- Documentar nuevo contrato de respuesta GET.
- `components/ui/` -- Si no existe patrón reutilizable, componente de paginación o uso de primitivos existentes (botones, texto "Mostrando X–Y de Z").

## Tasks & Acceptance

**Execution:**

- [x] `app/api/expenses/route.ts` -- Implementar GET paginado, conteo total, agregados para totales con mismos filtros, validación de `page`/`per_page` -- Base del feature y coherencia de datos.
- [x] `app/(app)/expenses/page.tsx` -- Sincronizar URL, React Query, UI de paginación, totales desde respuesta, reset de página al filtrar -- Comportamiento de producto.
- [x] `docs/api-contracts.md` -- Actualizar documentación del endpoint GET.
- [x] Añadir pruebas (p. ej. `__tests__/` en ruta o utilidad) que cubran validación de parámetros y/o forma de respuesta mínima -- Regresión.

**Acceptance Criteria:**

- Dado un usuario autenticado con gastos y filtros por defecto, al abrir Registro de Gastos, se muestra la primera página con el tamaño por defecto y los totales del pie coinciden con la suma de **todos** los gastos visibles bajo esos criterios (no solo la página).
- Dado un usuario en la página 2, al usar el control de paginación, la URL incluye `page=2` (y `per_page` acorde) y el listado muestra el siguiente bloque de filas.
- Dado un cambio de filtro (mes, categoría, usuario o búsqueda), la lista vuelve a la página 1 y la refleja en la URL.
- Dada una petición con `per_page` no permitido, el servidor responde 400 o aplica un valor por defecto documentado (una sola política, consistente en código y spec).

## Spec Change Log

## Design Notes

- **Volumen ~120/mes:** `per_page` por defecto **20**; selector **10 / 20 / 50** en la UI. Con ~6 páginas al mes a 20, equilibrio entre clicks y legibilidad.
- **URL:** `page` y `per_page` en la query (junto a filtros existentes) para compartir enlace y botón atrás; al compartir solo filtros, `page` puede omitirse (interpretar como 1).
- **Agregación:** Misma lógica de `WHERE` que el listado; implementar con consultas/funciones soportadas por el proyecto (Supabase) sin traer todas las filas al Node solo para sumar si el volumen puede crecer.
- **React Query:** Incluir `page` y `per_page` en `queryKey` junto a la cadena de filtros; invalidación actual de `['expenses', …]` al crear/editar/eliminar debe seguir coherente (p. ej. prefijo o claves alineadas).

## Verification

**Commands:**

- `npm test` o `npx jest` (según `package.json`) -- pasa, incl. nuevas pruebas.
- `npm run lint` -- sin errores nuevos en archivos tocados.

**Manual checks (if no CLI):**

- Navegar `/expenses` con y sin `?page=` y `?per_page=`; comprobar totales con filtro de un mes con varios gastos; cambiar a página 2 y verificar importes del pie iguales que en pagina 1 (mismo filtro).

## Suggested Review Order

**Contrato y lógica de API (paginación + totales)**

- Punto de entrada: parseo, auth y shape de respuesta `{data,pagination,totals}`.
  [`route.ts:66`](../../app/api/expenses/route.ts#L66)

- Validación: `month` (YYYY-MM) y `per_page` permitido (10/20/50).
  [`route.ts:80`](../../app/api/expenses/route.ts#L80)

- Core: query paginada (`range`) + count exact + agregados para totales globales.
  [`route.ts:101`](../../app/api/expenses/route.ts#L101)

- Borde: dataset vacío + `page>1` (estado de paginación consistente).
  [`route.ts:148`](../../app/api/expenses/route.ts#L148)

**UI: URL como fuente compartible + React Query**

- URL → estado (deep links) y estado → URL (filtros y paginación).
  [`page.tsx:112`](../../app/(app)/expenses/page.tsx#L112)

- QueryKey + request params (`page/per_page` + filtros) con `keepPreviousData`.
  [`page.tsx:152`](../../app/(app)/expenses/page.tsx#L152)

- Totales del pie vienen del servidor (no del array paginado).
  [`page.tsx:412`](../../app/(app)/expenses/page.tsx#L412)

- Controles de paginación y selector por página (10/20/50).
  [`page.tsx:456`](../../app/(app)/expenses/page.tsx#L456)

**Soporte (docs, tests, config)**

- Documentación del contrato GET `/api/expenses`.
  [`api-contracts.md:28`](../../docs/api-contracts.md#L28)

- Tests (mock Supabase) para validación `per_page` y shape de respuesta.
  [`expenses.route.test.ts:41`](../../__tests__/api/expenses.route.test.ts#L41)

- Script `npm test` + deps de test.
  [`package.json:5`](../../package.json#L5)
