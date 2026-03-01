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

    let query = supabase.from('expenses').select('amount_cop, amount_usd, expense_date, user_id, category_id');

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
