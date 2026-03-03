# Order notifications – Gmail & WhatsApp

## 1. Email (Gmail) – order confirmation

After an order is created, the backend sends a confirmation email to the customer address.

**Backend env (`.env`):**
- `GMAIL_USER` – your Gmail address (e.g. `naturesecret@gmail.com`)
- `GMAIL_APP_PASSWORD` – [App Password](https://support.google.com/accounts/answer/185833) (if 2FA is on) or account password

Create an App Password: Google Account → Security → 2-Step Verification → App passwords → Generate for “Mail”.

## 2. WhatsApp – confirmation message and reply-to-confirm

- When an order is placed, the backend sends a WhatsApp message to the customer phone:  
  `"Nature Secret: Your order #ORD-xxx has been placed. Reply YES to confirm your order."`
- If the customer replies **YES** (or “YES” with optional code), the order status is set to **confirmed** and a timeline entry is stored (changedBy: `whatsapp`).

**Backend env (`.env`):**
- `TWILIO_ACCOUNT_SID` – from [Twilio Console](https://console.twilio.com)
- `TWILIO_AUTH_TOKEN` – from Twilio Console
- `TWILIO_WHATSAPP_FROM` – WhatsApp sender (e.g. sandbox `whatsapp:+14155238886` or your Twilio WhatsApp number)

**Twilio WhatsApp webhook:**  
Point your Twilio WhatsApp number (or sandbox) “When a message comes in” to:
`https://your-api-domain.com/api/v1/webhooks/whatsapp`  
Method: POST.

If the backend is local, use a tunnel (e.g. ngrok) and set that URL in Twilio.

## 3. Order status flow

1. **pending** – order created; email + WhatsApp sent.
2. **confirmed** – customer replied YES on WhatsApp (or admin sets it).
3. **processing** / **shipped** / **delivered** – set by admin/staff as before.

All status changes are stored in the order status timeline (including `whatsapp` for confirmation).
