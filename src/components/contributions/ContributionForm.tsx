import type { ChangeEvent, FormEvent } from 'react';
import type { ContributionChange, ContributionTargetType, ContributionType, SerializableValue } from '../../types/contribution';
import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useContributions } from '../../hooks/useContributions';

type FieldOption = { field: string; label: string; value: SerializableValue };
const contributionTypes: ContributionType[] = ['Correção', 'Atualização', 'Nova evidência', 'Novo caso real', 'Nova versão', 'Nova relação', 'Melhoria geral'];

export function ContributionForm({ targetType, targetId, fields, onClose }: { targetType: ContributionTargetType; targetId: string; fields: FieldOption[]; onClose: () => void }) {
  const { user } = useAuth();
  const contributions = useContributions(user);
  const [type, setType] = useState<ContributionType>('Melhoria geral');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [justification, setJustification] = useState('');
  const [changes, setChanges] = useState<ContributionChange[]>([]);
  const [field, setField] = useState(fields[0]?.field ?? 'title');
  const [proposed, setProposed] = useState('');
  const [feedback, setFeedback] = useState('');
  const titleRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  const selected = fields.find((item) => item.field === field) ?? fields[0];
  const addChange = () => {
    if (!selected || !proposed.trim()) { setFeedback('Informe um campo e o valor proposto.'); return; }
    setChanges((current) => [...current, { id: `change-${Date.now()}-${Math.random().toString(16).slice(2)}`, field: selected.field, label: selected.label, previousValue: selected.value, proposedValue: proposed.trim() }]);
    setProposed(''); setFeedback('Alteração adicionada.');
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    const result = contributions.createContribution({ targetType, targetId, type, title, description, justification, changes });
    if (!result.ok) { setFeedback(result.message); return; }
    setFeedback('Contribuição enviada e salva localmente.'); window.setTimeout(onClose, 800);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="contribution-title">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-soft">
        <div className="flex items-start justify-between gap-4"><div><h2 id="contribution-title" className="text-2xl font-semibold">Propor alteração</h2><p className="mt-1 text-sm text-muted">A proposta não altera o conteúdo original automaticamente.</p></div><button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-slate-100" aria-label="Fechar formulário"><X size={20} /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">Tipo<select value={type} onChange={(e: ChangeEvent<HTMLSelectElement>) => setType(e.target.value as ContributionType)} className="rounded-2xl border border-line p-3">{contributionTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold">Título<input ref={titleRef} value={title} onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} className="rounded-2xl border border-line p-3" required /></label>
          <label className="grid gap-2 text-sm font-semibold">Descrição<textarea value={description} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} className="min-h-24 rounded-2xl border border-line p-3" required /></label>
          <label className="grid gap-2 text-sm font-semibold">Justificativa<textarea value={justification} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setJustification(e.target.value)} className="min-h-24 rounded-2xl border border-line p-3" required /></label>
          <div className="rounded-3xl border border-line p-4"><h3 className="font-semibold">Alterações</h3><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Campo<select value={field} onChange={(e: ChangeEvent<HTMLSelectElement>) => setField(e.target.value)} className="rounded-2xl border border-line p-3">{fields.map((item) => <option key={item.field} value={item.field}>{item.label}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold">Valor proposto<textarea value={proposed} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setProposed(e.target.value)} className="rounded-2xl border border-line p-3" /></label></div><p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-muted"><strong>Valor atual:</strong> {selected ? String(Array.isArray(selected.value) ? selected.value.join(', ') : selected.value ?? '—') : '—'}</p><button type="button" onClick={addChange} className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"><Plus size={16} /> Adicionar alteração</button>{changes.map((change) => <div key={change.id} className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-sm"><span>{change.label}: {String(change.proposedValue)}</span><button type="button" onClick={() => setChanges((current) => current.filter((item) => item.id !== change.id))} className="font-semibold text-rose-700">Remover</button></div>)}</div>
        </div>
        <p aria-live="polite" className="mt-4 text-sm font-semibold text-slate-700">{feedback || contributions.storageError}</p>
        <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-full border border-line px-5 py-3 text-sm font-semibold">Cancelar</button><button type="submit" className="rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white">Enviar proposta</button></div>
      </form>
    </div>
  );
}
