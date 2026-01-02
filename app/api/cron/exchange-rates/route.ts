import { NextResponse } from 'next/server';
import { fetchAndCacheRates } from '@/lib/exchangeRates';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key !== process.env.CRON_SECRET) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const success = await fetchAndCacheRates();

    if (!success) {
      return NextResponse.json(
        { message: 'Failed to fetch exchange rates' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: 'Exchange rates updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Exchange rate cron error:', error);
    return NextResponse.json(
      { message: `Error: ${error.message}` },
      { status: 500 },
    );
  }
}
