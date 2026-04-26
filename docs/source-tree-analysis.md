# Análisis del árbol de fuentes

Proyecto **monolito** con raíz de código en el directorio del repositorio. Entrada Next App Router: `app/layout.tsx`, `app/page.tsx`, proveedores en `app/providers.tsx`.

## Vista resumida

```
(raíz)/
├── app/                    # App Router: páginas, layouts, rutas API
│   ├── (app)/              # Grupo de rutas autenticadas (dashboard, expenses, etc.)
│   ├── api/                # Route handlers REST
│   ├── auth/               # Callback de autenticación
│   ├── login/              # Página de login
│   ├── docs/               # Página de documentación API (Swagger UI)
│   ├── layout.tsx
│   ├── page.tsx
│   └── providers.tsx
├── components/             # UI de dominio y primitivos
│   ├── expenses/
│   └── ui/
├── hooks/                    # p. ej. use-auth
├── lib/                      # Supabase, validaciones, swagger, servicios, utilidades
├── supabase/migrations/      # SQL de esquema
├── __tests__/                # Jest
├── middleware.ts             # Sesión Supabase
├── next.config.ts
└── package.json
```

## Directorios críticos (tipo *web*)

| Directorio | Propósito |
|------------|------------|
| `app/` | Rutas, layouts, API, punto de integración con Next |
| `components/` | Componentes reutilizables y pantallas compuestas |
| `lib/` | Lógica compartida, clientes Supabase, validación |
| `hooks/` | Hook de autenticación y otros |
| `supabase/migrations/` | Definición de esquema remoto |
| `public/` | Estáticos (si existen; no ampliado en escaneo rápido) |

## Puntos de entrada

- Aplicación: `app/page.tsx` (landing), `app/(app)/*/page.tsx` (área logada).
- API: un archivo `route.ts` por ruta bajo `app/api/**`.
