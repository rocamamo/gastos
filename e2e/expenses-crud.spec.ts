import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * CRUD de gastos en UI sin tocar Supabase: mocks de red + bypass de auth solo
 * con E2E_TEST (servidor) y cabecera x-playwright-e2e (ver middleware + AuthProvider).
 */

const E2E_USER = '11111111-1111-4111-8111-111111111111';
/** UUID v4 válido (Zod rechaza variantes no conformes). */
const CAT_ID = 'c0ffee00-0000-4000-8000-00000000c0de';
const RATE = 4000;

const zeroTotals = {
    amount_cop: 0,
    amount_usd: 0,
    amount_divided_cop: 0,
    amount_divided_usd: 0,
    amount_divided_3_cop: 0,
    amount_divided_3_usd: 0,
    amount_divided_4_cop: 0,
    amount_divided_4_usd: 0,
};

type MockExpense = {
    id: string;
    user_id: string;
    category_id: string;
    expense_date: string;
    detail: string;
    amount_cop: number;
    amount_usd: number;
    amount_divided_cop: number;
    amount_divided_usd: number;
    amount_divided_3_cop: number;
    amount_divided_3_usd: number;
    amount_divided_4_cop: number;
    amount_divided_4_usd: number;
    attachment_url?: string | null;
    users?: { name?: string | null };
    categories?: { name?: string | null };
};

function copUsdFromInput(amount: number, currency: 'COP' | 'USD') {
    if (currency === 'COP') {
        const amount_cop = amount;
        const amount_usd = Number((amount_cop / RATE).toFixed(2));
        return { amount_cop, amount_usd };
    }
    const amount_usd = amount;
    const amount_cop = Number((amount_usd * RATE).toFixed(2));
    return { amount_cop, amount_usd };
}

function dividedAmounts(amount_cop: number, amount_usd: number, categoryName: string) {
    const z = {
        amount_divided_cop: 0,
        amount_divided_usd: 0,
        amount_divided_3_cop: 0,
        amount_divided_3_usd: 0,
        amount_divided_4_cop: 0,
        amount_divided_4_usd: 0,
    };
    if (['Mercado', 'Restaurantes', 'Servicios Públicos'].includes(categoryName)) {
        z.amount_divided_4_cop = Number((amount_cop / 4).toFixed(2));
        z.amount_divided_4_usd = Number((amount_usd / 4).toFixed(2));
    } else if (['Medicos', 'Médicos'].includes(categoryName)) {
        z.amount_divided_3_cop = Number((amount_cop / 3).toFixed(2));
        z.amount_divided_3_usd = Number((amount_usd / 3).toFixed(2));
    } else {
        z.amount_divided_cop = Number((amount_cop / 2).toFixed(2));
        z.amount_divided_usd = Number((amount_usd / 2).toFixed(2));
    }
    return z;
}

type BuildRowInput = {
    id?: string;
    detail: string;
    expense_date?: string;
    /** Monto en la moneda indicada (mismo criterio que el formulario). */
    amount?: number;
    currency?: 'COP' | 'USD';
    category_id?: string;
    users?: { name?: string | null };
    categories?: { name?: string | null };
    attachment_url?: string | null;
};

function buildRow(p: BuildRowInput): MockExpense {
    const categoryName = p.categories?.name ?? 'E2E Comida';
    const amount = p.amount ?? 50_000;
    const currency = p.currency ?? 'COP';
    const { amount_cop, amount_usd } = copUsdFromInput(amount, currency);
    const div = dividedAmounts(amount_cop, amount_usd, categoryName);
    return {
        id: p.id ?? randomUUID(),
        user_id: E2E_USER,
        category_id: p.category_id ?? CAT_ID,
        expense_date: p.expense_date ?? '2026-04-15',
        detail: p.detail,
        amount_cop,
        amount_usd,
        attachment_url: p.attachment_url ?? null,
        users: p.users ?? { name: 'Usuario E2E' },
        categories: p.categories ?? { name: categoryName },
        ...div,
    };
}

function sumTotals(rows: MockExpense[]) {
    return rows.reduce(
        (acc, r) => ({
            amount_cop: acc.amount_cop + r.amount_cop,
            amount_usd: acc.amount_usd + r.amount_usd,
            amount_divided_cop: acc.amount_divided_cop + r.amount_divided_cop,
            amount_divided_usd: acc.amount_divided_usd + r.amount_divided_usd,
            amount_divided_3_cop: acc.amount_divided_3_cop + r.amount_divided_3_cop,
            amount_divided_3_usd: acc.amount_divided_3_usd + r.amount_divided_3_usd,
            amount_divided_4_cop: acc.amount_divided_4_cop + r.amount_divided_4_cop,
            amount_divided_4_usd: acc.amount_divided_4_usd + r.amount_divided_4_usd,
        }),
        { ...zeroTotals }
    );
}

