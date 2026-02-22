import { NextRequest, NextResponse } from 'next/server';
import { getExchangeRate } from '@/lib/services/currency';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || undefined;

    try {
        const rate = await getExchangeRate(date);
        return NextResponse.json({ rate });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
