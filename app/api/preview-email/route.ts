import { generateEmailBody } from '@/lib/nodemailer';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Email Preview Route (Development Only)
 *
 * Usage: /api/preview-email?type=WELCOME|LOWEST_PRICE|THRESHOLD_MET|CHANGE_OF_STOCK
 *
 * This route renders email templates for visual testing during development.
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Email preview is only available in development' },
      { status: 403 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'WELCOME';

  // Sample product data for preview
  const sampleProduct = {
    title:
      'Apple AirPods Pro (2nd Generation) - Active Noise Cancelling, Personalized Spatial Audio',
    url: 'https://www.amazon.com/dp/B0D1XD1ZV3',
    image: 'https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SL1500_.jpg',
    currentPrice: 189.99,
    originalPrice: 249.99,
    lowestPrice: 169.0,
    currency: '$',
    discountRate: 24,
  };

  try {
    const validTypes = [
      'WELCOME',
      'LOWEST_PRICE',
      'THRESHOLD_MET',
      'CHANGE_OF_STOCK',
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Use one of: ${validTypes.join(', ')}` },
        { status: 400 },
      );
    }

    const emailContent = await generateEmailBody(
      { ...sampleProduct, productId: '667c2b50a952377e9b440cd9' },
      type as 'WELCOME' | 'LOWEST_PRICE' | 'THRESHOLD_MET' | 'CHANGE_OF_STOCK',
      'test@example.com',
    );

    // Return raw HTML for preview
    return new NextResponse(emailContent.body, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Email preview error:', error);
    return NextResponse.json(
      { error: 'Failed to generate email preview' },
      { status: 500 },
    );
  }
}
