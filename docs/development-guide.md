# Guía de desarrollo

## Requisitos

- **Node.js:** compatible con Next 16 (recomendado: LTS reciente, p. ej. 20+ según `package.json` y `@types/node`).
- **npm** (u otro gestor compatible).

## Instalación

```bash
npm install
```

## Variables de entorno

Definir al menos (como indica el contexto del proyecto):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

No incluir claves reales en el repositorio. No se encontró `.env.example` en el escaneo rápido; conviene añadirlo para onboarding.

## Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo en **http://localhost:3003** |
| `npm run build` | Compilación de producción |
| `npm run start` | Servidor de producción en puerto **3003** |
| `npm run lint` | ESLint (config `eslint.config.mjs` + `eslint-config-next`) |

> El `README.md` de plantilla aún menciona el puerto 3000; el proyecto usa **3003** (ver `package.json`).

## Pruebas

```bash
npx jest
```

(o el script que añadas en `package.json` si se define `test` explícitamente; actualmente Jest se configura vía `jest.config.js` y `jest.setup.js`).

## Estructura recomendada para cambios

- Nuevas rutas API: `app/api/.../route.ts`, validar cuerpos con Zod, respuestas con `NextResponse.json`.
- Nuevas pantallas: bajo `app/`, reutilizando `components/ui/*` y servicios en `lib/`.
- Nuevas tablas: migración en `supabase/migrations/`, luego ajustar validaciones y tipos.

## Antes de abrir un PR

- `npm run lint`
- Probar manualmente las rutas tocadas
- Revisar que las consultas respeten el modelo de acceso por usuario (Supabase RLS y filtros en API)
