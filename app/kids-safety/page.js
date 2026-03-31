export const metadata = {
  title: 'Kids Safety | Nature Secret',
  description: 'Safe use of oils and aromatics around children. Tips for dilution, storage, and diffusing.',
};

export default function KidsSafetyPage() {
  return (
    <div className="bg-gradient-to-b from-neutral-50 to-white">
      <div className="mx-auto max-w-4xl px-3 sm:px-5 lg:px-8 py-6 sm:py-10 lg:py-16">
        <div className="rounded-3xl border border-neutral-200 bg-white/90 shadow-sm p-5 sm:p-8 lg:p-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-neutral-900 tracking-tight">Kids safety</h1>
          <p className="mt-3 text-sm sm:text-base text-neutral-600 leading-relaxed">
            Essential tips for using botanical oils and similar products safely when children are present.
          </p>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">Using oils around children</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-700 list-disc list-inside leading-relaxed">
              <li>Use extra care with children: apply sparingly and only when age-appropriate.</li>
              <li>Dilute well with a carrier oil; choose products suited to the child&apos;s age.</li>
              <li>Do not let children swallow oils or other topical products meant for external use.</li>
              <li>Store all oils out of reach and sight of children.</li>
              <li>Avoid eyes, ears, mouth, nose, and other sensitive areas.</li>
              <li>When adding oils to bath water, dilute first with a carrier oil or a suitable dispersant as directed.</li>
              <li>Introduce new products gradually and watch for irritation, headache, nausea, breathing discomfort, or dizziness—stop use if anything seems off.</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">Diffusing safely</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-700 list-disc list-inside leading-relaxed">
              <li>Use a well-ventilated room.</li>
              <li>Keep children out of the direct path of mist or vapor.</li>
              <li>Run diffusers for limited sessions (for example 30–60 minutes) with breaks in between.</li>
            </ul>
          </section>

          <p className="mt-8 text-sm text-neutral-600 leading-relaxed">
            For adult supervision, product-specific instructions, and any health questions, consult a qualified professional. Our{' '}
            <a href="/terms" className="font-medium text-gold-800 underline underline-offset-2 hover:text-gold-900">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="font-medium text-gold-800 underline underline-offset-2 hover:text-gold-900">
              Privacy Policy
            </a>{' '}
            apply when you use naturesecret.pk.
          </p>
        </div>
      </div>
    </div>
  );
}
