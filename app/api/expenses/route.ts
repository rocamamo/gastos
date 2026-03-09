import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { expenseSchema } from '@/lib/validations/expense';
import { getExchangeRate, convertCurrency } from '@/lib/services/currency';

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

    let query = supabase.from('expenses').select(`*, users(name, email), categories(name)`);

    if (months.length > 0) {
        const monthFilters = months.map(month => {
            const [year, monthNum] = month.split('-').map(Number);
            const startDate = `${month}-01`;
            const lastDay = new Date(year, monthNum, 0).getDate();
            const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
            return `and(expense_date.gte.${startDate},expense_date.lte.${endDate})`;
        });
        query = query.or(monthFilters.join(','));
    }

    if (categoryIds.length > 0) {
        query = query.in('category_id', categoryIds);
    }

    if (userIds.length > 0) {
        query = query.in('user_id', userIds);
    }

    if (search) {
        query = query.ilike('detail', `%${search}%`);
    }

    // Order by latest primary
    query = query.order('expense_date', { ascending: false }).order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
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
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
    }
}
