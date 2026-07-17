import { Heart, Lightbulb, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useReactions } from '../../hooks/useReactions';
import type { ReactionTarget } from '../../repositories/reactions';
import type { ReactionType } from '../../types/discussion';
const options: Array<{ type: ReactionType; label: string; icon: JSX.Element }> = [{ type: 'useful', label: 'Útil', icon: <CheckCircle2 size={16} /> }, { type: 'liked', label: 'Gostei', icon: <Heart size={16} /> }, { type: 'interesting', label: 'Interessante', icon: <Lightbulb size={16} /> }];
export function ItemReactionBar({ target }: { target: ReactionTarget }) {
  const reactions = useReactions(target); const [message, setMessage] = useState('');
  return <section className="mt-5" aria-label="Reações"><div className="flex flex-wrap gap-2">{options.map(({ type, label, icon }) => { const active = reactions.selected.includes(type); return <button key={type} type="button" aria-pressed={active} onClick={async () => { const result = await reactions.toggle(type); setMessage(result.ok ? 'Reação atualizada.' : result.message); }} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${active ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-line bg-white text-slate-700'}`}>{icon}{label}<span className="rounded-full bg-slate-100 px-2 py-0.5">{reactions.counts[type]}</span></button>; })}</div>{(reactions.isLoading || reactions.error || message) && <p className="mt-2 text-sm text-muted">{reactions.isLoading ? 'Carregando reações...' : reactions.error || message}</p>}</section>;
}
