import { Eye, Heart, Lightbulb, MessageCircle } from 'lucide-react';
import type { CommentReactionSummary, CommentReactionType } from '../../types/discussion';
import { useTranslation } from '../../i18n/I18nProvider';
import { formatNumber } from '../../i18n/format';
import type { TranslationKey } from '../../i18n/resources';
const reactionOptions: { type: CommentReactionType; label: TranslationKey; icon: JSX.Element }[] = [
  { type: 'like', label: 'reaction.like', icon: <Heart size={15} /> }, { type: 'support', label: 'reaction.support', icon: <MessageCircle size={15} /> }, { type: 'interesting', label: 'reaction.interesting', icon: <Lightbulb size={15} /> }, { type: 'needsEvidence', label: 'reaction.needsEvidence', icon: <Eye size={15} /> },
];
export function ReactionBar({ summary, currentUserId, pending, onToggle }: { summary: CommentReactionSummary; currentUserId: string | null; pending: CommentReactionType[]; onToggle: (type: CommentReactionType) => Promise<{ ok: boolean; message?: string }> }) {
  const { locale, t } = useTranslation();
  return <div className="flex flex-wrap gap-2">{reactionOptions.map((option) => { const { count, selected: active } = summary[option.type]; return <button key={option.type} type="button" onClick={() => void onToggle(option.type)} disabled={!currentUserId || pending.includes(option.type)} title={!currentUserId ? t('reaction.signIn') : undefined} aria-pressed={active} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${active ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-line bg-white text-slate-600 hover:bg-slate-50'} disabled:cursor-not-allowed disabled:opacity-60`}>{option.icon}{t(option.label)} {formatNumber(count, locale)}</button>; })}</div>;
}
