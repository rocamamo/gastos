import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: expenses, error } = await supabase.from('expenses').select('amount_cop, amount_usd, expense_date');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const monthlyData = expenses.reduce((acc: any, exp) => {
        const month = exp.expense_date.substring(0, 7); // get YYYY-MM
        if (!acc[month]) {
            acc[month] = { month, total_cop: 0, total_usd: 0 };
        }
        acc[month].total_cop += Number(exp.amount_cop);
        acc[month].total_usd += Number(exp.amount_usd);
        return acc;
    }, {});

    const result = Object.values(monthlyData).sort((a: any, b: any) => a.month.localeCompare(b.month));

    return NextResponse.json(result);
}
