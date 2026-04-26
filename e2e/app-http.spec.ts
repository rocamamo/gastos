import { test, expect } from '@playwright/test';

/**
 * Smoke “frontend” vía HTTP (sin Chromium): evita SIGSEGV del browser en entornos sandbox
 * y sigue validando rutas, redirecciones del middleware y HTML inicial de Next.
 */
test.describe('App (HTTP, sin navegador)', () => {
    test('GET / redirige a /login', async ({ request }) => {
        const res = await request.get('/', { maxRedirects: 0 });
        expect([307, 308]).toContain(res.status());
        const loc = res.headers().location ?? '';
        expect(loc).toMatch(/\/login/);
    });

    test('GET /login devuelve HTML con marca de la app', async ({ request }) => {
        const res = await request.get('/login');
        expect(res.status()).toBe(200);
        const html = await res.text();
        expect(html).toContain('Gestor de Gastos');
        expect(html).toMatch(/Continuar con Google/i);
    });

    test('GET /dashboard sin sesión redirige a /login', async ({ request }) => {
        const res = await request.get('/dashboard', { maxRedirects: 0 });
        expect([307, 308]).toContain(res.status());
        expect(res.headers().location ?? '').toMatch(/\/login/);
    });

    test('GET /expenses sin sesión redirige a /login', async ({ request }) => {
        const res = await request.get('/expenses', { maxRedirects: 0 });
        expect([307, 308]).toContain(res.status());
        expect(res.headers().location ?? '').toMatch(/\/login/);
    });

    test('GET /docs devuelve HTML de la página de documentación', async ({ request }) => {
        const res = await request.get('/docs');
        expect(res.status()).toBe(200);
        const html = await res.text();
        expect(html).toMatch(/Loading API documentation|swagger-ui/i);
    });
});
