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
<body style="margin:0; padding:0; background-color:#f4f4f2; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px;">
          <!-- Header -->
          <tr>
            <td style="background-color:#ffffff; padding:20px 24px; border-radius:18px 18px 0 0; border:1px solid #e5e5e0; border-bottom:none;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-right: 10px;">
                          <img src="https://naturesecret.pk/assets/nature-secret-logo.svg" alt="Nature Secret" width="40" height="40" style="display:block; border-radius:0; border:none; max-width:40px; height:auto;" />
                        </td>
                        <td>
                          <div style="font-size: 20px; font-weight: 600; color:#111827; letter-spacing: 0.05em; text-transform: uppercase;">Nature Secret</div>
                          <div style="margin-top: 2px; font-size: 11px; color:#6b7280; letter-spacing:0.18em; text-transform: uppercase;">Premium herbal oils &amp; skincare</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display:inline-block; padding: 6px 14px; border-radius: 999px; background:#fef9c3; border:1px solid #eab308; font-size: 11px; font-weight: 600; color:#854d0e; letter-spacing: 0.16em; text-transform: uppercase;">
                      Order confirmed
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff; padding: 28px 24px 24px; border-left: 1px solid #e5e5e0; border-right: 1px solid #e5e5e0; border-bottom:1px solid #e5e5e0;">
              <p style="margin: 0 0 18px; font-size: 16px; color:#111827; line-height: 1.6;">Hello ${name},</p>
              <p style="margin: 0 0 22px; font-size: 14px; color:#4b5563; line-height: 1.6;">Thank you for your order with Nature Secret. We’ve received it and will notify you when it ships.</p>

              <!-- Order details card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
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
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 14px; color:#374151;">
                            <tr><td style="padding: 6px 0;"><span style="color:#6b7280;">Order ID</span></td><td align="right" style="padding: 6px 0; font-weight: 500; color:#111827;">${escapeHtml(orderId)}</td></tr>
                            <tr><td style="padding: 6px 0;"><span style="color:#6b7280;">Confirmation code</span></td><td align="right" style="padding: 6px 0; font-weight: 600; color:#ca8a04;">${code}</td></tr>
                            <tr><td style="padding: 6px 0;"><span style="color:#6b7280;">Date</span></td><td align="right" style="padding: 6px 0;">${escapeHtml(createdAtFormatted)}</td></tr>
                            <tr><td style="padding: 6px 0;"><span style="color:#6b7280;">Payment</span></td><td align="right" style="padding: 6px 0;">${payLabel}</td></tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Items -->
              <p style="margin: 0 0 8px; font-size: 11px; font-weight: 600; color:#6b7280; letter-spacing: 0.08em; text-transform: uppercase;">Items</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 14px; color:#374151; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; line-height: 1.6;">${itemsSummaryHtml}</td>
                </tr>
              </table>

              <!-- Total -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding: 16px 0; border-top: 2px solid #e5e7eb;">
                    <span style="font-size: 15px; font-weight: 600; color:#111827;">Total</span>
                    <span style="float: right; font-size: 18px; font-weight: 700; color:#ca8a04;">${escapeHtml(totalFormatted)}</span>
                  </td>
                </tr>
              </table>

              ${address ? `<p style="margin: 24px 0 0; font-size: 12px; color:#6b7280; line-height: 1.5;"><strong style="color:#374151;">Delivery address</strong><br>${addressBr}</p>` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb; padding: 18px 24px; border-radius: 0 0 18px 18px; border:1px solid #e5e7eb; border-top:none;">
              <p style="margin: 0; font-size: 12px; color:#6b7280; line-height: 1.6;">
                We’ll notify you when your order is shipped. For questions, simply reply to this email or reach us via WhatsApp.
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; color:#9ca3af;">
                Nature Secret · Premium Herbal Oils &amp; Skincare · <a href="https://naturesecret.pk" style="color:#4b5563; text-decoration:none;">naturesecret.pk</a>
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