async function registerExpenseMocks(page: import('@playwright/test').Page, state: { rows: MockExpense[] }) {
    await page.route('**/rest/v1/categories**', async (route) => {
        if (route.request().method() !== 'GET') {
            await route.abort('blockedbyclient');
            return;
        }
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{ id: CAT_ID, name: 'E2E Comida', created_at: null }]),
        });
    });

    await page.route('**/api/categories', async (route) => {
        if (route.request().method() !== 'GET') {
            await route.continue();
            return;
        }
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{ id: CAT_ID, name: 'E2E Comida' }]),
        });
    });

    await page.route('**/api/users', async (route) => {
        if (route.request().method() !== 'GET') {
            await route.continue();
            return;
        }
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{ id: E2E_USER, name: 'Usuario E2E' }]),
        });
    });

    await page.route('**/api/exchange-rate**', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rate: RATE }) });
    });

    await page.route('**/api/expenses**', async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        const pathname = url.pathname.replace(/\/$/, '');

        const isCollection = pathname.endsWith('/api/expenses');
        const idMatch = pathname.match(/\/api\/expenses\/([^/]+)$/);
        const id = idMatch?.[1];

        if (isCollection && req.method() === 'GET') {
            const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
            const perPageRaw = parseInt(url.searchParams.get('per_page') || '20', 10) || 20;
            const perPage = [10, 20, 50].includes(perPageRaw) ? perPageRaw : 20;
            const rows = state.rows;
            const totals = sumTotals(rows);
            if (rows.length === 0) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: [],
                        pagination: { total: 0, page: 1, per_page: perPage, total_pages: 0 },
                        totals: { ...zeroTotals },
                    }),
                });
                return;
            }
            const total = rows.length;
            const total_pages = Math.max(1, Math.ceil(total / perPage));
            let pageSafe = pageNum;
            if (pageSafe > total_pages) pageSafe = total_pages;
            const start = (pageSafe - 1) * perPage;
            const slice = rows.slice(start, start + perPage);
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    data: slice,
                    pagination: { total, page: pageSafe, per_page: perPage, total_pages },
                    totals,
                }),
            });
            return;
        }

        if (isCollection && req.method() === 'POST') {
            const body = req.postDataJSON() as {
                category_id: string;
                detail: string;
                amount: number;
                currency: 'COP' | 'USD';
                expense_date: string;
                attachment_url?: string;
            };
            const { amount_cop, amount_usd } = copUsdFromInput(body.amount, body.currency);
            const categoryName = 'E2E Comida';
            const div = dividedAmounts(amount_cop, amount_usd, categoryName);
            const row: MockExpense = {
                id: randomUUID(),
                user_id: E2E_USER,
                category_id: body.category_id,
                expense_date: body.expense_date,
                detail: body.detail,
                amount_cop,
                amount_usd,
                attachment_url: body.attachment_url || null,
                users: { name: 'Usuario E2E' },
                categories: { name: categoryName },
                ...div,
            };
            state.rows.push(row);
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(row) });
            return;
        }

        if (id && req.method() === 'PATCH') {
            const body = req.postDataJSON() as Partial<{
                category_id: string;
                detail: string;
                amount: number;
                currency: 'COP' | 'USD';
                expense_date: string;
            }>;
            const idx = state.rows.findIndex((r) => r.id === id);
            if (idx === -1) {
                await route.fulfill({ status: 404, body: JSON.stringify({ error: 'Not found' }) });
                return;
            }
            const prev = state.rows[idx]!;
            const currency = body.currency ?? ('COP' as const);
            const amount = body.amount ?? prev.amount_cop;
            const { amount_cop, amount_usd } =
                currency === 'COP'
                    ? { amount_cop: amount, amount_usd: Number((amount / RATE).toFixed(2)) }
                    : { amount_cop: Number((amount * RATE).toFixed(2)), amount_usd: amount };
            const categoryName = prev.categories?.name ?? 'E2E Comida';
            const div = dividedAmounts(amount_cop, amount_usd, categoryName);
            const next: MockExpense = {
                ...prev,
                ...body,
                amount_cop,
                amount_usd,
                ...div,
                detail: body.detail ?? prev.detail,
                expense_date: body.expense_date ?? prev.expense_date,
                category_id: body.category_id ?? prev.category_id,
            };
            state.rows[idx] = next;
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(next) });
            return;
        }

        if (id && req.method() === 'DELETE') {
            const idx = state.rows.findIndex((r) => r.id === id);
            if (idx >= 0) state.rows.splice(idx, 1);
            await route.fulfill({ status: 204, body: '' });
            return;
        }

        await route.continue();
    });
}

async function unregisterExpenseMocks(page: import('@playwright/test').Page) {
    await page.unroute('**/rest/v1/categories**');
    await page.unroute('**/api/categories');
    await page.unroute('**/api/users');
    await page.unroute('**/api/exchange-rate**');
    await page.unroute('**/api/expenses**');
}

