import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all expenses to calculate summary KPIs
    const { data: expenses, error } = await supabase.from('expenses').select('amount_cop, amount_usd, user_id, users(name)');

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

    const uniquePeopleCount = Object.keys(byPerson).length || 1;
    const average_cop = totalCop / uniquePeopleCount;
    const average_usd = totalUsd / uniquePeopleCount;

    return NextResponse.json({
        total_cop: totalCop,
        total_usd: totalUsd,
        average_cop,
        average_usd,
        by_person: personSummary
    });
}
