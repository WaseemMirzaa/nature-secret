export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-5 lg:px-8 py-5 sm:py-8 lg:py-16">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-neutral-900">Terms of Service</h1>
      <p className="mt-3 text-sm text-neutral-500">Last updated: {new Date().getFullYear()}</p>

      <p className="mt-5 text-sm sm:text-base text-neutral-600 leading-relaxed">
        These Terms of Service govern your use of the Nature Secret website, products and services. By accessing or placing an order
        through our site, you agree to be bound by these terms.
      </p>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">1. Use of the website</h2>
        <p className="mt-3 text-sm text-neutral-600">
          You agree to use this website for lawful purposes only and in a way that does not infringe the rights of, restrict or inhibit
          anyone else&apos;s use and enjoyment of the site. You must not attempt to interfere with the security or proper functioning of
          the website.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">2. Product information</h2>
        <p className="mt-3 text-sm text-neutral-600">
          We make every effort to display product information (ingredients, usage, benefits) accurately. However, minor variations in
          packaging or formulation may occur over time. Our products are not intended to diagnose, treat, cure or prevent any disease.
          Individual results may vary.
        </p>
        <p className="mt-3 text-sm text-neutral-600">
          Always follow the usage instructions on the label and consult a qualified healthcare professional if you are pregnant,
          nursing, on medication or have a medical condition.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">3. Orders &amp; pricing</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-neutral-600 list-disc list-inside">
          <li>All prices are listed in PKR unless stated otherwise.</li>
          <li>Placing an order constitutes an offer to purchase the selected products.</li>
          <li>We reserve the right to accept or decline any order at our discretion (e.g., due to stock issues or suspected fraud).</li>
          <li>If a pricing or stock error is discovered after you place an order, we may cancel or adjust the order and notify you.</li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">4. Shipping &amp; delivery</h2>
        <p className="mt-3 text-sm text-neutral-600">
          We offer nationwide delivery in Pakistan, including cash on delivery where available. Estimated delivery times shown at
          checkout are approximate and may vary due to courier delays, holidays or other external factors.
        </p>
        <p className="mt-3 text-sm text-neutral-600">
          Risk of loss passes to you once the order has been handed over to the courier. Please inspect your package on arrival and
          contact us promptly if there is any issue with the delivery or contents.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">5. Returns &amp; exchanges</h2>
        <p className="mt-3 text-sm text-neutral-600">
          Our standard policy is: <span className="font-semibold">30-day hassle-free returns. Product must be unopened, seal must not be opened.</span>
        </p>
        <p className="mt-3 text-sm text-neutral-600">
          For hygiene and safety reasons, we cannot accept returns of opened or used products unless there is a clear quality issue
          attributable to us. To initiate a return or exchange, please contact our support team with your order details.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">6. Accounts &amp; security</h2>
        <p className="mt-3 text-sm text-neutral-600">
          If you create an account on our site, you are responsible for maintaining the confidentiality of your login details and for
          all activities that occur under your account. Notify us immediately if you suspect any unauthorized access.
        </p>
        <p className="mt-3 text-sm text-neutral-600">
          We reserve the right to suspend or close accounts that violate these terms, abuse offers or attempt to harm our systems or
          customers.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">7. Reviews &amp; user content</h2>
        <p className="mt-3 text-sm text-neutral-600">
          When you submit a product review or testimonial, you confirm that it is based on your genuine experience and does not contain
          offensive, misleading or illegal content. We may moderate, edit or remove reviews at our discretion (for example, to remove
          personal data, abusive language or spam).
        </p>
        <p className="mt-3 text-sm text-neutral-600">
          By submitting a review, you grant Nature Secret a non-exclusive, royalty-free license to use, display and share your content
          on our website, marketing materials and social channels, with or without attribution, in accordance with our Privacy Policy.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">8. Limitation of liability</h2>
        <p className="mt-3 text-sm text-neutral-600">
          To the maximum extent permitted by law, Nature Secret will not be liable for any indirect, incidental or consequential
          damages arising from your use of our products or website. Our total liability for any claim related to your purchase will not
          exceed the amount you paid for the relevant order.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">9. Changes to these terms</h2>
        <p className="mt-3 text-sm text-neutral-600">
          We may update these Terms of Service from time to time. The latest version will always be available on this page. Continued
          use of the website after changes are posted constitutes your acceptance of the updated terms.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">10. Contact</h2>
        <p className="mt-3 text-sm text-neutral-600">
          If you have any questions about these terms, your order or our products, please reach out via our Contact page or by using
          the support details shown in the footer of our website.
        </p>
      </section>
    </div>
  );
}
