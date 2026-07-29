import type { ContactForm } from './validation';

export async function sendContactRequest(payload: ContactForm, signal?: AbortSignal): Promise<void> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) throw new Error('contact_unavailable');
  const response = await fetch(`${baseUrl}/functions/v1/contact-request`, {
    method: 'POST', signal, headers: { 'content-type': 'application/json', apikey: anonKey, authorization: `Bearer ${anonKey}` }, body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('contact_failed');
}
