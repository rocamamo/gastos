/** @jest-environment node */
import { GET } from '@/app/api/expenses/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}));

type SupabaseMock = {
    auth: { getUser: jest.Mock };
    from: jest.Mock;
};

type ThenableQuery = {
    or: jest.Mock;
    in: jest.Mock;
    ilike: jest.Mock;
    order: jest.Mock;
    range: jest.Mock;
    select: jest.Mock;
    then: (
        onFulfilled: (value: unknown) => unknown,
        onRejected: (reason: unknown) => unknown
    ) => Promise<unknown>;
};

function createThenableQuery(result: unknown) {
    const chain: ThenableQuery = {
        or: jest.fn(() => chain),
        in: jest.fn(() => chain),
        ilike: jest.fn(() => chain),
        order: jest.fn(() => chain),
        range: jest.fn(() => chain),
        select: jest.fn(() => chain),
        then: (onFulfilled: (value: unknown) => unknown, onRejected: (reason: unknown) => unknown) =>
            Promise.resolve(result).then(onFulfilled, onRejected),
    };
    return chain;
}

describe('GET /api/expenses', () => {
    const { createClient } = jest.requireMock('@/lib/supabase/server') as { createClient: jest.Mock };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const makeRequest = (url: string) => new NextRequest(new Request(url));

    it('returns 400 when per_page is not allowed', async () => {
        const supabase: SupabaseMock = {
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
            from: jest.fn(),
        };
        createClient.mockResolvedValue(supabase);

        const res = await GET(makeRequest('http://localhost/api/expenses?per_page=999'));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body).toEqual(
            expect.objectContaining({
                error: 'Validation failed',
                details: expect.any(Array),
            })
        );
    });

    it('returns paginated data with pagination metadata and totals', async () => {
        const pageRows = [{ id: 'e1', amount_cop: 100, amount_usd: 1 }];
        const rowsResult = { data: pageRows, error: null, count: 1 };
        const totalsResult = {
            data: [
                {
                    amount_cop: 100,
                    amount_usd: 1,
                    amount_divided_cop: 0,
                    amount_divided_usd: 0,
                    amount_divided_3_cop: 0,
                    amount_divided_3_usd: 0,
                    amount_divided_4_cop: 0,
                    amount_divided_4_usd: 0,
                },
            ],
            error: null,
        };

        const rowsQuery = createThenableQuery(rowsResult);
        const totalsQuery = createThenableQuery(totalsResult);

        const supabase: SupabaseMock = {
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
            from: jest.fn(() => ({
                select: jest.fn((...args: unknown[]) => {
                    // First select is rows; second is totals (both via .from('expenses'))
                    const isRowsSelect = typeof args[0] === 'string' && args[0].includes('users(');
                    return isRowsSelect ? rowsQuery : totalsQuery;
                }),
            })),
        };

        createClient.mockResolvedValue(supabase);

        const res = await GET(makeRequest('http://localhost/api/expenses?page=1&per_page=20'));
        expect(res.status).toBe(200);
        const body = await res.json();

        expect(body).toEqual(
            expect.objectContaining({
                data: expect.any(Array),
                pagination: expect.objectContaining({
                    total: 1,
                    page: 1,
                    per_page: 20,
                    total_pages: 1,
                }),
                totals: expect.objectContaining({
                    amount_cop: 100,
                    amount_usd: 1,
                }),
            })
        );
        expect(body.data).toHaveLength(1);
    });

    it('does not produce NaN totals when amount columns are non-numeric', async () => {
        const pageRows = [{ id: 'e1', amount_cop: 100, amount_usd: 1 }];
        const rowsResult = { data: pageRows, error: null, count: 1 };
        const totalsResult = {
            data: [
                {
                    amount_cop: 'foo',
                    amount_usd: 'bar',
                    amount_divided_cop: null,
                    amount_divided_usd: undefined,
                    amount_divided_3_cop: 'NaN',
                    amount_divided_3_usd: 'Infinity',
                    amount_divided_4_cop: '-Infinity',
                    amount_divided_4_usd: 0,
                },
            ],
            error: null,
        };

        const rowsQuery = createThenableQuery(rowsResult);
        const totalsQuery = createThenableQuery(totalsResult);

        const supabase: SupabaseMock = {
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
            from: jest.fn(() => ({
                select: jest.fn((...args: unknown[]) => {
                    const isRowsSelect = typeof args[0] === 'string' && args[0].includes('users(');
                    return isRowsSelect ? rowsQuery : totalsQuery;
                }),
            })),
        };

        createClient.mockResolvedValue(supabase);

        const res = await GET(makeRequest('http://localhost/api/expenses?page=1&per_page=20'));
        expect(res.status).toBe(200);
        const body = await res.json();

        // Non-finite or non-numeric values are ignored; totals should remain finite numbers.
        expect(Number.isFinite(body.totals.amount_cop)).toBe(true);
        expect(Number.isFinite(body.totals.amount_usd)).toBe(true);
        expect(Number.isFinite(body.totals.amount_divided_3_cop)).toBe(true);
        expect(Number.isFinite(body.totals.amount_divided_3_usd)).toBe(true);
        expect(Number.isFinite(body.totals.amount_divided_4_cop)).toBe(true);
        expect(Number.isFinite(body.totals.amount_divided_4_usd)).toBe(true);

        expect(body.totals).toEqual(
            expect.objectContaining({
                amount_cop: 0,
                amount_usd: 0,
                amount_divided_3_cop: 0,
                amount_divided_3_usd: 0,
                amount_divided_4_cop: 0,
                amount_divided_4_usd: 0,
            })
        );
    });
});

