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

    let query = supabase.from('expenses').select('amount_cop, amount_usd, user_id, expense_date, category_id, users(name)');

    if (userIds.length > 0) {
        query = query.in('user_id', userIds);
    }

    if (categoryIds.length > 0) {
        query = query.in('category_id', categoryIds);
    }

    if (months.length > 0) {
        // Build OR filter for multiple months
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

    // Calculate totals
    const totalCop = expenses.reduce((acc, exp) => acc + Number(exp.amount_cop), 0);
    const totalUsd = expenses.reduce((acc, exp) => acc + Number(exp.amount_usd), 0);

    // Total by person
    const byPerson = expenses.reduce((acc: any, exp: any) => {
        const name = exp.users?.name || 'Unknown';
        if (!acc[name]) {
            acc[name] = { total_cop: 0, total_usd: 0, count: 0 };
        }
        acc[name].total_cop += Number(exp.amount_cop);
        acc[name].total_usd += Number(exp.amount_usd);
        acc[name].count += 1;
        return acc;
    }, {});

    const personSummary = Object.keys(byPerson).map(name => ({
        name,
        total_cop: byPerson[name].total_cop,
        total_usd: byPerson[name].total_usd,
        count: byPerson[name].count
    }));

    // Monthly average
    const monthlyTotals = expenses.reduce((acc: any, exp: any) => {
        const month = exp.expense_date.substring(0, 7);
        if (!acc[month]) {
            acc[month] = { total_cop: 0, total_usd: 0 };
        }
        acc[month].total_cop += Number(exp.amount_cop);
        acc[month].total_usd += Number(exp.amount_usd);
        return acc;
    }, {});

    const monthCount = Object.keys(monthlyTotals).length || 1;
    const monthly_average_cop = totalCop / monthCount;
    const monthly_average_usd = totalUsd / monthCount;

    return NextResponse.json({
        total_cop: totalCop,
        total_usd: totalUsd,
        monthly_average_cop,
        monthly_average_usd,
        by_person: personSummary
    });
}
