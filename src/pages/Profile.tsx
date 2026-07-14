import type { ChangeEvent } from 'react';
import type { UserAchievement } from '../types/user';
import { Award, BarChart3, Bell, Eye, LogOut, Mail, MapPin, MessageCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useContributions } from '../hooks/useContributions';
import { useDiscussions } from '../hooks/useDiscussions';

export function Profile({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { user, logout, updateSettings } = useAuth();
  const discussions = useDiscussions();
  const contributionData = useContributions(user);

  if (!user) return null;

  const reputation = discussions.reputations.find((item) => item.userId === user?.id);
  const userComments = discussions.allComments.filter((comment) => comment.authorId === user?.id && !comment.deleted);

  const signOut = () => {
    logout();
    onNavigate('login');
  };

  return (
    <section className="space-y-8">
      <div className="overflow-hidden rounded-[2rem] border border-line bg-white shadow-soft">
        <div className="h-32 bg-gradient-to-r from-slate-950 via-teal-800 to-sky-700" />
        <div className="grid gap-6 p-8 md:grid-cols-[auto_1fr_auto] md:items-end">
          <img src={user.avatarUrl} alt={`Avatar de ${user.name}`} className="-mt-20 h-32 w-32 rounded-3xl border-4 border-white object-cover shadow-soft" />
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">{user.name}</h1>
            <p className="mt-2 text-muted">@{user.username} · {user.role} · {user.organization}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted"><span className="inline-flex items-center gap-2"><Mail size={16} /> {user.email}</span><span className="inline-flex items-center gap-2"><MapPin size={16} /> {user.city}, {user.state}, {user.country}</span></div>
          </div>
          <button onClick={signOut} className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold hover:bg-slate-50"><LogOut size={16} /> Sair</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-line bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-2xl font-semibold"><BarChart3 size={22} /> Estatísticas</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-5">
              <Stat label="Problemas" value={user.stats.problemsSubmitted} />
              <Stat label="Soluções" value={user.stats.solutionsSubmitted} />
              <Stat label="Favoritos" value={user.stats.favoritesSaved} />
              <Stat label="Revisões" value={user.stats.contributionsReviewed} />
              <Stat label="Impacto" value={user.stats.impactScore} suffix="pts" />
              <Stat label="Comentários" value={reputation?.comments ?? 0} />
              <Stat label="Reputação" value={reputation?.points ?? 0} suffix="pts" />
            </div>
          </section>

          <section className="rounded-[2rem] border border-line bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-2xl font-semibold"><ShieldCheck size={22} /> Reputação</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <Stat label="Pontos" value={reputation?.points ?? 0} />
              <Stat label="Discussões" value={reputation?.discussions ?? 0} />
              <Stat label="Melhores respostas" value={reputation?.bestAnswers ?? 0} />
              <Stat label="Reações recebidas" value={reputation?.reactionsReceived ?? 0} />
            </div>
          </section>


          <section className="rounded-[2rem] border border-line bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-2xl font-semibold"><Award size={22} /> Contribuições</h2><button onClick={() => onNavigate('contributions')} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Ver contribuições</button></div>
            <div className="mt-5 grid gap-4 md:grid-cols-5">
              <Stat label="Enviadas" value={contributionData.stats?.sent ?? 0} />
              <Stat label="Aprovadas" value={contributionData.stats?.approved ?? 0} />
              <Stat label="Rejeitadas" value={contributionData.stats?.rejected ?? 0} />
              <Stat label="Taxa de aprovação" value={contributionData.stats?.approvalRate ?? 0} suffix="%" />
              <Stat label="Reputação por contribuições" value={contributionData.stats?.reputationPoints ?? 0} suffix="pts" />
            </div>
            <div className="mt-5 space-y-3">
              {contributionData.contributions.filter((item) => item.authorId === user.id).slice(0, 3).map((item) => <article key={item.id} className="rounded-3xl bg-slate-50 p-4 text-sm"><strong>{item.title}</strong><p className="mt-1 text-muted">{item.status} · {item.type} · {item.targetTitle}</p></article>)}
              {contributionData.stats?.sent === 0 && <p className="rounded-3xl bg-slate-50 p-5 text-sm text-muted">Suas contribuições recentes aparecerão aqui.</p>}
            </div>
          </section>

          <section className="rounded-[2rem] border border-line bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-2xl font-semibold"><Award size={22} /> Conquistas</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {[...user.achievements, ...(reputation?.badges ?? []), ...(contributionData.stats?.badges ?? [])].map((achievement: UserAchievement | NonNullable<typeof reputation>['badges'][number]) => (
                <article key={achievement.id} className="rounded-3xl border border-line bg-slate-50 p-5">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase text-teal-700">{achievement.level}</span>
                  <h3 className="mt-4 font-semibold">{achievement.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{achievement.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-line bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-2xl font-semibold"><MessageCircle size={22} /> Comentários e discussões</h2>
            <div className="mt-5 space-y-3">
              {userComments.length > 0 ? userComments.slice(0, 6).map((comment) => <article key={comment.id} className="rounded-3xl bg-slate-50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{comment.targetType === 'problem' ? 'Problema' : 'Solução'} · {new Date(comment.createdAt).toLocaleDateString('pt-BR')}</p><p className="mt-2 text-sm leading-6 text-slate-700">{comment.content}</p></article>) : <p className="rounded-3xl bg-slate-50 p-5 text-sm text-muted">Seus comentários e discussões aparecerão aqui.</p>}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-line bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">Sobre</h2>
            <p className="mt-4 leading-7 text-muted">{user.bio}</p>
            <p className="mt-4 text-sm text-muted">Membro desde {new Date(user.createdAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
          </section>

          <section className="rounded-[2rem] border border-line bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-2xl font-semibold"><ShieldCheck size={22} /> Configurações</h2>
            <div className="mt-5 space-y-3">
              <Setting icon={<Bell size={18} />} label="Notificações por e-mail" checked={user.settings.emailNotifications} onChange={(checked) => updateSettings({ emailNotifications: checked })} />
              <Setting icon={<Eye size={18} />} label="Perfil público" checked={user.settings.publicProfile} onChange={(checked) => updateSettings({ publicProfile: checked })} />
              <Setting icon={<Mail size={18} />} label="Resumo semanal" checked={user.settings.weeklyDigest} onChange={(checked) => updateSettings({ weeklyDigest: checked })} />
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return <div className="rounded-3xl bg-slate-50 p-5"><strong className="text-3xl">{value}</strong><span className="ml-1 text-sm text-muted">{suffix}</span><p className="mt-2 text-sm text-muted">{label}</p></div>;
}

function Setting({ icon, label, checked, onChange }: { icon: JSX.Element; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 text-sm font-medium">
      <span className="inline-flex items-center gap-2">{icon}{label}</span>
      <input type="checkbox" checked={checked} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)} className="h-5 w-5 accent-slate-950" />
    </label>
  );
}
