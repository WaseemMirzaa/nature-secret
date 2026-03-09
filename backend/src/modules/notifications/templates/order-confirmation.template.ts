/**
 * Professional order confirmation email template – Nature Secret brand.
 * Inline styles only for email client compatibility.
 */

function escapeHtml(s: string | null | undefined): string {
  if (s == null) return '';
  const str = String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface OrderConfirmationData {
  orderId: string;
  customerName: string | null;
  totalFormatted: string;
  confirmationCode: string | null;
  createdAtFormatted: string;
  paymentMethod: string;
  address: string | null;
  itemsSummaryHtml: string;
}

export function renderOrderConfirmationEmail(data: OrderConfirmationData): string {
  const {
    orderId,
    customerName,
    totalFormatted,
    confirmationCode,
    createdAtFormatted,
    paymentMethod,
    address,
    itemsSummaryHtml,
  } = data;

  const name = escapeHtml(customerName || 'Customer');
  const code = escapeHtml(confirmationCode || '—');
  const payLabel = paymentMethod === 'cash_on_delivery' ? 'Cash on delivery' : escapeHtml(paymentMethod);
  const addressBr = address ? escapeHtml(address).replace(/\n/g, '<br>') : '—';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order confirmed – Nature Secret</title>
</head>
<body style="margin:0; padding:0; background-color:#fafaf9; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fafaf9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px;">
          <!-- Header -->
          <tr>
            <td style="background-color: #1c1917; padding: 28px 32px; border-radius: 16px 16px 0 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 600; color: #cba847; letter-spacing: 0.02em;">Nature Secret</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 6px;">
                    <span style="font-size: 13px; color: rgba(250,250,249,0.85); letter-spacing: 0.05em; text-transform: uppercase;">Order confirmed</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px; border-left: 1px solid #e7e5e4; border-right: 1px solid #e7e5e4;">
              <p style="margin: 0 0 24px; font-size: 16px; color: #44403c; line-height: 1.6;">Hello ${name},</p>
              <p style="margin: 0 0 24px; font-size: 16px; color: #44403c; line-height: 1.6;">Thank you for your order. We've received it and will notify you when it ships.</p>

              <!-- Order details card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fafaf9; border-radius: 12px; border: 1px solid #e7e5e4; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-bottom: 12px; border-bottom: 1px solid #e7e5e4;">
                          <span style="font-size: 11px; font-weight: 600; color: #78716c; letter-spacing: 0.08em; text-transform: uppercase;">Order details</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 16px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 14px; color: #44403c;">
                            <tr><td style="padding: 6px 0;"><span style="color: #78716c;">Order ID</span></td><td align="right" style="padding: 6px 0; font-weight: 500;">${escapeHtml(orderId)}</td></tr>
                            <tr><td style="padding: 6px 0;"><span style="color: #78716c;">Confirmation code</span></td><td align="right" style="padding: 6px 0; font-weight: 600; color: #cba847;">${code}</td></tr>
                            <tr><td style="padding: 6px 0;"><span style="color: #78716c;">Date</span></td><td align="right" style="padding: 6px 0;">${escapeHtml(createdAtFormatted)}</td></tr>
                            <tr><td style="padding: 6px 0;"><span style="color: #78716c;">Payment</span></td><td align="right" style="padding: 6px 0;">${payLabel}</td></tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Items -->
              <p style="margin: 0 0 8px; font-size: 11px; font-weight: 600; color: #78716c; letter-spacing: 0.08em; text-transform: uppercase;">Items</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 14px; color: #44403c; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e7e5e4; line-height: 1.5;">${itemsSummaryHtml}</td>
                </tr>
              </table>

              <!-- Total -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding: 16px 0; border-top: 2px solid #e7e5e4;">
                    <span style="font-size: 15px; font-weight: 600; color: #1c1917;">Total</span>
                    <span style="float: right; font-size: 18px; font-weight: 700; color: #cba847;">${escapeHtml(totalFormatted)}</span>
                  </td>
                </tr>
              </table>

              ${address ? `<p style="margin: 24px 0 0; font-size: 12px; color: #78716c; line-height: 1.5;"><strong style="color: #57534e;">Delivery address</strong><br>${addressBr}</p>` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #1c1917; padding: 24px 32px; border-radius: 0 0 16px 16px; border: 1px solid #1c1917;">
              <p style="margin: 0; font-size: 12px; color: rgba(250,250,249,0.75); line-height: 1.5;">We'll notify you when your order is shipped.</p>
              <p style="margin: 12px 0 0; font-size: 12px; color: rgba(250,250,249,0.6);">Nature Secret · Premium Herbal Oils &amp; Skincare</p>
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
