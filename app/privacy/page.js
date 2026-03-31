export default function PrivacyPage() {
  return (
    <div className="bg-gradient-to-b from-neutral-50 to-white">
      <div className="mx-auto max-w-4xl px-3 sm:px-5 lg:px-8 py-6 sm:py-10 lg:py-16">
        <div className="rounded-3xl border border-neutral-200 bg-white/90 shadow-sm p-5 sm:p-8 lg:p-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-neutral-900 tracking-tight">Privacy Policy for Nature Secret</h1>
          <p className="mt-3 inline-flex rounded-full border border-gold-200 bg-gold-50 px-3 py-1 text-xs sm:text-sm text-gold-800">
            Effective Date: March 31, 2026
          </p>

          <p className="mt-5 text-sm sm:text-base text-neutral-700 leading-relaxed">
            At Nature Secret, we are committed to protecting your privacy. This policy explains how we collect, use, and safeguard your
            information when you visit naturesecret.pk or interact with our advertisements.
          </p>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">1. Information We Collect</h2>
            <p className="mt-3 text-sm text-neutral-700">We collect information to provide a better shopping experience:</p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-700 list-disc list-inside">
              <li><span className="font-medium">Personal Information:</span> Name, email, phone number, and shipping/billing address provided during checkout.</li>
              <li><span className="font-medium">Order Details:</span> We maintain records of your purchases for fulfillment and support.</li>
              <li><span className="font-medium">Usage Data:</span> We automatically collect device information, IP addresses, and browsing behavior through cookies and pixels to analyze site performance.</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">2. Meta Advertising &amp; Data Privacy (Meta Pixel &amp; CAPI)</h2>
            <p className="mt-3 text-sm text-neutral-700">
              We use Meta Business Tools (such as the Meta Pixel and Conversions API) for ad targeting and measurement.
            </p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-700 list-disc list-inside">
              <li><span className="font-medium">No Sensitive Health Data:</span> We do not collect or share sensitive Protected Health Information (PHI), such as specific medical conditions, diagnoses, or health statuses, with Meta.</li>
              <li><span className="font-medium">Anonymized Identifiers:</span> All product data shared with Meta is anonymized using generic IDs to ensure user privacy and compliance with Meta&apos;s Health and Wellness policies.</li>
              <li><span className="font-medium">Opt-Out:</span> You can manage your ad preferences or opt-out of tracking through your Meta Ad Settings or your browser&apos;s cookie controls.</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">3. How We Use Your Information</h2>
            <p className="mt-3 text-sm text-neutral-700">We use your data strictly to:</p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-700 list-disc list-inside">
              <li>Process and ship your orders.</li>
              <li>Provide customer support and respond to inquiries.</li>
              <li>Improve our products and website experience.</li>
              <li>Send promotional updates (only if you have opted in).</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">4. Data Sharing</h2>
            <p className="mt-3 text-sm text-neutral-700">
              We do not sell or rent your personal information. We only share data with trusted partners necessary for our operations, such as:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-700 list-disc list-inside">
              <li><span className="font-medium">Payment Processors:</span> To securely handle transactions.</li>
              <li><span className="font-medium">Shipping Partners:</span> To deliver your orders.</li>
              <li><span className="font-medium">Regulatory Authorities:</span> Only if required by law.</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">5. Your Rights</h2>
            <p className="mt-3 text-sm text-neutral-700">
              You have the right to access, correct, or request the deletion of your personal data at any time.
            </p>
            <p className="mt-2 text-sm text-neutral-700">
              To exercise these rights, please contact us at <span className="font-medium">info@naturesecret.pk</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
