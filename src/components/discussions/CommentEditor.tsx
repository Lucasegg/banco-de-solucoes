import type { ChangeEvent } from 'react';
import { useState } from 'react';

type ActionResult = { ok: boolean; message?: string };

export function CommentEditor({ initialValue = '', placeholder = 'Compartilhe contexto, evidências ou uma resposta...', submitLabel = 'Comentar', onSubmit }: { initialValue?: string; placeholder?: string; submitLabel?: string; onSubmit: (content: string) => ActionResult | Promise<ActionResult> }) {
  const [content, setContent] = useState(initialValue);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const result = await onSubmit(content);
    setMessage(result.message ?? '');
    if (result.ok && !initialValue) setContent('');
    setSubmitting(false);
  };

  return (
    <div className="rounded-3xl border border-line bg-slate-50 p-4">
      <textarea value={content} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setContent(event.target.value)} placeholder={placeholder} rows={4} className="w-full resize-y rounded-2xl border border-line bg-white p-4 text-sm outline-none focus:ring-2 focus:ring-teal-400" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">Use comentários para discutir, responder e registrar evidências.</p>
        <button type="button" disabled={submitting} onClick={submit} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{submitting ? 'Enviando...' : submitLabel}</button>
      </div>
      {message && <p className="mt-2 text-sm font-semibold text-slate-700">{message}</p>}
    </div>
  );
}
