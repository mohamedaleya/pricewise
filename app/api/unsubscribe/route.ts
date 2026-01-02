import { unsubscribeUser } from '@/lib/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const productId = searchParams.get('productId');
  const email = searchParams.get('email');

  if (!productId || !email) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const result = await unsubscribeUser(productId, email);

    if (result.success) {
      // Redirect to a nice "Unsubscribed" page
      // We'll create this page next
      const baseUrl = request.nextUrl.origin;
      return NextResponse.redirect(
        `${baseUrl}/unsubscribed?email=${encodeURIComponent(email)}`,
      );
    } else {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
