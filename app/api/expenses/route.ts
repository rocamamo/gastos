import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { expenseSchema } from '@/lib/validations/expense';
import { getExchangeRate, convertCurrency } from '@/lib/services/currency';
import { ZodError } from 'zod';

const ALLOWED_PER_PAGE = new Set([10, 20, 50]);
const DEFAULT_PER_PAGE = 20;

function parsePositiveInt(value: string | null): number | null {
    if (!value) return null;
    if (!/^\d+$/.test(value)) return null;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return null;
    return parsed;
}

function isValidMonth(value: string): boolean {
    if (!/^\d{4}-\d{2}$/.test(value)) return false;
    const monthNum = Number(value.slice(5, 7));
    return Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12;
}

function applyExpenseFilters<TQuery>(
    query: TQuery,
    {
        months,
        categoryIds,
        userIds,
        search,
    }: {
        months: string[];
        categoryIds: string[];
        userIds: string[];
        search: string | null;
    }
) {
    let q: any = query;

    if (months.length > 0) {
        const monthFilters = months.map(month => {
            const [year, monthNum] = month.split('-').map(Number);
            const startDate = `${month}-01`;
            const lastDay = new Date(year, monthNum, 0).getDate();
            const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
            return `and(expense_date.gte.${startDate},expense_date.lte.${endDate})`;
        });
        q = q.or(monthFilters.join(','));
    }

    if (categoryIds.length > 0) {
        q = q.in('category_id', categoryIds);
    }

    if (userIds.length > 0) {
        q = q.in('user_id', userIds);
    }

    if (search) {
        q = q.ilike('detail', `%${search}%`);
    }

    return q;
}

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const months = searchParams.getAll('month'); // format: YYYY-MM (multiple)
    const categoryIds = searchParams.getAll('category_id'); // multiple
    const userIds = searchParams.getAll('user_id'); // multiple
    const search = searchParams.get('search');

    const invalidMonths = months.filter((m) => !isValidMonth(m));
    if (invalidMonths.length > 0) {
        return NextResponse.json(
            { error: 'Validation failed', details: invalidMonths.map((m) => ({ path: ['month'], message: `month inválido: ${m} (formato esperado YYYY-MM)` })) },
            { status: 400 }
        );
    }

    const pageParam = parsePositiveInt(searchParams.get('page')) ?? 1;
    const perPageRaw = parsePositiveInt(searchParams.get('per_page')) ?? DEFAULT_PER_PAGE;

    if (!ALLOWED_PER_PAGE.has(perPageRaw)) {
        return NextResponse.json(
            { error: 'Validation failed', details: [{ path: ['per_page'], message: `per_page debe ser uno de: ${Array.from(ALLOWED_PER_PAGE).join(', ')}` }] },
            { status: 400 }
        );
    }

    let page = pageParam;
    const per_page = perPageRaw;

    // rows query (paginated)
    let rowsQuery = supabase
        .from('expenses')
        .select(`*, users(name, email), categories(name)`, { count: 'exact' });

    rowsQuery = applyExpenseFilters(rowsQuery, { months, categoryIds, userIds, search });

    // Order by latest primary
    rowsQuery = rowsQuery.order('expense_date', { ascending: false }).order('created_at', { ascending: false });

    const start = (page - 1) * per_page;
    const end = start + per_page - 1;
    rowsQuery = rowsQuery.range(start, end);

    const [{ data: pageRows, error: pageError, count }, { data: totalsRows, error: totalsError }] =
        await Promise.all([
            rowsQuery,
            applyExpenseFilters(
                supabase
                    .from('expenses')
                    .select(
                        [
                            'amount_cop.sum()',
                            'amount_usd.sum()',
                            'amount_divided_cop.sum()',
                            'amount_divided_usd.sum()',
                            'amount_divided_3_cop.sum()',
                            'amount_divided_3_usd.sum()',
                            'amount_divided_4_cop.sum()',
                            'amount_divided_4_usd.sum()',
                        ].join(',')
                    ),
                { months, categoryIds, userIds, search }
            ),
        ]);

    if (pageError) {
        return NextResponse.json({ error: pageError.message }, { status: 500 });
    }
    if (totalsError) {
        return NextResponse.json({ error: totalsError.message }, { status: 500 });
    }

    const total = count ?? 0;
    const total_pages = total === 0 ? 0 : Math.max(1, Math.ceil(total / per_page));
    const totalsRow = ((totalsRows?.[0] ?? {}) as unknown) as Record<string, unknown>;

    if (total === 0) {
        return NextResponse.json({
            data: [],
            pagination: { total, page: 1, per_page, total_pages },
            totals: {
                amount_cop: Number(totalsRow.amount_cop ?? 0),
                amount_usd: Number(totalsRow.amount_usd ?? 0),
                amount_divided_cop: Number(totalsRow.amount_divided_cop ?? 0),
                amount_divided_usd: Number(totalsRow.amount_divided_usd ?? 0),
                amount_divided_3_cop: Number(totalsRow.amount_divided_3_cop ?? 0),
                amount_divided_3_usd: Number(totalsRow.amount_divided_3_usd ?? 0),
                amount_divided_4_cop: Number(totalsRow.amount_divided_4_cop ?? 0),
                amount_divided_4_usd: Number(totalsRow.amount_divided_4_usd ?? 0),
            },
        });
    }

    // Normalize page if out of range (e.g. shared URL)
    if (total_pages > 0 && page > total_pages) {
        page = total_pages;
        const normalizedStart = (page - 1) * per_page;
        const normalizedEnd = normalizedStart + per_page - 1;
        const { data: normalizedRows, error: normalizedError } = await applyExpenseFilters(
            supabase
                .from('expenses')
                .select(`*, users(name, email), categories(name)`)
                .order('expense_date', { ascending: false })
                .order('created_at', { ascending: false })
                .range(normalizedStart, normalizedEnd),
            { months, categoryIds, userIds, search }
        );
        if (normalizedError) {
            return NextResponse.json({ error: normalizedError.message }, { status: 500 });
        }
        return NextResponse.json({
            data: normalizedRows ?? [],
            pagination: { total, page, per_page, total_pages },
            totals: {
                amount_cop: Number(totalsRow.amount_cop ?? 0),
                amount_usd: Number(totalsRow.amount_usd ?? 0),
                amount_divided_cop: Number(totalsRow.amount_divided_cop ?? 0),
                amount_divided_usd: Number(totalsRow.amount_divided_usd ?? 0),
                amount_divided_3_cop: Number(totalsRow.amount_divided_3_cop ?? 0),
                amount_divided_3_usd: Number(totalsRow.amount_divided_3_usd ?? 0),
                amount_divided_4_cop: Number(totalsRow.amount_divided_4_cop ?? 0),
                amount_divided_4_usd: Number(totalsRow.amount_divided_4_usd ?? 0),
            },
        });
    }

    return NextResponse.json({
        data: pageRows ?? [],
        pagination: { total, page, per_page, total_pages },
        totals: {
            amount_cop: Number(totalsRow.amount_cop ?? 0),
            amount_usd: Number(totalsRow.amount_usd ?? 0),
            amount_divided_cop: Number(totalsRow.amount_divided_cop ?? 0),
            amount_divided_usd: Number(totalsRow.amount_divided_usd ?? 0),
            amount_divided_3_cop: Number(totalsRow.amount_divided_3_cop ?? 0),
            amount_divided_3_usd: Number(totalsRow.amount_divided_3_usd ?? 0),
            amount_divided_4_cop: Number(totalsRow.amount_divided_4_cop ?? 0),
            amount_divided_4_usd: Number(totalsRow.amount_divided_4_usd ?? 0),
        },
    });
}

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const validatedData = expenseSchema.parse(body);

        const { data: category } = await supabase
            .from('categories')
            .select('name')
            .eq('id', validatedData.category_id)
            .single();

        const rate = await getExchangeRate(validatedData.expense_date);
        const converted = convertCurrency(validatedData.amount, validatedData.currency, rate);

        let amount_divided_cop = 0;
        let amount_divided_usd = 0;
        let amount_divided_3_cop = 0;
        let amount_divided_3_usd = 0;
        let amount_divided_4_cop = 0;
        let amount_divided_4_usd = 0;

        if (category) {
            if (['Mercado', 'Restaurantes', 'Servicios Públicos'].includes(category.name)) {
                amount_divided_4_cop = Number((converted.amount_cop / 4).toFixed(2));
                amount_divided_4_usd = Number((converted.amount_usd / 4).toFixed(2));
            } else if (['Medicos', 'Médicos'].includes(category.name)) {
                amount_divided_3_cop = Number((converted.amount_cop / 3).toFixed(2));
                amount_divided_3_usd = Number((converted.amount_usd / 3).toFixed(2));
            } else {
                amount_divided_cop = Number((converted.amount_cop / 2).toFixed(2));
                amount_divided_usd = Number((converted.amount_usd / 2).toFixed(2));
            }
        }

        const { data, error } = await supabase.from('expenses').insert({
            user_id: user.id,
            category_id: validatedData.category_id,
            detail: validatedData.detail,
            amount: validatedData.amount,
            currency: validatedData.currency,
            amount_cop: converted.amount_cop,
            amount_usd: converted.amount_usd,
            amount_divided_cop,
            amount_divided_usd,
            amount_divided_3_cop,
            amount_divided_3_usd,
            amount_divided_4_cop,
            amount_divided_4_usd,
            expense_date: validatedData.expense_date,
            attachment_url: validatedData.attachment_url || null,
        }).select().single();

        if (error) throw error;

        return NextResponse.json(data, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
        }
        const message = error instanceof Error ? error.message : 'Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
