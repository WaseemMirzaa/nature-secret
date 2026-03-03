/**
 * Local email sending stub.
 * Replace with your provider (SendGrid, Resend, etc.) or Cloudflare Workers email API.
 *
 * Usage: await sendOrderStatusEmail({ to, orderId, status, customerName });
 */
export async function sendOrderStatusEmail({ to, orderId, status, customerName }) {
  // Stub: log instead of sending. Replace with real API call.
  if (typeof window !== 'undefined') {
    console.log('[Email stub] Would send to:', to, 'Order:', orderId, 'Status:', status, 'Name:', customerName);
    return { ok: true };
  }
  // Server-side: e.g. await fetch('https://api.sendgrid.com/v3/mail/send', { ... })
  return { ok: true };
}

export async function sendOrderConfirmationEmail({ to, orderId, customerName, total }) {
  if (typeof window !== 'undefined') {
    console.log('[Email stub] Order confirmation to:', to, orderId, customerName, total);
    return { ok: true };
  }
  return { ok: true };
}
