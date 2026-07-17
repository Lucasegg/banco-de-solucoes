import { useAuth } from '../../hooks/useAuth';
import { useContributions } from '../../hooks/useContributions';
import { contributionStatusLabel, type ContributionTargetType } from '../../types/contribution';

export function ContributionHistory({ targetType, targetId }: { targetType: ContributionTargetType; targetId: string }) {
  const { user } = useAuth();
  const { contributions, loading, error } = useContributions(user, { type: targetType, id: targetId });
  return <section className="rounded-[2rem] border border-line bg-white p-6" aria-labelledby={`${targetType}-contribution-history`}><h2 id={`${targetType}-contribution-history`} className="text-2xl font-semibold">Histórico de contribuições</h2>{loading && <p className="mt-4 text-sm text-muted">Carregando histórico...</p>}{error && <p className="mt-4 text-sm text-rose-700" role="alert">{error}</p>}{!loading && !error && contributions.length === 0 && <p className="mt-4 text-sm text-muted">Ainda não há contribuições revisadas para este conteúdo.</p>}<div className="mt-4 grid gap-3">{contributions.map((item) => <article key={item.id} className="rounded-3xl bg-slate-50 p-4"><div className="flex items-center gap-3">{item.userAvatarUrl && <img src={item.userAvatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />}<div><strong>{item.userName}</strong><p className="text-xs text-muted">{new Date(item.createdAt).toLocaleDateString('pt-BR')} · {contributionStatusLabel[item.status]}</p></div></div><p className="mt-3 text-sm leading-6">{item.payload.summary}</p></article>)}</div></section>;
}
