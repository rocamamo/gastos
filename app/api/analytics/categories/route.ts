import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIds = searchParams.getAll('user_id');
    const months = searchParams.getAll('month');
    const categoryIds = searchParams.getAll('category_id');

    let query = supabase.from('expenses').select('amount_cop, amount_usd, expense_date, user_id, category_id, categories(name)');

    if (userIds.length > 0) {
        query = query.in('user_id', userIds);
    }

    if (categoryIds.length > 0) {
        query = query.in('category_id', categoryIds);
    }

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

    const { data: expenses, error } = await query;

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
