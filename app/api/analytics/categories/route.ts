import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: expenses, error } = await supabase.from('expenses').select('amount_cop, amount_usd, categories(name)');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const categoryData = expenses.reduce((acc: any, exp: any) => {
        const name = exp.categories?.name || 'Uncategorized';
        if (!acc[name]) {
            acc[name] = { category: name, total_cop: 0, total_usd: 0 };
        }
        acc[name].total_cop += Number(exp.amount_cop);
        acc[name].total_usd += Number(exp.amount_usd);
        return acc;
    }, {});

    const result = Object.values(categoryData).sort((a: any, b: any) => b.total_cop - a.total_cop);

    return NextResponse.json(result);
}
