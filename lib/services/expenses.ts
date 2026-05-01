export function isValidMonth(value: string): boolean {
    if (!/^\d{4}-\d{2}$/.test(value)) return false;
    const monthNum = Number(value.slice(5, 7));
    return Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12;
}

export function applyExpenseFilters<TQuery>(
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
