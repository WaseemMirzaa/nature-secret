# Order push notifications (mobile app)

Admins can get push notifications on their phones when a new order arrives.

## Backend setup

1. **Generate VAPID keys** (once):
   ```bash
   cd backend && node -e "const w=require('web-push'); const k=w.generateVAPIDKeys(); console.log('VAPID_PUBLIC_KEY='+k.publicKey); console.log('VAPID_PRIVATE_KEY='+k.privateKey);"
   ```
2. **Add to `.env`**:
   ```
   VAPID_PUBLIC_KEY=<paste public key>
   VAPID_PRIVATE_KEY=<paste private key>
   ```
3. Subscriptions are stored in `backend/data/push-subscriptions.json` (or `PUSH_DATA_DIR`).

## Using on your phone

1. Open your site (e.g. `https://yoursite.com`) and log in as admin.
2. Go to **Admin → Order notifications**.
3. Tap **Enable notifications** and allow when prompted.
4. Add to home screen: browser menu → **Add to Home Screen** (or **Install app**).
5. You’ll get a push when a new order is placed; tap it to open the order.
