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
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">2. Cookies Policy</h2>
            <p className="mt-3 text-sm text-neutral-700">We use cookies and similar technologies to:</p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-700 list-disc list-inside">
              <li>Improve site functionality</li>
              <li>Analyze traffic and how visitors use the site</li>
              <li>Enhance your shopping experience</li>
            </ul>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              You can disable cookies in your browser settings; some features may not work correctly if you do.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">3. Data Security</h2>
            <p className="mt-3 text-sm text-neutral-700">We take reasonable, industry-standard steps to protect your personal information, including:</p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-700 list-disc list-inside">
              <li>Secure hosting and server practices</li>
              <li>Restricted internal access where appropriate</li>
              <li>Encrypted communication where applicable (for example HTTPS)</li>
            </ul>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              No online system is completely risk-free; we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">4. Children&apos;s Privacy</h2>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              Our website is intended for adults. We do not knowingly collect personal information from anyone under 18. If you believe a minor has shared data with us,
              contact us and we will take appropriate steps.
            </p>
            <p className="mt-2 text-sm text-neutral-700">
              For safe use of products around children, see our{' '}
              <a href="/kids-safety" className="font-medium text-gold-800 underline underline-offset-2 hover:text-gold-900">Kids safety</a> page.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">5. Meta Advertising &amp; Data Privacy (Meta Pixel &amp; CAPI)</h2>
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
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">6. How We Use Your Information</h2>
            <p className="mt-3 text-sm text-neutral-700">We use your data strictly to:</p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-700 list-disc list-inside">
              <li>Process and ship your orders.</li>
              <li>Provide customer support and respond to inquiries.</li>
              <li>Improve our products and website experience.</li>
              <li>Send promotional updates (only if you have opted in).</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">7. Data Sharing</h2>
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
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">8. Your Rights</h2>
            <p className="mt-3 text-sm text-neutral-700">You have the right to:</p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-700 list-disc list-inside">
              <li>Request access to the personal data we hold about you</li>
              <li>Request correction or deletion of your data, subject to legal and operational limits</li>
              <li>Opt out of marketing communications at any time (use the unsubscribe link in emails or contact us)</li>
            </ul>
            <p className="mt-3 text-sm text-neutral-700">
              To exercise these rights, email <span className="font-medium">support@naturesecret.pk</span>.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">9. Health &amp; Product Disclaimer</h2>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              Our herbal oils, skincare, and related wellness products are intended for general self-care and lifestyle use only.
            </p>
            <p className="mt-3 text-sm font-medium text-neutral-800">Information on our website:</p>
            <ul className="mt-2 space-y-2 text-sm text-neutral-700 list-disc list-inside">
              <li>Is not medical advice</li>
              <li>Is not intended to diagnose, treat, cure, or prevent any disease</li>
              <li>Should not replace consultation with a qualified healthcare professional</li>
            </ul>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              Always consult a qualified professional before using supplements or wellness products, especially if you are pregnant, nursing, or have a health concern.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">10. Third-Party Links</h2>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              We may link to other sites or services we do not operate. We are not responsible for their content, policies, or any transaction you make with them.
              Please read their terms and privacy notices before you share data or make a purchase.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">11. User Content &amp; Submissions</h2>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              If you submit reviews, comments, or other materials, you grant Nature Secret a broad licence to use, reproduce, and display that content in connection
              with the website and marketing, without owing you compensation unless we have agreed otherwise in writing. You remain responsible for what you post and
              confirm it does not violate law or third-party rights.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">12. How We Handle Information You Submit</h2>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              Personal details you provide through forms, checkout, or support channels are handled as described in Sections 1–8 above. For site-wide rules on orders,
              products, and liability, see our <a href="/terms" className="font-medium text-gold-800 underline underline-offset-2 hover:text-gold-900">Terms of Service</a>.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">13. Accuracy of Information</h2>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              We may correct typographical errors, outdated details, or omissions on this policy or elsewhere on the site at any time without prior notice.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">14. No Warranties; Limitation of Liability</h2>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              The website and its content are provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. To the maximum extent allowed by applicable law,
              Nature Secret disclaims warranties implied by law where permissible and is not liable for indirect or consequential loss arising from your use of the site
              or reliance on information here, except where liability cannot be excluded by law.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">15. Indemnity</h2>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              You agree to defend and hold Nature Secret harmless from claims, losses, or costs (including reasonable legal fees) arising from your breach of this
              policy, misuse of the site, or unlawful content you submit.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">16. Severability</h2>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              If any part of this Privacy Policy is held invalid, the remaining provisions stay in effect.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">17. Access to the Service</h2>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              We may suspend or end access to the website where reasonably necessary. Obligations that logically survive (such as limits on liability where allowed, or
              duties regarding data already processed) continue after any suspension or closure.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">18. Relationship With Other Documents</h2>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              This Privacy Policy works together with our Terms of Service. Where topics overlap, both documents apply as appropriate.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">19. Governing Law</h2>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              This Privacy Policy is governed by the laws of Pakistan, without regard to conflict-of-law rules, except where mandatory local consumer protections apply.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">20. Changes to This Privacy Policy</h2>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              Nature Secret may update this Privacy Policy from time to time to reflect changes in laws, our practices, or our services. When we update it, we will post
              the new version on this page and change the effective date at the top. We encourage you to review this policy periodically.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