test.describe('Registro de gastos — CRUD (mocks, sin Supabase)', () => {
    test.beforeEach(async ({ page }) => {
        await page.context().addCookies([
            { name: 'pw-e2e', value: '1', url: 'http://127.0.0.1:3003' },
            { name: 'pw-e2e', value: '1', url: 'http://localhost:3003' },
        ]);
        await page.addInitScript((id: string) => {
            (window as Window & { __E2E_USER_ID__?: string }).__E2E_USER_ID__ = id;
        }, E2E_USER);
    });

    test.afterEach(async ({ page }) => {
        await unregisterExpenseMocks(page);
    });

    test('Crear: lista vacía → formulario → nuevo gasto visible', async ({ page }) => {
        const state = { rows: [] as MockExpense[] };
        await registerExpenseMocks(page, state);
        await page.goto('/expenses');

        await expect(page.getByRole('heading', { name: 'Registro de Gastos' })).toBeVisible();
        await expect(page.getByText('No hay gastos encontrados')).toBeVisible();

        await page.getByRole('button', { name: /Nuevo Gasto/i }).click();
        await expect(page.getByRole('heading', { name: 'Registrar Nuevo Gasto' })).toBeVisible();
        await expect(
            page.locator('form.space-y-5 select').first().locator('option', { hasText: 'E2E Comida' })
        ).toBeAttached({ timeout: 15_000 });

        await page.locator('form.space-y-5 select').first().selectOption({ label: 'E2E Comida' });
        await page.getByPlaceholder('Ej. Almuerzo con el equipo').fill('Gasto E2E crear');
        // El input visible dispara setValue('amount') en onChange; digitamos dígitos sin separadores.
        const amountInput = page.getByPlaceholder('0,00');
        await amountInput.click();
        await amountInput.pressSequentially('1000000', { delay: 20 });
        await amountInput.blur();
        await expect(page.locator('input[name="amount"]')).toHaveValue('10000');

        const postResp = page.waitForResponse(
            (r) => r.url().includes('/api/expenses') && r.request().method() === 'POST',
            { timeout: 15_000 }
        );
        await page.getByRole('button', { name: 'Guardar Gasto' }).click();
        expect((await postResp).status()).toBe(200);

        await expect(page.getByText('Gasto E2E crear')).toBeVisible({ timeout: 15_000 });
        expect(state.rows).toHaveLength(1);
    });

    test('Editar: cambiar detalle y comprobar en tabla', async ({ page }) => {
        const seedId = randomUUID();
        const state = {
            rows: [
                buildRow({
                    id: seedId,
                    detail: 'Antes',
                    amount: 20_000,
                    currency: 'COP',
                }),
            ],
        };
        await registerExpenseMocks(page, state);
        await page.goto('/expenses');

        await expect(page.getByText('Antes')).toBeVisible();
        await page.getByTitle('Editar').click();
        await expect(page.getByRole('heading', { name: 'Editar Gasto' })).toBeVisible();
        await expect(
            page.locator('form.space-y-5 select').first().locator('option', { hasText: 'E2E Comida' })
        ).toBeAttached({ timeout: 15_000 });

        await page.getByPlaceholder('Ej. Almuerzo con el equipo').fill('Después E2E');
        const patchResp = page.waitForResponse(
            (r) => r.url().includes('/api/expenses/') && r.request().method() === 'PATCH',
            { timeout: 15_000 }
        );
        await page.getByRole('button', { name: 'Actualizar Gasto' }).click();
        expect((await patchResp).status()).toBe(200);

        await expect(page.getByText('Después E2E')).toBeVisible({ timeout: 15_000 });
        expect(state.rows[0]?.detail).toBe('Después E2E');
    });

    test('Eliminar: confirmar modal y fila desaparece', async ({ page }) => {
        const seedId = randomUUID();
        const state = {
            rows: [
                buildRow({
                    id: seedId,
                    detail: 'Borrar este',
                    amount: 10_000,
                    currency: 'COP',
                }),
            ],
        };
        await registerExpenseMocks(page, state);
        await page.goto('/expenses');

        await expect(page.getByText('Borrar este')).toBeVisible();
        await page.getByTitle('Eliminar').click();
        await expect(page.getByRole('heading', { name: 'Confirmar eliminación' })).toBeVisible();
        await page.getByRole('button', { name: 'Sí, eliminar' }).click();

        await expect(page.getByText('Gasto eliminado exitosamente')).toBeVisible();
        await expect(page.getByText('No hay gastos encontrados')).toBeVisible();
        expect(state.rows).toHaveLength(0);
    });

    test('Lectura + paginación: 25 filas, página 2', async ({ page }) => {
        const rows: MockExpense[] = Array.from({ length: 25 }, (_, i) =>
            buildRow({
                id: randomUUID(),
                detail: `Fila ${i + 1}`,
                expense_date: '2026-04-01',
                amount: 1000 * (i + 1),
                currency: 'COP',
            })
        );
        const state = { rows };
        await registerExpenseMocks(page, state);
        await page.goto('/expenses');

        await expect(page.getByRole('cell', { name: 'Fila 1', exact: true })).toBeVisible();
        await expect(page.getByText('Mostrando')).toContainText('1–20');
        await Promise.all([
            page.waitForURL(/page=2/),
            page.getByRole('button', { name: 'Siguiente' }).click(),
        ]);
        await expect(page.getByText(/Página 2 de/)).toBeVisible();
        await expect(page.getByRole('cell', { name: 'Fila 21', exact: true })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'Fila 1', exact: true })).not.toBeVisible();
    });
});
