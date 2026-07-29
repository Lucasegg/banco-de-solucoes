import { useState, type FormEvent, type ReactNode, type ChangeEvent } from 'react';
import { useTranslation } from '../i18n/I18nProvider';
import type { TranslationKey } from '../i18n/resources';
import { sendContactRequest } from '../contact/api';
import { CONTACT_CATEGORIES, CONTACT_LIMITS, normalizeContactForm, validateContactForm, type ContactField, type ContactForm, type ValidationCode } from '../contact/validation';

const emptyForm: ContactForm = { name: '', email: '', subject: '', category: '', message: '', consent: false, website: '' };
const categoryKeys: Record<string, TranslationKey> = Object.fromEntries(CONTACT_CATEGORIES.map((category) => [category, `contact.category.${category}`])) as Record<string, TranslationKey>;

export function Contact() {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<ContactField, ValidationCode>>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const update = (field: keyof ContactForm, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));
  const errorText = (field: ContactField) => {
    const code = errors[field]; if (!code) return undefined;
    if (code === 'email') return t('contact.invalidEmail'); if (code === 'category') return t('contact.invalidCategory'); if (code === 'consent') return t('contact.consentRequired');
    if (code === 'tooShort' || code === 'tooLong') { const limit = CONTACT_LIMITS[field as keyof typeof CONTACT_LIMITS]; return t(code === 'tooShort' ? 'contact.tooShort' : 'contact.tooLong', { [code === 'tooShort' ? 'min' : 'max']: limit[code === 'tooShort' ? 0 : 1] }); }
    return t('contact.required');
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (status === 'loading') return;
    const nextErrors = validateContactForm(form); setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setStatus('loading');
    try { await sendContactRequest(normalizeContactForm(form)); setForm(emptyForm); setErrors({}); setStatus('success'); }
    catch { setStatus('error'); }
  };
  const field = (name: ContactField, children: ReactNode) => <div><label className="mb-1 block font-medium" htmlFor={`contact-${name}`}>{t(`contact.${name}` as TranslationKey)}</label>{children}{errors[name] && <p id={`${name}-error`} className="mt-1 text-sm text-red-700">{errorText(name)}</p>}</div>;
  const props = (name: ContactField) => ({ id: `contact-${name}`, 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `${name}-error` : undefined, disabled: status === 'loading' });
  return <section className="mx-auto max-w-2xl"><h1 className="text-3xl font-bold">{t('contact.title')}</h1><p className="mt-3 text-muted">{t('contact.intro')}</p><p className="mt-2 rounded-lg bg-sky-50 p-3 text-sm">{t('contact.privacy')}</p>
    <form className="mt-8 space-y-5 rounded-2xl border border-line bg-white p-6 shadow-sm" noValidate onSubmit={submit}>
      {field('name', <input {...props('name')} value={form.name} onChange={(e: ChangeEvent<HTMLInputElement>) => update('name', e.target.value)} maxLength={CONTACT_LIMITS.name[1] + 1} className="w-full rounded-lg border border-line p-3" />)}
      {field('email', <input {...props('email')} type="email" autoComplete="email" value={form.email} onChange={(e: ChangeEvent<HTMLInputElement>) => update('email', e.target.value)} maxLength={CONTACT_LIMITS.email[1] + 1} className="w-full rounded-lg border border-line p-3" />)}
      {field('subject', <input {...props('subject')} value={form.subject} onChange={(e: ChangeEvent<HTMLInputElement>) => update('subject', e.target.value)} maxLength={CONTACT_LIMITS.subject[1] + 1} className="w-full rounded-lg border border-line p-3" />)}
      {field('category', <select {...props('category')} value={form.category} onChange={(e: ChangeEvent<HTMLSelectElement>) => update('category', e.target.value)} className="w-full rounded-lg border border-line bg-white p-3"><option value="">{t('contact.category.placeholder')}</option>{CONTACT_CATEGORIES.map((category) => <option key={category} value={category}>{t(categoryKeys[category])}</option>)}</select>)}
      {field('message', <textarea {...props('message')} rows={7} value={form.message} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => update('message', e.target.value)} maxLength={CONTACT_LIMITS.message[1] + 1} className="w-full rounded-lg border border-line p-3" />)}
      <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true"><label htmlFor="contact-website">{t('contact.botField')}</label><input id="contact-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e: ChangeEvent<HTMLInputElement>) => update('website', e.target.value)} /></div>
      <div><label className="flex items-start gap-3"><input {...props('consent')} type="checkbox" checked={form.consent} onChange={(e: ChangeEvent<HTMLInputElement>) => update('consent', e.target.checked)} className="mt-1" /><span>{t('contact.consent')}</span></label>{errors.consent && <p id="consent-error" className="mt-1 text-sm text-red-700">{errorText('consent')}</p>}</div>
      <button type="submit" disabled={status === 'loading'} className="rounded-full bg-slate-950 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{t(status === 'loading' ? 'contact.submitting' : 'contact.submit')}</button>
      <div aria-live="polite" role="status">{status === 'success' && <p className="text-green-700">{t('contact.success')}</p>}{status === 'error' && <p className="text-red-700">{t('contact.error')}</p>}</div>
    </form></section>;
}
