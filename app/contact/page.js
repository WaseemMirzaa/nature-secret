'use client';

import { useState, useEffect } from 'react';
import Link from '@/components/Link';
import { Logo } from '@/components/Logo';
import { getContactSettings, createSupportTicket, formatApiError } from '@/lib/api';
import { DEFAULT_CONTACT } from '@/lib/constants';
import { useCustomerStore } from '@/lib/store';
import { InlineLoader, Spinner } from '@/components/ui/PageLoader';
import { getWhatsAppHref, handleWhatsAppClick, normalizeWhatsAppDigits } from '@/lib/whatsappLink';

export default function ContactPage() {
  const [contact, setContact] = useState(DEFAULT_CONTACT);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const customer = useCustomerStore((s) => s.customer);

  useEffect(() => {
    getContactSettings()
      .then((r) => setContact({ emails: r.emails, phone: r.phone, whatsappNumber: r.whatsappNumber }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (customer?.name) setName(customer.name);
    if (customer?.email) setEmail(customer.email);
  }, [customer]);

  const phoneDigits = normalizeWhatsAppDigits(contact.whatsappNumber) || normalizeWhatsAppDigits(DEFAULT_CONTACT.whatsappNumber);
  const waUrl = getWhatsAppHref(phoneDigits);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    setSubmitDone(false);
    setSubmitLoading(true);
    try {
      await createSupportTicket({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() });
      setSubmitDone(true);
      setSubject('');
      setMessage('');
    } catch (err) {
      setSubmitError(formatApiError(err, 'Failed to submit. Try again.'));
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center px-3 sm:px-5 py-6 sm:py-14 lg:py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-neutral-900 px-5 sm:px-8 py-4 sm:py-6 text-center">
            <Link href="/" className="inline-block">
              <Logo className="h-9 text-gold-500" link={false} />
            </Link>
            <p className="mt-2 text-xs font-medium text-neutral-400 tracking-wider uppercase">Contact</p>
          </div>
          <div className="p-5 sm:p-8">
            {loading ? (
              <InlineLoader className="py-4" />
            ) : (
              <>
                <p className="text-neutral-700 text-sm leading-relaxed">
                  Reach us at{' '}
                  <a href={`mailto:${(contact.emails || '').split(',')[0]?.trim()}`} className="text-gold-700 hover:underline">
                    {contact.emails}
                  </a>
                  , phone {contact.phone}.
                </p>
                <a
                  href={waUrl}
                  onClick={(e) => handleWhatsAppClick(e, phoneDigits, 'contact')}
                  rel="noopener noreferrer"
                  className="mt-6 flex items-center justify-center gap-2 w-full rounded-xl bg-[#25D366] py-3.5 text-sm font-semibold text-white hover:bg-[#20bd5a] transition"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Message us on WhatsApp
                </a>
              </>
            )}

            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-neutral-200">
              <h2 className="text-sm font-semibold text-neutral-900">Send a support ticket</h2>
              <p className="mt-1 text-xs text-neutral-500">We&apos;ll get back to you via email.</p>
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <input
                  id="contact-ticket-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-neutral-600 sm:border-2 sm:border-neutral-600 px-3 py-2.5 text-sm text-neutral-900"
                />
                <input
                  id="contact-ticket-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-neutral-600 sm:border-2 sm:border-neutral-600 px-3 py-2.5 text-sm text-neutral-900"
                />
                <input
                  id="contact-ticket-subject"
                  name="subject"
                  type="text"
                  autoComplete="off"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="w-full rounded-xl border border-neutral-600 sm:border-2 sm:border-neutral-600 px-3 py-2.5 text-sm text-neutral-900"
                />
                <textarea
                  id="contact-ticket-message"
                  name="message"
                  autoComplete="off"
                  placeholder="Message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  className="w-full rounded-xl border border-neutral-600 sm:border-2 sm:border-neutral-600 px-3 py-2.5 text-sm text-neutral-900 resize-none"
                />
                {submitError && <p className="text-xs text-red-600">{submitError}</p>}
                {submitDone && <p className="text-xs text-green-700">Ticket submitted. We&apos;ll reply soon.</p>}
                <button
                  type="submit"
                  disabled={submitLoading}
                  aria-busy={submitLoading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full sm:rounded-2xl bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {submitLoading ? (
                    <span aria-hidden>
                      <Spinner className="h-4 w-4 border-white/35 border-t-white" />
                    </span>
                  ) : null}
                  {submitLoading ? 'Sending…' : 'Submit'}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center">
              <Link href="/" className="text-sm font-medium text-gold-600 hover:text-gold-700">← Back to home</Link>
              {customer && (
                <>
                  {' · '}
                  <Link href="/support" className="text-sm font-medium text-gold-600 hover:text-gold-700">My support tickets</Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
