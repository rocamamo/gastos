# Despliegue de Control de Gastos Colaborativo

## Requisitos Previos

1. Una cuenta en [Vercel](https://vercel.com/) vinculada a GitHub/GitLab.
2. Una base de datos en [Supabase](https://supabase.com/).

## Configuración en Supabase

1. En tu proyecto de Supabase, navega al panel SQL Editor y ejecuta el script contenido en `supabase/migrations/20240101000000_initial_schema.sql` para crear la arquitectura y políticas de seguridad (RLS).
2. Asegúrate de habilitar el proveedor de autenticación de **Google** en *Authentication > Providers* ingresando tus credenciales de Google Cloud Console.
3. Configura la URL del sitio local (`http://localhost:3000`) y la de producción en *Authentication > URL Configuration*.
4. Crea un bucket de storage llamado `attachments` si no lo ha creado el script, marcándolo como **Público**.

## Variables de Entorno

Obtén las credenciales en Supabase (*Project Settings > API*) y configúralas tanto en Vercel como en tu archivo local `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
```

## Despliegue en Vercel

1. Sube este repositorio a Github.
2. Desde el panel de Vercel, selecciona "Add New > Project" e importa el repositorio.
3. El framework (`Next.js`) será detectado automáticamente.
4. En **Environment Variables**, añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Haz clic en **Deploy**.

Tu aplicación será compilada, optimizada y servida globalmente utilizando el Edge Network de Vercel.
