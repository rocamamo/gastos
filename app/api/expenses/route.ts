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
    const month = searchParams.get('month'); // format: YYYY-MM
    const category_id = searchParams.get('category_id');
    const user_id = searchParams.get('user_id');
    const search = searchParams.get('search');

    let query = supabase.from('expenses').select(`*, users(name, email), categories(name)`);

    if (month) {
        const [year, monthNum] = month.split('-').map(Number);
        const startDate = `${month}-01`;
        const lastDay = new Date(year, monthNum, 0).getDate();
        const endDate = `${month}-${lastDay}`;
        query = query.gte('expense_date', startDate).lte('expense_date', endDate);
    }

    if (category_id) {
        query = query.eq('category_id', category_id);
    }

    if (user_id) {
        query = query.eq('user_id', user_id);
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

        const rate = await getExchangeRate(validatedData.expense_date);
        const converted = convertCurrency(validatedData.amount, validatedData.currency, rate);

        const { data, error } = await supabase.from('expenses').insert({
            user_id: user.id,
            category_id: validatedData.category_id,
            detail: validatedData.detail,
            amount: validatedData.amount,
            currency: validatedData.currency,
            amount_cop: converted.amount_cop,
            amount_usd: converted.amount_usd,
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
