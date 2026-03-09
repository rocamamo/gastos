import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { expenseSchema } from '@/lib/validations/expense';
import { getExchangeRate, convertCurrency } from '@/lib/services/currency';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const validatedData = expenseSchema.partial().parse(body);

        // Fetch existing to get current values for missing fields in partial update
        const { data: existing, error: fetchError } = await supabase
            .from('expenses')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        let updatePayload: any = { ...validatedData };

        // If amount, currency or date changed, we must recalculate converted values
        if (
            validatedData.amount !== undefined ||
            validatedData.currency !== undefined ||
            validatedData.expense_date !== undefined
        ) {
            const finalAmount = validatedData.amount ?? existing.amount;
            const finalCurrency = (validatedData.currency as 'COP' | 'USD') ?? existing.currency;
            const finalDate = validatedData.expense_date ?? existing.expense_date;

            const rate = await getExchangeRate(finalDate);
            const converted = convertCurrency(finalAmount, finalCurrency, rate);

            updatePayload.amount_cop = converted.amount_cop;
            updatePayload.amount_usd = converted.amount_usd;
        }

        const finalCategoryId = validatedData.category_id ?? existing.category_id;
        const { data: category } = await supabase
            .from('categories')
            .select('name')
            .eq('id', finalCategoryId)
            .single();

        const currentCop = updatePayload.amount_cop ?? existing.amount_cop;
        const currentUsd = updatePayload.amount_usd ?? existing.amount_usd;

        updatePayload.amount_divided_cop = 0;
        updatePayload.amount_divided_usd = 0;
        updatePayload.amount_divided_3_cop = 0;
        updatePayload.amount_divided_3_usd = 0;
        updatePayload.amount_divided_4_cop = 0;
        updatePayload.amount_divided_4_usd = 0;

        if (category) {
            if (['Mercado', 'Restaurantes', 'Servicios Públicos'].includes(category.name)) {
                updatePayload.amount_divided_4_cop = Number((currentCop / 4).toFixed(2));
                updatePayload.amount_divided_4_usd = Number((currentUsd / 4).toFixed(2));
            } else if (['Medicos', 'Médicos'].includes(category.name)) {
                updatePayload.amount_divided_3_cop = Number((currentCop / 3).toFixed(2));
                updatePayload.amount_divided_3_usd = Number((currentUsd / 3).toFixed(2));
            } else {
                updatePayload.amount_divided_cop = Number((currentCop / 2).toFixed(2));
                updatePayload.amount_divided_usd = Number((currentUsd / 2).toFixed(2));
            }
        }

        const { data, error } = await supabase
            .from('expenses')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
}
