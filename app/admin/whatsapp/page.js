'use client';

import { useState, useEffect, useRef } from 'react';
import Link from '@/components/Link';
import { getAdminContactSettings, updateAdminContactSettings, getAdminWhatsAppQR, relinkAdminWhatsApp, formatApiError } from '@/lib/api';
import { InlineLoader, Spinner } from '@/components/ui/PageLoader';

function whatsappUrl(number) {
  const n = (number || '').replace(/\D/g, '');
  return n ? `https://wa.me/${n}` : '';
}

export default function AdminWhatsAppPage() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [emails, setEmails] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [waLinked, setWaLinked] = useState(false);
  const [qrImage, setQrImage] = useState(null);
  const [qrError, setQrError] = useState('');
  const [relinking, setRelinking] = useState(false);
  const qrPollRef = useRef(null);

  useEffect(() => {
    getAdminContactSettings()
      .then((r) => {
        setWhatsappNumber(r.whatsappNumber || '');
        setPhone(r.phone || '');
        setEmails(r.emails || '');
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function fetchQR() {
      getAdminWhatsAppQR()
        .then((r) => {
          if (r.linked) {
            setWaLinked(true);
            setQrImage(null);
            setQrError('');
            if (qrPollRef.current) clearInterval(qrPollRef.current);
            return;
          }
          setWaLinked(false);
          setQrImage(r.qr || null);
          setQrError('');
        })
        .catch((e) => {
          setQrImage(null);
          setQrError(formatApiError(e, 'Failed to load WhatsApp QR.'));
        });
    }
    fetchQR();
    qrPollRef.current = setInterval(fetchQR, 5000);
    return () => { if (qrPollRef.current) clearInterval(qrPollRef.current); };
  }, [waLinked]);

  async function handleRelink() {
    setError('');
    setQrError('');
    setRelinking(true);
    try {
      await relinkAdminWhatsApp();
      setWaLinked(false);
      setQrImage(null);
    } catch (err) {
      setError(formatApiError(err, 'Failed to reset WhatsApp.'));
    } finally {
      setRelinking(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await updateAdminContactSettings({
        whatsappNumber: whatsappNumber.replace(/\D/g, '') || undefined,
        phone: phone.trim() || undefined,
        emails: emails.trim() || undefined,
      });
      setMessage('Saved. Customers will see this on the contact page and in the footer.');
    } catch (err) {
      setError(formatApiError(err, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  }

  const waUrl = whatsappUrl(whatsappNumber);

  if (loading) {
    return (
      <div className="p-6">
        <InlineLoader />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <Link href="/admin" className="text-sm text-neutral-500 hover:text-neutral-900">← Dashboard</Link>
      <h1 className="text-2xl font-semibold text-neutral-900 mt-4">WhatsApp & Contact</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Connect your WhatsApp number so customers can message you and receive order confirmations.
      </p>

      <div className="mt-6 p-4 rounded-xl border border-neutral-200 bg-neutral-50">
        <h2 className="text-sm font-semibold text-neutral-900">Send order confirmations via WhatsApp</h2>
        {waLinked ? (
          <div className="mt-2">
            <p className="text-sm text-green-700 font-medium">✓ Connected. New orders will get a WhatsApp confirmation to the customer&apos;s number.</p>
            <button
              type="button"
              onClick={handleRelink}
              disabled={relinking}
              className="mt-3 rounded-full sm:rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {relinking ? 'Resetting…' : 'Reset WhatsApp session'}
            </button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-neutral-600">Scan the QR code with WhatsApp on your phone (WhatsApp → Settings → Linked devices → Link a device).</p>
            {qrImage ? (
              <div className="mt-3 flex justify-center">
                <img src={qrImage} alt="WhatsApp QR" className="w-64 h-64 rounded-lg border border-neutral-200" />
              </div>
            ) : (
              <p className="mt-2 text-sm text-amber-700">Loading QR…</p>
            )}
            {qrError ? <p className="mt-3 text-sm text-red-600">{qrError}</p> : null}
            <button
              type="button"
              onClick={handleRelink}
              disabled={relinking}
              aria-busy={relinking}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-full sm:rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {relinking ? (
                <span aria-hidden>
                  <Spinner className="h-4 w-4 border-white/35 border-t-white" />
                </span>
              ) : null}
              {relinking ? 'Resetting…' : 'Resend QR'}
            </button>
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">WhatsApp number (digits only, with country code)</label>
          <input
            type="text"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="923714165937"
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-neutral-900"
          />
          <p className="mt-1 text-xs text-neutral-500">e.g. 923714165937 for Pakistan (+92 371 4165937)</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Display phone</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+92 3714165937"
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Support emails (comma-separated)</label>
          <input
            type="text"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="support@naturesecret.pk"
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-neutral-900"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}
        <button
          type="submit"
          disabled={saving}
          aria-busy={saving}
          className="inline-flex items-center justify-center gap-2 rounded-full sm:rounded-2xl bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? (
            <span aria-hidden>
              <Spinner className="h-4 w-4 border-white/35 border-t-white" />
            </span>
          ) : null}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>

      {waUrl && (
        <div className="mt-8 p-4 rounded-xl bg-neutral-100 border border-neutral-200">
          <h2 className="text-sm font-semibold text-neutral-900">Customer WhatsApp link</h2>
          <p className="mt-1 text-sm text-neutral-600">Customers can open this link to chat with you on WhatsApp:</p>
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-medium text-[#25D366] hover:underline break-all">
            {waUrl}
          </a>
        </div>
      )}

      <div className="mt-6 p-4 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 text-sm">
        <p className="font-medium">Free WhatsApp integration</p>
        <p className="mt-1">Order confirmations and messaging use the QR-linked WhatsApp above only. No Twilio or paid API needed. Connect once by scanning the QR; the session is saved so you stay linked after restart.</p>
      </div>
    </div>
  );
}
