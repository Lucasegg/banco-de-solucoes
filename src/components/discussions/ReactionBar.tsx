import { Eye, Heart, Lightbulb, MessageCircle } from 'lucide-react';
import type { Reaction, ReactionType } from '../../types/discussion';

const reactionOptions: { type: ReactionType; label: string; icon: JSX.Element }[] = [
  { type: 'like', label: 'Curtir', icon: <Heart size={15} /> },
  { type: 'support', label: 'Apoiar', icon: <MessageCircle size={15} /> },
  { type: 'interesting', label: 'Interessante', icon: <Lightbulb size={15} /> },
  { type: 'needsEvidence', label: 'Precisa de evidências', icon: <Eye size={15} /> },
];

export function ReactionBar({ commentId, reactions, currentUserId, onToggle }: { commentId: string; reactions: Reaction[]; currentUserId: string | null; onToggle: (type: ReactionType) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {reactionOptions.map((option) => {
        const count = reactions.filter((reaction) => reaction.commentId === commentId && reaction.type === option.type).length;
        const active = Boolean(currentUserId && reactions.some((reaction) => reaction.commentId === commentId && reaction.type === option.type && reaction.userId === currentUserId));
        return <button key={option.type} type="button" onClick={() => onToggle(option.type)} disabled={!currentUserId} aria-pressed={active} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-line bg-white text-slate-600 hover:bg-slate-50'} disabled:cursor-not-allowed disabled:opacity-60`}>{option.icon}{option.label} {count}</button>;
      })}
    </div>
  );
}
