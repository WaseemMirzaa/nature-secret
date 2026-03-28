export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-5 lg:px-8 py-5 sm:py-8 lg:py-16">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-neutral-900">Privacy Policy</h1>
      <p className="mt-3 text-sm text-neutral-500">Last updated: {new Date().getFullYear()}</p>

      <p className="mt-5 text-sm sm:text-base text-neutral-600 leading-relaxed">
        At Nature Secret, we respect your privacy and are committed to protecting your personal data. This policy explains how we
        collect, use and safeguard information when you visit our website, browse products, place an order or contact our support team.
      </p>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">1. Information we collect</h2>
        <p className="mt-3 text-sm text-neutral-600">
          We collect only the information required to process your orders, provide customer support and improve our products.
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-neutral-600 list-disc list-inside">
          <li><span className="font-medium">Contact details</span> – name, email address, phone number and shipping address.</li>
          <li><span className="font-medium">Account information</span> – if you create an account, we store basic profile details and your order history.</li>
          <li><span className="font-medium">Order details</span> – products purchased, payment status, delivery information.</li>
          <li><span className="font-medium">Device &amp; usage data</span> – pages viewed, actions taken, browser type and approximate location (for analytics only).</li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">2. How we use your information</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-neutral-600 list-disc list-inside">
          <li>To process and deliver your orders, including order confirmations and shipment updates.</li>
          <li>To provide customer support via email, WhatsApp and support tickets.</li>
          <li>To improve our website experience, product range and marketing messages.</li>
          <li>To detect and prevent fraud, abuse or security incidents.</li>
        </ul>
        <p className="mt-3 text-sm text-neutral-600">
          We do <span className="font-semibold">not</span> sell, rent or trade your personal data to third parties.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">3. Payments</h2>
        <p className="mt-3 text-sm text-neutral-600">
          Depending on your order, you may pay via cash on delivery or supported online payment methods. Online payments are processed
          securely by trusted payment providers; we do not store your full card details on our servers.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">4. Cookies &amp; analytics</h2>
        <p className="mt-3 text-sm text-neutral-600">
          We use cookies and similar technologies to remember your preferences, keep your cart active and understand how visitors use our
          website. This helps us improve performance and content. You can control cookies through your browser settings, but disabling
          them may affect some features (like keeping items in your cart).
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">5. WhatsApp &amp; communication</h2>
        <p className="mt-3 text-sm text-neutral-600">
          If you contact us via WhatsApp or opt in to receive order updates there, we will use your phone number only for
          service-related communication (order status, support and account queries). You can message us at any time to stop receiving
          non-essential updates.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">6. Data retention</h2>
        <p className="mt-3 text-sm text-neutral-600">
          We keep your information for as long as needed to provide our services, comply with legal obligations and resolve disputes.
          Order records may be retained for accounting and tax purposes even if you close your account.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">7. Your rights</h2>
        <p className="mt-3 text-sm text-neutral-600">
          Subject to applicable law, you may request to access, update or delete certain personal information we hold about you. You can
          also request to opt out of marketing emails.
        </p>
        <p className="mt-3 text-sm text-neutral-600">
          To make a request, please contact us via the details on our <span className="font-medium">Contact</span> page or email our
          support team.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">8. Changes to this policy</h2>
        <p className="mt-3 text-sm text-neutral-600">
          We may update this privacy policy from time to time to reflect changes in our services or legal requirements. The updated
          version will always be available on this page with the revised date.
        </p>
      </section>
    </div>
  );
}
