import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { UserAchievement } from '../types/user';
import { Award, BarChart3, Bell, Eye, Globe2, LogOut, Mail, MapPin, MessageCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useContributions } from '../hooks/useContributions';
import { useDiscussions } from '../hooks/useDiscussions';
import { useModeration } from '../hooks/useModeration';
import { usePermissions } from '../hooks/usePermissions';
import { ImageUploadField } from '../components/forms/ImageUploadField';
import { ImageUploadRepository, type UploadProgress } from '../repositories/images';

export function Profile({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { user, logout, updateSettings } = useAuth();
  const discussions = useDiscussions();
  const contributionData = useContributions(user);
  const moderation = useModeration(user);
  const permissions = usePermissions(user);
  const [editForm, setEditForm] = useState({ name: '', username: '', organization: '', city: '', state: '', country: '', bio: '', website: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState<UploadProgress | null>(null);
  const [avatarError, setAvatarError] = useState('');

  useEffect(() => {
    if (!user) return;
    setEditForm({ name: user.name, username: user.username, organization: user.organization, city: user.city, state: user.state, country: user.country, bio: user.bio, website: user.website ?? '' });
  }, [user]);

  if (!user) return null;

  const reputation = discussions.reputations.find((item) => item.userId === user?.id);
  const userComments = discussions.allComments.filter((comment) => comment.authorId === user?.id && !comment.deleted);
  const adminActions = moderation.actions.filter((action) => action.moderatorId === user.id);
  const reviewedContributions = contributionData.contributions.filter((item) => item.reviewerId === user.id || item.reviews.some((review) => review.reviewerId === user.id));
  const reviewedCases = moderation.cases.filter((item) => item.assignedToId === user.id);
  const resolvedCases = reviewedCases.filter((item) => item.status === 'resolved');

  const updateProfileField = (field: keyof typeof editForm, value: string) => setEditForm((current) => ({ ...current, [field]: value }));

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (savingProfile) return;
    setProfileMessage(null);
    const normalizedUsername = editForm.username.trim().toLowerCase();
    if (!editForm.name.trim() || !normalizedUsername || !editForm.organization.trim() || !editForm.city.trim() || !editForm.state.trim() || !editForm.country.trim() || !editForm.bio.trim()) {
      setProfileMessage({ type: 'error', text: 'Preencha todos os campos obrigatórios do perfil.' });
      return;
    }
    if (!/^[a-z0-9._-]{3,30}$/.test(normalizedUsername)) {
      setProfileMessage({ type: 'error', text: 'Use um username com 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou underline.' });
      return;
    }
    setSavingProfile(true);
    let avatarUrl = user.avatarUrl;
    setAvatarError('');
    if (avatarFile) {
      if (!ImageUploadRepository) { setProfileMessage({ type: 'error', text: 'Supabase Storage não configurado.' }); setSavingProfile(false); return; }
      const upload = await ImageUploadRepository.replaceImage('avatars', user.id, avatarFile, user.avatarUrl, setAvatarProgress);
      if (!upload.ok) { setAvatarError(upload.message); setSavingProfile(false); return; }
      avatarUrl = upload.url;
    } else if (avatarRemoved) {
      avatarUrl = '';
    }
    const result = await updateSettings({ ...editForm, username: normalizedUsername, avatarUrl });
    if (!result.ok && avatarFile && avatarUrl) await ImageUploadRepository?.removeImage('avatars', user.id, avatarUrl);
    if (result.ok) {
      if (avatarFile) await ImageUploadRepository?.removeImage('avatars', user.id, user.avatarUrl);
      if (avatarRemoved) await ImageUploadRepository?.removeImage('avatars', user.id, user.avatarUrl);
      setAvatarFile(null); setAvatarRemoved(false); setAvatarProgress(null);
    }
    setSavingProfile(false);
    if (!result.ok) {
      setProfileMessage({ type: 'error', text: result.message ?? 'Não foi possível salvar o perfil.' });
      return;
    }
    setProfileMessage({ type: 'success', text: 'Perfil atualizado com sucesso.' });
  };

  const signOut = async () => {
    const result = await logout();
    if (result.ok) onNavigate('login');
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
            <h2 className="flex items-center gap-2 text-2xl font-semibold"><ShieldCheck size={22} /> Editar perfil</h2>
            <form onSubmit={saveProfile} className="mt-5 grid gap-4 md:grid-cols-2" aria-busy={savingProfile}>
              <ImageUploadField label="Avatar do perfil" currentUrl={user.avatarUrl} value={avatarFile} removed={avatarRemoved} uploading={savingProfile && Boolean(avatarProgress)} progress={avatarProgress?.progress} error={avatarError} alt={`Pré-visualização do avatar de ${user.name}`} onChange={(file) => { setAvatarFile(file); setAvatarRemoved(false); }} onRemove={() => { setAvatarFile(null); setAvatarRemoved(true); }} />
              <ProfileInput label="Nome de exibição" value={editForm.name} maxLength={100} required onChange={(value) => updateProfileField('name', value)} />
              <ProfileInput label="Username" value={editForm.username} maxLength={30} required help="3 a 30 caracteres: a-z, 0-9, ponto, hífen e underline." onChange={(value) => updateProfileField('username', value.toLowerCase())} />
              <ProfileInput label="Organização" value={editForm.organization} maxLength={120} required onChange={(value) => updateProfileField('organization', value)} />
              <ProfileInput label="Cidade" value={editForm.city} maxLength={100} required onChange={(value) => updateProfileField('city', value)} />
              <ProfileInput label="Estado" value={editForm.state} maxLength={100} required onChange={(value) => updateProfileField('state', value)} />
              <ProfileInput label="País" value={editForm.country} maxLength={100} required onChange={(value) => updateProfileField('country', value)} />
              <ProfileInput label="Site" value={editForm.website} maxLength={300} type="url" placeholder="https://exemplo.org" onChange={(value) => updateProfileField('website', value)} />
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">
                <p><strong className="text-slate-900">E-mail:</strong> {user.email || 'Não informado'}</p>
                <p className="mt-2"><strong className="text-slate-900">Papel:</strong> {user.role}</p>
                <p className="mt-2"><strong className="text-slate-900">Conta criada em:</strong> {new Date(user.createdAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
              </div>
              <label className="grid gap-2 text-sm font-medium md:col-span-2" htmlFor="profile-bio">Biografia *<textarea id="profile-bio" className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200" value={editForm.bio} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateProfileField('bio', event.target.value)} rows={5} maxLength={500} required aria-describedby="profile-bio-count" /><span id="profile-bio-count" className="text-xs text-muted">{editForm.bio.length}/500 caracteres</span></label>
              {profileMessage && <p className={`rounded-2xl px-4 py-3 text-sm md:col-span-2 ${profileMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{profileMessage.text}</p>}
              <div className="md:col-span-2"><button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={savingProfile}>{savingProfile ? 'Salvando...' : 'Salvar perfil'}</button></div>
            </form>
          </section>

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

          {permissions.canViewModerationHistory && <section className="rounded-[2rem] border border-line bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-2xl font-semibold"><ShieldCheck size={22} /> Métricas administrativas</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <Stat label="Casos revisados" value={reviewedCases.length} />
              <Stat label="Contribuições revisadas" value={reviewedContributions.length} />
              <Stat label="Ações administrativas" value={adminActions.length} />
              <Stat label="Casos resolvidos" value={resolvedCases.length} />
            </div>
          </section>}

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
            <p className="mt-4 leading-7 text-muted">{user.bio || 'Perfil sem biografia pública.'}</p>
            {user.website && <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700" href={user.website} target="_blank" rel="noreferrer"><Globe2 size={16} /> {user.website}</a>}
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

function ProfileInput({ label, value, onChange, maxLength, required, help, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; maxLength: number; required?: boolean; help?: string; type?: string; placeholder?: string }) {
  const id = `profile-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <label className="grid gap-2 text-sm font-medium" htmlFor={id}>
      {label}{required ? ' *' : ''}
      <input id={id} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200" type={type} value={value} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)} maxLength={maxLength} required={required} placeholder={placeholder} aria-describedby={help ? `${id}-help` : undefined} />
      {help && <span id={`${id}-help`} className="text-xs text-muted">{help}</span>}
    </label>
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
