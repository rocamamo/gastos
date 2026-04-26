## Deferred from: code review of spec-paginacion-registro-gastos.md (2026-04-26)

- **Ventana lista/totales con `Promise.all`:** el patrón paralelo ya existía; el fix por lotes alarga la ventana de inconsistencia bajo escrituras concurrentes frente a un agregado de una sola query.

- **Precisión float en JS vs `numeric` en Postgres:** sumar en Node puede acumular error de redondeo frente a `sum()` en base; prioridad baja salvo volúmenes muy altos.

- **Hallazgos fuera del diff del último commit:** revisión de aceptación citó `page.tsx` y tests; el alcance acordado fue solo `15284e7..9f14d01` (totales sin agregados PostgREST + nota en contrato).
