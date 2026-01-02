'use server';

import { Resend } from 'resend';
import { EmailContent, EmailProductInfo, NotificationType } from '@/types';

const Notification = {
  WELCOME: 'WELCOME',
  CHANGE_OF_STOCK: 'CHANGE_OF_STOCK',
  LOWEST_PRICE: 'LOWEST_PRICE',
  THRESHOLD_MET: 'THRESHOLD_MET',
};

// Lazy-load Resend client to avoid build-time initialization errors
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const THRESHOLD_PERCENTAGE = 40;

/**
 * Format price with currency symbol
 */
function formatPriceWithCurrency(
  price: number | undefined,
  currency: string | undefined,
): string {
  if (price === undefined) return 'N/A';
  const symbol = currency || '€';
  return `${symbol}${price.toFixed(2)}`;
}

/**
 * Generate base email wrapper with consistent styling
 */
function getEmailWrapper(
  content: string,
  productId?: string,
  userEmail?: string,
): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  // Remove trailing slash if present to avoid double-slash issues in links
  const baseUrl = envUrl.replace(/\/$/, '');

  const unsubscribeUrl =
    productId && userEmail
      ? `${baseUrl}/api/unsubscribe?productId=${productId}&email=${encodeURIComponent(userEmail)}`
      : '#';
  const manageUrl = userEmail
    ? `${baseUrl}/manage?email=${encodeURIComponent(userEmail)}`
    : `${baseUrl}/manage`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PriceWise Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background: linear-gradient(135deg, #E43030 0%, #FF6B6B 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                🛒 PriceWise
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-align: center;">
                You're receiving this email because you subscribed to price alerts on PriceWise.
              </p>
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
                <a href="${manageUrl}" style="color: #E43030; text-decoration: none;">Manage preferences</a>
                &nbsp;•&nbsp;
                <a href="${unsubscribeUrl}" style="color: #E43030; text-decoration: none;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate product card HTML for emails
 */
function getProductCard(product: EmailProductInfo): string {
  const priceDisplay = formatPriceWithCurrency(
    product.currentPrice,
    product.currency,
  );
  const originalPriceDisplay = formatPriceWithCurrency(
    product.originalPrice,
    product.currency,
  );

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <tr>
        ${
          product.image
            ? `
        <td width="120" style="padding: 16px; background-color: #f9fafb; vertical-align: top;">
          <img src="${product.image}" alt="${product.title}" style="width: 100px; height: 100px; object-fit: contain; border-radius: 4px;">
        </td>
        `
            : ''
        }
        <td style="padding: 16px; vertical-align: top;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827; line-height: 1.4;">
            ${product.title.length > 60 ? product.title.substring(0, 60) + '...' : product.title}
          </h3>
          <div style="margin-bottom: 12px;">
            <span style="font-size: 20px; font-weight: 700; color: #E43030;">${priceDisplay}</span>
            ${
              product.originalPrice &&
              product.originalPrice > (product.currentPrice || 0)
                ? `<span style="font-size: 14px; color: #9ca3af; text-decoration: line-through; margin-left: 8px;">${originalPriceDisplay}</span>`
                : ''
            }
            ${
              product.discountRate && product.discountRate > 0
                ? `<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background-color: #dcfce7; color: #166534; font-size: 12px; font-weight: 600; border-radius: 4px;">-${product.discountRate}%</span>`
                : ''
            }
          </div>
          <a href="${product.url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 20px; background-color: #E43030; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 6px;">
            View Product →
          </a>
        </td>
      </tr>
    </table>
  `;
}

export async function generateEmailBody(
  product: EmailProductInfo,
  type: NotificationType,
  userEmail?: string,
): Promise<EmailContent> {
  const shortenedTitle =
    product.title.length > 40
      ? `${product.title.substring(0, 40)}...`
      : product.title;

  let subject = '';
  let bodyContent = '';

  switch (type) {
    case Notification.WELCOME:
      subject = `🎉 Welcome! You're now tracking: ${shortenedTitle}`;
      bodyContent = `
        <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #111827;">
          Thanks for joining PriceWise! 🚀
        </h2>
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
          You're now tracking price changes for the following product. We'll notify you when:
        </p>
        <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #4b5563; line-height: 1.8;">
          <li>The price drops to its <strong>lowest ever</strong></li>
          <li>A <strong>big discount</strong> (40%+) becomes available</li>
          <li>The product is <strong>back in stock</strong></li>
        </ul>
        
        ${getProductCard(product)}
        
        <div style="margin-top: 24px; padding: 16px; background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e;">
          <p style="margin: 0; font-size: 14px; color: #166534;">
            <strong>💡 Pro tip:</strong> Track multiple products to compare prices and never miss a deal!
          </p>
        </div>
      `;
      break;

    case Notification.CHANGE_OF_STOCK:
      subject = `🔔 Back in Stock: ${shortenedTitle}`;
      bodyContent = `
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; padding: 8px 16px; background-color: #22c55e; color: #ffffff; font-size: 14px; font-weight: 700; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
            ✓ Back in Stock
          </span>
        </div>
        
        <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #111827; text-align: center;">
          Great news! Your tracked product is available again
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #4b5563; line-height: 1.6; text-align: center;">
          Don't wait too long — popular items can sell out quickly!
        </p>
        
        ${getProductCard(product)}
      `;
      break;

    case Notification.LOWEST_PRICE:
      subject = `🔥 LOWEST PRICE ALERT: ${shortenedTitle}`;
      bodyContent = `
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; padding: 8px 16px; background-color: #E43030; color: #ffffff; font-size: 14px; font-weight: 700; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
            🔥 Lowest Price Ever
          </span>
        </div>
        
        <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #111827; text-align: center;">
          This is the best price we've ever seen!
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #4b5563; line-height: 1.6; text-align: center;">
          Your tracked product has dropped to its <strong>all-time lowest price</strong>. This is the perfect time to buy!
        </p>
        
        ${getProductCard(product)}
        
        ${
          product.lowestPrice !== undefined
            ? `
        <div style="margin-top: 24px; padding: 20px; background-color: #fef2f2; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #991b1b;">
            Historical low price
          </p>
          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #E43030;">
            ${formatPriceWithCurrency(product.lowestPrice, product.currency)}
          </p>
        </div>
        `
            : ''
        }
      `;
      break;

    case Notification.THRESHOLD_MET:
      subject = `💰 ${product.discountRate || THRESHOLD_PERCENTAGE}% OFF: ${shortenedTitle}`;
      bodyContent = `
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #78350f; font-size: 18px; font-weight: 700; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
            ${product.discountRate || THRESHOLD_PERCENTAGE}% OFF
          </span>
        </div>
        
        <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #111827; text-align: center;">
          Major discount alert! 🎯
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #4b5563; line-height: 1.6; text-align: center;">
          Your tracked product is now available at a <strong>significant discount</strong>. Deals like this don't last long!
        </p>
        
        ${getProductCard(product)}
        
        <div style="margin-top: 24px; padding: 16px; background-color: #fefce8; border-radius: 8px; border-left: 4px solid #eab308;">
          <p style="margin: 0; font-size: 14px; color: #854d0e;">
            <strong>⏰ Act fast!</strong> Prices can change at any time. Get this deal before it's gone.
          </p>
        </div>
      `;
      break;

    default:
      throw new Error('Invalid notification type.');
  }

  const body = getEmailWrapper(bodyContent, product.productId, userEmail);

  return { subject, body };
}

export const sendEmail = async (
  emailContent: EmailContent,
  sendTo: string[],
) => {
  try {
    const { data, error } = await getResendClient().emails.send({
      from:
        process.env.RESEND_FROM_EMAIL || 'PriceWise <onboarding@resend.dev>',
      to: sendTo,
      subject: emailContent.subject,
      html: emailContent.body,
    });

    if (error) {
      console.error('Email error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
    return null;
  }
};
