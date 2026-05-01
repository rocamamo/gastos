import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidMonth, applyExpenseFilters } from '@/lib/services/expenses';
import ExcelJS from 'exceljs';
import { PassThrough } from 'stream';

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const months = searchParams.getAll('month');
    const categoryIds = searchParams.getAll('category_id');
    const userIds = searchParams.getAll('user_id');
    const search = searchParams.get('search');

    const invalidMonths = months.filter((m) => !isValidMonth(m));
    if (invalidMonths.length > 0) {
        return NextResponse.json(
            { error: 'Validation failed', details: invalidMonths.map((m) => ({ path: ['month'], message: `month inválido: ${m}` })) },
            { status: 400 }
        );
    }

    const passThrough = new PassThrough();

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: passThrough,
        useStyles: true,
        useSharedStrings: true
    });

    const worksheet = workbook.addWorksheet('Gastos');

    // Define columns
    worksheet.columns = [
        { header: 'Fecha', key: 'expense_date', width: 15 },
        { header: 'Usuario', key: 'user_name', width: 20 },
        { header: 'Categoría', key: 'category_name', width: 20 },
        { header: 'Detalle', key: 'detail', width: 40 },
        { header: 'Monto Total (COP)', key: 'amount_cop', width: 18, style: { numFmt: '#,##0.00' } },
        { header: 'Monto Total (USD)', key: 'amount_usd', width: 18, style: { numFmt: '#,##0.00' } },
        { header: 'Monto ÷ 2 (COP)', key: 'amount_divided_cop', width: 18, style: { numFmt: '#,##0.00' } },
        { header: 'Monto ÷ 2 (USD)', key: 'amount_divided_usd', width: 18, style: { numFmt: '#,##0.00' } },
        { header: 'Monto ÷ 3 (COP)', key: 'amount_divided_3_cop', width: 18, style: { numFmt: '#,##0.00' } },
        { header: 'Monto ÷ 3 (USD)', key: 'amount_divided_3_usd', width: 18, style: { numFmt: '#,##0.00' } },
        { header: 'Monto ÷ 4 (COP)', key: 'amount_divided_4_cop', width: 18, style: { numFmt: '#,##0.00' } },
        { header: 'Monto ÷ 4 (USD)', key: 'amount_divided_4_usd', width: 18, style: { numFmt: '#,##0.00' } },
    ];

    // Style header (WorkbookWriter handles this differently, usually need to commit)
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).commit();

    // Async function to fetch and write data
    const writeData = async () => {
        try {
            const CHUNK_SIZE = 1000;
            let offset = 0;
            let hasMore = true;

            while (hasMore) {
                let query = supabase
                    .from('expenses')
                    .select(`*, users(name), categories(name)`)
                    .range(offset, offset + CHUNK_SIZE - 1);

                query = applyExpenseFilters(query, { months, categoryIds, userIds, search });
                query = query.order('expense_date', { ascending: false }).order('created_at', { ascending: false });

                const { data: expenses, error } = await query;

                if (error) {
                    throw error;
                }

                if (!expenses || expenses.length === 0) {
                    hasMore = false;
                    break;
                }

                expenses.forEach((expense) => {
                    worksheet.addRow({
                        expense_date: new Date(expense.expense_date),
                        user_name: expense.users?.name || 'N/A',
                        category_name: expense.categories?.name || 'N/A',
                        detail: expense.detail,
                        amount_cop: expense.amount_cop,
                        amount_usd: expense.amount_usd,
                        amount_divided_cop: expense.amount_divided_cop,
                        amount_divided_usd: expense.amount_divided_usd,
                        amount_divided_3_cop: expense.amount_divided_3_cop,
                        amount_divided_3_usd: expense.amount_divided_3_usd,
                        amount_divided_4_cop: expense.amount_divided_4_cop,
                        amount_divided_4_usd: expense.amount_divided_4_usd,
                    }).commit();
                });

                if (expenses.length < CHUNK_SIZE) {
                    hasMore = false;
                } else {
                    offset += CHUNK_SIZE;
                }
            }

            await workbook.commit();
        } catch (err) {
            console.error('Excel generation error:', err);
            passThrough.destroy(err instanceof Error ? err : new Error('Unknown error'));
        }
    };

    // Trigger data writing
    writeData();

    // Filename with current date
    const today = new Date().toISOString().split('T')[0];
    const filename = `gastos_${today}.xlsx`;

    // Convert PassThrough to ReadableStream for Next.js
    const readable = new ReadableStream({
        start(controller) {
            passThrough.on('data', (chunk) => controller.enqueue(chunk));
            passThrough.on('end', () => controller.close());
            passThrough.on('error', (err) => controller.error(err));
        },
        cancel() {
            passThrough.destroy();
        },
    });

    return new Response(readable, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache',
        },
    });
}
