---
project_name: Gastos
user_name: Bobby
date: '2026-04-26'
sections_completed:
  - technology_stack
  - language_rules
  - framework_rules
  - testing_rules
  - quality_rules
  - workflow_rules
  - anti_patterns
status: complete
rule_count: 32
optimized_for_llm: true
---

# Contexto del proyecto para agentes de IA

_Reglas y patrones poco obvios que los agentes deben seguir al implementar código en este repo. No duplicar documentación genérica de Next o React salvo donde este proyecto se desvía._

---

## Stack tecnológico y versiones

| Área | Paquete / herramienta | Nota |
|------|------------------------|------|
| App | `next` 16.1.6, App Router | Scripts: `dev`/`start` en puerto **3003** |
| UI | `react` / `react-dom` 19.2.3 | — |
| TS | `typescript` ^5 | `strict: true`; alias `@/*` → raíz |
| Estilos | `tailwindcss` 4, `@tailwindcss/postcss` | — |
| Auth / DB | `@supabase/supabase-js` ^2.97, `@supabase/ssr` ^0.8 | Cliente servidor asíncrono; middleware actualiza sesión |
| Datos cliente | `@tanstack/react-query` ^5.90 | `Providers`: `staleTime` 60s, `retry: 1` |
| Formularios | `react-hook-form`, `@hookform/resolvers`, `zod` ^4.3 | Validar body/API con Zod antes de Supabase |
| Otros | `recharts`, `sonner`, `next-themes`, `swagger-jsdoc` + `swagger-ui-react` | — |
| Calidad | `eslint` 9, `eslint-config-next` 16.1.6 | `eslint.config.mjs` |
| Tests | `jest` via `next/jest`, `jest-environment-jsdom` ^30 | `moduleNameMapper`: `^@/(.*)$` |

**Fijar versiones en `package.json`:** no sustituir Next/React/ESLint config por versiones distintas sin comprobar compatibilidad con el resto de dependencias.

**Entorno:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (y cualquier otra variable que ya use el código). No hardcodear credenciales.

**Imágenes:** solo dominios permitidos en `next.config.ts` (`**.supabase.co`).

---

## Reglas críticas de implementación

### Reglas específicas del lenguaje (TypeScript)

- Mantener `strict` y tipos explícitos en APIs públicas (props, retornos de `route.ts`).
- Imports desde `@/...`, no rutas relativas largas salvo excepción local.
- `createClient()` de `@/lib/supabase/server` es **async**: siempre `await createClient()` en Server Components y route handlers.
- Tras `request.json()`, validar con Zod (`parse` / `safeParse`); mensajes de validación orientados al usuario en **español** donde ya exista ese criterio (p. ej. `lib/validations/`).
- Evitar `as any` salvo límite de tipos de librería; si se usa, acotar y comentar el motivo.

### Reglas del framework (Next.js / React)

- Rutas UI bajo `app/`; rutas API: `app/api/<recurso>/route.ts` exportando `GET`, `POST`, etc.
- Respuestas API: `NextResponse.json`, códigos HTTP coherentes (401 sin sesión, 500 con mensaje de error controlado).
- Autenticación: en handlers, `getUser()` vía cliente Supabase servidor; si `!user`, responder 401 sin ejecutar lógica de negocio.
- Cliente browser: `@/lib/supabase/client` donde corresponda; no mezclar patrones de sesión distintos al existente (`middleware` + `updateSession`).
- Componentes cliente: marcar con `'use client'` solo cuando haga falta hooks o eventos del navegador.
- React Query: respetar la configuración global en `app/providers.tsx` al añadir queries (no desactivar retries globalmente sin motivo).

### Reglas de pruebas

- Jest con transform de Next; mapeo `@/` igual que en runtime (`jest.config.js`).
- Colocar tests bajo `__tests__/`, nombrar `*.test.ts` / `*.test.tsx` según el archivo bajo prueba.
- Nuevas utilidades o servicios (`lib/services/`, etc.): preferir test unitario cuando la lógica sea pura o aislable.
- No depender de red real en unit tests; mockear fetch/Supabase si se testea lógica que los usa.

### Calidad de código y estilo

- Seguir `eslint-config-next` (core-web-vitals + typescript); no desactivar reglas en bloque salvo acuerdo y comentario breve.
- Componentes de pantalla / dominio: nombres en PascalCase (`ExpenseForm.tsx`). Piezas UI reutilizables pueden usar kebab-case si ya encaja con la carpeta `components/ui/`.
- Lógica compartida: `lib/` (servicios, validaciones, swagger, supabase). Hooks reutilizables: `hooks/`.
- Tailwind: usar utilidades existentes y `cn`/helpers del proyecto si ya están importados en el archivo.

### Flujo de trabajo de desarrollo

- `npm run dev` usa el puerto **3003**; no asumir 3000 en documentación o enlaces.
- Antes de PR: `npm run lint` y comprobación manual de rutas tocadas.
- Cambios en esquema Supabase o políticas RLS: reflejar implicaciones en código de API y validaciones Zod.

### Reglas críticas: no omitir

- No exponer datos de otros usuarios: las consultas deben filtrarse según el modelo de seguridad ya aplicado (auth + Supabase); al añadir endpoints, repetir el patrón de comprobación de `user`.
- No omitir validación Zod en POST/PUT/PATCH que acepten JSON.
- No crear clientes Supabase con patrones distintos a `lib/supabase/*` (duplicar lógica de cookies rompe SSR).
- Middleware: al ampliar `matcher`, no eliminar exclusiones de `_next/static`, `_next/image` y favicon sin motivo.
- **Zod v4:** usar la API actual del proyecto (`z.enum`, `z.string().uuid`, etc.); no copiar snippets de Zod v3 sin verificar.

---

## Guía de uso

**Para agentes de IA**

- Leer este archivo antes de implementar cambios sustanciales.
- Aplicar las reglas tal cual; ante duda, la opción más restrictiva (auth, validación, tipos).
- Si el proyecto adopta un patrón nuevo recurrente, proponer actualización de este archivo en el mismo cambio o justificar por qué no.

**Para personas**

- Mantener el archivo breve: quitar reglas que ya sean obvias para el equipo.
- Actualizar cuando cambien versiones mayores de Next, React o Supabase.
- Revisar tras refactors grandes de carpetas o convenciones.

Última actualización: 2026-04-26

---
