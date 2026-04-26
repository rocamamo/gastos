import { test, expect } from '@playwright/test';

const SAMPLE_UUID = '00000000-0000-0000-0000-000000000001';

test.describe('API (servidor en ejecución)', () => {
    test('GET /api/docs-json devuelve OpenAPI', async ({ request }) => {
        const res = await request.get('/api/docs-json');
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body).toMatchObject({ openapi: '3.0.0' });
        expect(body.info?.title).toBeTruthy();
    });

    test('GET /api/exchange-rate devuelve tasa numérica', async ({ request }) => {
        const res = await request.get('/api/exchange-rate');
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('rate');
        expect(typeof body.rate).toBe('number');
        expect(Number.isFinite(body.rate)).toBe(true);
    });

    test('rutas protegidas sin cookie responden 401', async ({ request }) => {
        const cases: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; path: string; body?: object }[] = [
            { method: 'GET', path: '/api/me' },
            { method: 'GET', path: '/api/users' },
            { method: 'GET', path: '/api/categories' },
            { method: 'GET', path: '/api/expenses?page=1&per_page=20' },
            { method: 'GET', path: '/api/analytics/summary' },
            { method: 'GET', path: '/api/analytics/monthly' },
            { method: 'GET', path: '/api/analytics/categories' },
            { method: 'POST', path: '/api/expenses', body: {} },
            { method: 'PATCH', path: `/api/expenses/${SAMPLE_UUID}`, body: {} },
            { method: 'DELETE', path: `/api/expenses/${SAMPLE_UUID}` },
            { method: 'POST', path: '/api/upload' },
        ];

        for (const { method, path, body } of cases) {
            const res =
                method === 'GET'
                    ? await request.get(path)
                    : method === 'POST'
                      ? await request.post(path, {
                            data: body ?? {},
                            headers: { 'Content-Type': 'application/json' },
                        })
                      : method === 'PATCH'
                        ? await request.patch(path, {
                              data: body ?? {},
                              headers: { 'Content-Type': 'application/json' },
                          })
                        : await request.delete(path);

            expect(res.status(), `${method} ${path}`).toBe(401);
            const json = await res.json().catch(() => ({}));
            expect(json).toEqual(expect.objectContaining({ error: 'Unauthorized' }));
        }
    });
});
