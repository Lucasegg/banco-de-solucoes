import type { ReactNode } from 'react';
import type { CaseStudy, Evidence, Improvement, ProblemStatus, Solution, SolutionStatus, SolutionVersion } from '../types/domain';
import { useEffect, useState } from 'react';
import { Bookmark, Calendar, Eye, ExternalLink, GitBranch, Heart, Lightbulb, MapPin, MessageCircle, Share2, Sparkles, UsersRound } from 'lucide-react';
import { ContributionForm } from '../components/contributions/ContributionForm';
import { caseStudies, evidences, improvements, solutionVersions } from '../data/mockData';
import { ProblemRepository } from '../repositories/problems';
import { SolutionRepository } from '../repositories/solutions';
import { CommentRepository } from '../repositories/comments';
import type { Comment, Problem } from '../types/domain';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import { shareCurrentHashUrl, type ShareStatus } from '../utils/share';


function getShareMessage(status: ShareStatus, url: string) {
  if (status === 'shared') return 'Link compartilhado.';
  if (status === 'copied') return 'Link copiado.';
  return `Não foi possível copiar automaticamente. Copie o link: ${url}`;
}

export function ProblemDetails({ id, onNavigate }: { id: string; onNavigate: (page: string) => void }) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [related, setRelated] = useState<Solution[]>([]);
  const [loadError, setLoadError] = useState('');
  const favorites = useFavorites('problems');
  const { user } = useAuth();
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editStatus, setEditStatus] = useState<ProblemStatus>('Aberto');
  const isFavorite = problem ? favorites.isFavorite(problem.id) : false;
  const canManage = Boolean(user && problem?.authorId === user.id);

  useEffect(() => {
    let active = true;
    async function loadProblem() {
      if (!ProblemRepository || !SolutionRepository) { setLoadError('Supabase não configurado.'); return; }
      const problemResult = await ProblemRepository.findById(id);
      if (!active) return;
      if (!problemResult.ok || !problemResult.data) { setLoadError(problemResult.ok ? 'Problema não encontrado.' : problemResult.message); return; }
      setProblem(problemResult.data);
      setEditTitle(problemResult.data.title);
      setEditSummary(problemResult.data.summary);
      setEditStatus(problemResult.data.status);
      const solutionsResult = await SolutionRepository.listByProblemId(problemResult.data.id);
      if (!active) return;
      if (solutionsResult.ok) setRelated(solutionsResult.data); else setLoadError(solutionsResult.message);
    }
    void loadProblem();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timeout = window.setTimeout(() => setFeedback(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const share = async () => {
    if (!problem) return;
    const result = await shareCurrentHashUrl(problem.title, problem.summary);
    setFeedback(getShareMessage(result.status, result.url));
  };

  const toggleFavorite = () => {
    if (!problem) return;
    favorites.toggleFavorite(problem.id);
    setFeedback(isFavorite ? 'Problema removido dos favoritos.' : 'Problema adicionado aos favoritos.');
  };

  const proposeContribution = () => {
    if (!user) { setFeedback('Entre na sua conta para propor alteração.'); onNavigate('login'); return; }
    setShowContributionForm(true);
  };

  const saveProblemEdit = async () => {
    if (!problem || !ProblemRepository || !canManage) return;
    const result = await ProblemRepository.update(problem.id, { title: editTitle, summary: editSummary, status: editStatus });
    if (result.ok) { setProblem(result.data); setIsEditing(false); setFeedback('Problema atualizado.'); } else setFeedback(result.message);
  };

  const deleteProblem = async () => {
    if (!problem || !ProblemRepository || !canManage) return;
    if (!window.confirm('Excluir este problema? Esta ação não pode ser desfeita.')) return;
    const result = await ProblemRepository.delete(problem.id);
    if (result.ok) { setFeedback('Problema excluído.'); onNavigate('problemas'); } else setFeedback(result.message);
  };

  if (!problem) return <EmptyDetail message={loadError || 'Carregando problema no Supabase.'} />;
  const problemFields = [
    { field: 'title', label: 'Título', value: problem.title },
    { field: 'summary', label: 'Resumo', value: problem.summary },
    { field: 'description', label: 'Descrição', value: problem.description },
    { field: 'category', label: 'Categoria', value: problem.category },
    { field: 'status', label: 'Status', value: problem.status },
    { field: 'tags', label: 'Tags', value: problem.tags },
  ];

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <article className="overflow-hidden rounded-[2rem] border border-line bg-white shadow-sm">
        <img src={problem.image} alt={`Imagem do problema ${problem.title}`} className="h-72 w-full object-cover md:h-96" />
        <div className="p-8">
          <div className="flex flex-wrap gap-2 text-sm"><Badge>{problem.category}</Badge><Badge>{problem.status}</Badge><Badge>{problem.city}, {problem.state}</Badge></div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">{problem.title}</h1>
          <p className="mt-5 text-lg leading-8 text-muted">{problem.description}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info icon={<MapPin size={18} />} label="Cidade" value={`${problem.city}, ${problem.state}`} />
            <Info icon={<Calendar size={18} />} label="Data" value={formatDate(problem.createdAt)} />
            <Info icon={<UsersRound size={18} />} label="Autor" value={problem.author} />
            <Info icon={<Heart size={18} />} label="Curtidas" value={String(problem.likes)} />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Action icon={<Share2 size={16} />} label="Compartilhar" onClick={share} ariaLabel={`Compartilhar problema ${problem.title}`} />
            <Action icon={<Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />} label={isFavorite ? 'Favoritado' : 'Favoritar'} onClick={toggleFavorite} pressed={isFavorite} ariaLabel={isFavorite ? `Remover ${problem.title} dos favoritos` : `Adicionar ${problem.title} aos favoritos`} />
            <Action icon={<GitBranch size={16} />} label="Propor alteração" onClick={proposeContribution} ariaLabel={`Propor alteração para o problema ${problem.title}`} />
            <button onClick={() => onNavigate('solucoes')} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-slate-400"><Sparkles size={16} /> Encontrar Soluções</button>
            {canManage && <Action icon={<GitBranch size={16} />} label={isEditing ? 'Cancelar edição' : 'Editar'} onClick={() => setIsEditing((current) => !current)} />}
            {canManage && <Action icon={<Bookmark size={16} />} label="Excluir" onClick={deleteProblem} />}
          </div>
          {isEditing && <div className="mt-6 grid gap-3 rounded-3xl border border-line bg-slate-50 p-4"><input className="rounded-2xl border border-line px-4 py-3 text-sm" value={editTitle} onChange={(event: { target: { value: string } }) => setEditTitle(event.target.value)} /><textarea className="min-h-24 rounded-2xl border border-line px-4 py-3 text-sm" value={editSummary} onChange={(event: { target: { value: string } }) => setEditSummary(event.target.value)} /><select className="rounded-2xl border border-line px-4 py-3 text-sm" value={editStatus} onChange={(event: { target: { value: string } }) => setEditStatus(event.target.value as ProblemStatus)}><option>Aberto</option><option>Em andamento</option><option>Resolvido</option></select><button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" onClick={saveProblemEdit}>Salvar edição</button></div>}
          <Feedback message={feedback} />
          {showContributionForm && <ContributionForm targetType="problem" targetId={problem.id} fields={problemFields} onClose={() => setShowContributionForm(false)} />}
        </div>
      </article>
      <aside className="space-y-4"><h2 className="text-xl font-semibold">Soluções relacionadas</h2>{related.map((solution) => <button key={solution.id} onClick={() => onNavigate(`solucao:${solution.id}`)} className="w-full rounded-3xl border border-line bg-white p-5 text-left shadow-sm hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-teal-400"><strong>{solution.title}</strong><p className="mt-2 text-sm text-muted">{solution.category} · {solution.status} · {solution.maturityLevel}</p></button>)}</aside>
      <div className="lg:col-span-2"><CommentSection targetType="problem" targetId={problem.id} currentUserId={user?.id ?? null} onCountChange={(count) => setProblem((current) => current ? { ...current, comments: count } : current)} /></div>
    </section>
  );
}

export function SolutionDetails({ id, onNavigate }: { id: string; onNavigate: (page: string) => void }) {
  const [solution, setSolution] = useState<Solution | null>(null);
  const [related, setRelated] = useState<Problem[]>([]);
  const [loadError, setLoadError] = useState('');
  const favorites = useFavorites('solutions');
  const { user } = useAuth();
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editStatus, setEditStatus] = useState<SolutionStatus>('Proposta');
  const isFavorite = solution ? favorites.isFavorite(solution.id) : false;
  const canManage = Boolean(user && solution?.authorId === user.id);

  useEffect(() => {
    let active = true;
    async function loadSolution() {
      if (!SolutionRepository || !ProblemRepository) { setLoadError('Supabase não configurado.'); return; }
      const solutionResult = await SolutionRepository.findById(id);
      if (!active) return;
      if (!solutionResult.ok || !solutionResult.data) { setLoadError(solutionResult.ok ? 'Solução não encontrada.' : solutionResult.message); return; }
      setSolution(solutionResult.data);
      setEditTitle(solutionResult.data.title);
      setEditSummary(solutionResult.data.summary);
      setEditStatus(solutionResult.data.status);
      const problemsResult = await ProblemRepository.list();
      if (!active) return;
      if (problemsResult.ok) setRelated(problemsResult.data.filter((problem) => solutionResult.data!.relatedProblemIds.includes(problem.id))); else setLoadError(problemsResult.message);
    }
    void loadSolution();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timeout = window.setTimeout(() => setFeedback(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const share = async () => {
    if (!solution) return;
    const result = await shareCurrentHashUrl(solution.title, solution.summary);
    setFeedback(getShareMessage(result.status, result.url));
  };

  const toggleFavorite = () => {
    if (!solution) return;
    favorites.toggleFavorite(solution.id);
    setFeedback(isFavorite ? 'Solução removida dos favoritos.' : 'Solução adicionada aos favoritos.');
  };

  const proposeContribution = () => {
    if (!user) { setFeedback('Entre na sua conta para propor alteração.'); onNavigate('login'); return; }
    setShowContributionForm(true);
  };

  const saveSolutionEdit = async () => {
    if (!solution || !SolutionRepository || !canManage) return;
    const result = await SolutionRepository.update(solution.id, { title: editTitle, summary: editSummary, status: editStatus });
    if (result.ok) { setSolution(result.data); setIsEditing(false); setFeedback('Solução atualizada.'); } else setFeedback(result.message);
  };

  const deleteSolution = async () => {
    if (!solution || !SolutionRepository || !canManage) return;
    if (!window.confirm('Excluir esta solução? Esta ação não pode ser desfeita.')) return;
    const result = await SolutionRepository.delete(solution.id);
    if (result.ok) { setFeedback('Solução excluída.'); onNavigate('solucoes'); } else setFeedback(result.message);
  };

  if (!solution) return <EmptyDetail message={loadError || 'Carregando solução no Supabase.'} />;
  const versions = solutionVersions.filter((version) => version.solutionId === solution.id);
  const references = evidences.filter((evidence) => evidence.solutionId === solution.id);
  const realCases = caseStudies.filter((caseStudy) => caseStudy.solutionId === solution.id);
  const solutionImprovements = improvements.filter((improvement) => improvement.solutionId === solution.id);
  const solutionFields = [
    { field: 'title', label: 'Título', value: solution.title },
    { field: 'summary', label: 'Resumo', value: solution.summary },
    { field: 'description', label: 'Descrição', value: solution.description },
    { field: 'category', label: 'Categoria', value: solution.category },
    { field: 'status', label: 'Status', value: solution.status },
    { field: 'maturityLevel', label: 'Maturidade', value: solution.maturityLevel },
    { field: 'impactMetric', label: 'Métrica de impacto', value: solution.impactMetric },
    { field: 'tags', label: 'Tags', value: solution.tags },
    { field: 'relatedProblemIds', label: 'Problemas relacionados', value: solution.relatedProblemIds },
  ];

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <article className="overflow-hidden rounded-[2rem] border border-teal-100 bg-white shadow-sm">
        <img src={solution.image} alt={`Imagem da solução ${solution.title}`} className="h-72 w-full object-cover md:h-96" />
        <div className="p-8">
          <div className="flex flex-wrap gap-2 text-sm"><Badge>{solution.category}</Badge><Badge>{solution.status}</Badge><Badge>{solution.maturityLevel}</Badge><Badge>{solution.implementationDifficulty}</Badge></div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">{solution.title}</h1>
          <p className="mt-5 text-lg leading-8 text-muted">{solution.description}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Info label="Organização responsável" value={solution.organization} />
            <Info label="Autor" value={solution.author} />
            <Info label="Localização" value={`${solution.location}, ${solution.country}`} />
            <Info label="Custo estimado" value={solution.estimatedCost} />
            <Info label="Tempo" value={solution.implementationTime} />
            <Info label="Impacto" value={solution.impactMetric} />
            <Info label="Criada em" value={formatDate(solution.createdAt)} />
            <Info label="Atualizada em" value={formatDate(solution.updatedAt)} />
          </div>
          <div className="mt-8 flex flex-wrap gap-2">{solution.tags.map((tag) => <Badge key={tag}>#{tag}</Badge>)}</div>
          <div className="mt-8 grid gap-3 text-sm text-muted sm:grid-cols-3"><Metric icon={<Heart size={16} />} value={solution.likes} label="curtidas" /><Metric icon={<MessageCircle size={16} />} value={solution.comments} label="comentários" /><Metric icon={<Eye size={16} />} value={solution.views} label="visualizações" /></div>
          <div className="mt-8 flex flex-wrap gap-3"><Action icon={<Share2 size={16} />} label="Compartilhar" onClick={share} ariaLabel={`Compartilhar solução ${solution.title}`} /><Action icon={<Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />} label={isFavorite ? 'Favoritada' : 'Favoritar'} onClick={toggleFavorite} pressed={isFavorite} ariaLabel={isFavorite ? `Remover ${solution.title} dos favoritos` : `Adicionar ${solution.title} aos favoritos`} /><Action icon={<Bookmark size={16} />} label="Salvar" /><Action icon={<Lightbulb size={16} />} label="Propor alteração" onClick={proposeContribution} ariaLabel={`Propor alteração para a solução ${solution.title}`} />{canManage && <Action icon={<GitBranch size={16} />} label={isEditing ? 'Cancelar edição' : 'Editar'} onClick={() => setIsEditing((current) => !current)} />}{canManage && <Action icon={<Bookmark size={16} />} label="Excluir" onClick={deleteSolution} />}<button onClick={() => onNavigate(related[0] ? `problema:${related[0].id}` : 'problemas')} className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-teal-400">Ver problemas relacionados</button></div>
          {isEditing && <div className="mt-6 grid gap-3 rounded-3xl border border-line bg-teal-50 p-4"><input className="rounded-2xl border border-line px-4 py-3 text-sm" value={editTitle} onChange={(event: { target: { value: string } }) => setEditTitle(event.target.value)} /><textarea className="min-h-24 rounded-2xl border border-line px-4 py-3 text-sm" value={editSummary} onChange={(event: { target: { value: string } }) => setEditSummary(event.target.value)} /><select className="rounded-2xl border border-line px-4 py-3 text-sm" value={editStatus} onChange={(event: { target: { value: string } }) => setEditStatus(event.target.value as SolutionStatus)}><option>Proposta</option><option>Em teste</option><option>Implementada</option><option>Validada</option><option>Arquivada</option></select><button className="rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white" onClick={saveSolutionEdit}>Salvar edição</button></div>}
          <Feedback message={feedback} />
          {showContributionForm && <ContributionForm targetType="solution" targetId={solution.id} fields={solutionFields} onClose={() => setShowContributionForm(false)} />}
          <SolutionKnowledgeTabs solution={solution} versions={versions} cases={realCases} references={references} improvements={solutionImprovements} />
        </div>
      </article>
      <aside className="space-y-4"><h2 className="text-xl font-semibold">Problemas relacionados</h2>{related.map((problem) => <button key={problem.id} onClick={() => onNavigate(`problema:${problem.id}`)} className="w-full rounded-3xl border border-line bg-white p-5 text-left shadow-sm hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-teal-400"><strong>{problem.title}</strong><p className="mt-2 text-sm text-muted">{problem.category} · {problem.city}, {problem.state} · {problem.status}</p></button>)}</aside>
      <div className="lg:col-span-2"><CommentSection targetType="solution" targetId={solution.id} currentUserId={user?.id ?? null} onCountChange={(count) => setSolution((current) => current ? { ...current, comments: count } : current)} /></div>
    </section>
  );
}


type CommentTargetType = 'problem' | 'solution';
function CommentSection({ targetType, targetId, currentUserId, onCountChange }: { targetType: CommentTargetType; targetId: string; currentUserId: string | null; onCountChange: (count: number) => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function loadComments() {
      if (!CommentRepository) { setError('Supabase não configurado.'); setLoading(false); return; }
      setLoading(true);
      const result = targetType === 'problem' ? await CommentRepository.listByProblem(targetId) : await CommentRepository.listBySolution(targetId);
      if (!active) return;
      if (result.ok) { setComments(result.data); onCountChange(result.data.length); setError(''); } else setError(result.message);
      setLoading(false);
    }
    void loadComments();
    return () => { active = false; };
  }, [targetId, targetType]);

  const validate = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Escreva um comentário antes de publicar.';
    if (trimmed.length > 2000) return 'O comentário deve ter no máximo 2000 caracteres.';
    return '';
  };
  const publish = async () => {
    if (!CommentRepository || !currentUserId) return;
    const validation = validate(content);
    if (validation) { setMessage(validation); return; }
    const result = await CommentRepository.create(targetType === 'problem' ? { authorId: currentUserId, problemId: targetId, content } : { authorId: currentUserId, solutionId: targetId, content });
    if (result.ok) { const next = [...comments, result.data]; setComments(next); onCountChange(next.length); setContent(''); setMessage('Comentário publicado.'); } else setMessage(result.message);
  };
  const saveEdit = async (commentId: string) => {
    if (!CommentRepository) return;
    const validation = validate(editingContent);
    if (validation) { setMessage(validation); return; }
    const result = await CommentRepository.update(commentId, { content: editingContent });
    if (result.ok) { setComments((current) => current.map((comment) => comment.id === commentId ? result.data : comment)); setEditingId(null); setMessage('Comentário atualizado.'); } else setMessage(result.message);
  };
  const remove = async (commentId: string) => {
    if (!CommentRepository || !window.confirm('Excluir este comentário?')) return;
    const result = await CommentRepository.delete(commentId);
    if (result.ok) { const next = comments.filter((comment) => comment.id !== commentId); setComments(next); onCountChange(next.length); setMessage('Comentário excluído.'); } else setMessage(result.message);
  };

  return <section className="rounded-[2rem] border border-line bg-white p-6 shadow-sm"><h2 className="text-2xl font-semibold">Comentários</h2>{loading && <p className="mt-4 text-sm text-muted">Carregando comentários.</p>}{error && <p className="mt-4 text-sm font-semibold text-rose-700">{error}</p>}{!loading && !error && comments.length === 0 && <p className="mt-4 text-sm text-muted">Ainda não há comentários.</p>}<div className="mt-5 space-y-4">{comments.map((comment) => { const canEdit = currentUserId === comment.authorId; const initial = comment.authorName.slice(0, 1).toUpperCase(); return <article key={comment.id} className="rounded-3xl border border-line p-4"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-bold text-slate-700">{comment.authorAvatarUrl ? <img src={comment.authorAvatarUrl} alt={`Avatar de ${comment.authorName}`} className="h-full w-full object-cover" /> : initial}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{comment.authorName}</strong><span className="text-xs text-muted">{formatDate(comment.createdAt)}</span></div>{editingId === comment.id ? <div className="mt-3 grid gap-2"><textarea className="min-h-24 rounded-2xl border border-line px-4 py-3 text-sm" maxLength={2000} value={editingContent} onChange={(event: { target: { value: string } }) => setEditingContent(event.target.value)} /><div className="flex gap-2"><button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => saveEdit(comment.id)}>Salvar</button><button className="rounded-full border border-line px-4 py-2 text-sm font-semibold" onClick={() => setEditingId(null)}>Cancelar</button></div></div> : <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.content}</p>}{canEdit && editingId !== comment.id && <div className="mt-3 flex gap-2"><button className="text-sm font-semibold text-teal-700" onClick={() => { setEditingId(comment.id); setEditingContent(comment.content); }}>Editar</button><button className="text-sm font-semibold text-rose-700" onClick={() => remove(comment.id)}>Excluir</button></div>}</div></div></article>; })}</div>{currentUserId ? <div className="mt-5 grid gap-3"><textarea className="min-h-28 rounded-3xl border border-line px-4 py-3 text-sm" maxLength={2000} placeholder="Escreva seu comentário" value={content} onChange={(event: { target: { value: string } }) => setContent(event.target.value)} /><div className="flex items-center justify-between gap-3"><span className="text-xs text-muted">{content.trim().length}/2000 caracteres</span><button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" onClick={publish}>Publicar comentário</button></div></div> : <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">Faça login para comentar.</p>}<Feedback message={message} /></section>;
}

type KnowledgeTab = 'Resumo' | 'Versões' | 'Casos reais' | 'Referências';

function SolutionKnowledgeTabs({ solution, versions, cases, references, improvements }: { solution: Solution; versions: SolutionVersion[]; cases: CaseStudy[]; references: Evidence[]; improvements: Improvement[] }) {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>('Resumo');
  const tabs: KnowledgeTab[] = ['Resumo', 'Versões', 'Casos reais', 'Referências'];

  return (
    <div className="mt-10 rounded-[1.75rem] border border-teal-100 bg-teal-50/40 p-2">
      <div className="grid gap-2 sm:grid-cols-4" role="tablist" aria-label="Conhecimento da solução">
        {tabs.map((tab) => (
          <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${activeTab === tab ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:bg-white/70'}`}>{tab}</button>
        ))}
      </div>
      <div className="p-5">
        {activeTab === 'Resumo' && <KnowledgeSummary solution={solution} versions={versions} cases={cases} references={references} improvements={improvements} />}
        {activeTab === 'Versões' && <VersionTimeline versions={versions} />}
        {activeTab === 'Casos reais' && <CaseStudyGrid cases={cases} />}
        {activeTab === 'Referências' && <EvidenceList references={references} />}
      </div>
    </div>
  );
}

function KnowledgeSummary({ solution, versions, cases, references, improvements }: { solution: Solution; versions: SolutionVersion[]; cases: CaseStudy[]; references: Evidence[]; improvements: Improvement[] }) {
  return <div className="space-y-5"><div><h2 className="text-xl font-semibold">Histórico vivo da solução</h2><p className="mt-2 text-sm leading-6 text-muted">{solution.summary} O histórico conecta melhorias, evidências, versões e casos reais para apoiar evolução contínua.</p></div><div className="grid gap-3 md:grid-cols-4"><Info label="Versões" value={String(versions.length)} /><Info label="Melhorias" value={String(improvements.length)} /><Info label="Casos reais" value={String(cases.length)} /><Info label="Referências" value={String(references.length)} /></div>{improvements.map((improvement) => <div key={improvement.id} className="rounded-3xl bg-white p-5 shadow-sm"><h3 className="flex items-center gap-2 font-semibold"><GitBranch size={18} />{improvement.title}</h3><p className="mt-2 text-sm leading-6 text-muted">{improvement.summary}</p></div>)}</div>;
}

function VersionTimeline({ versions }: { versions: SolutionVersion[] }) {
  return <div className="space-y-4">{versions.map((version, index) => <div key={version.id} className="grid gap-4 md:grid-cols-[90px_1fr]"><div className="flex items-start gap-3 md:block"><span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">{version.version}</span>{index < versions.length - 1 && <span className="hidden h-full min-h-16 w-px bg-teal-200 md:mx-6 md:block" />}</div><div className="rounded-3xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{version.summary}</h3><span className="text-xs font-semibold uppercase tracking-wide text-teal-700">{formatDate(version.createdAt)}</span></div><p className="mt-1 text-sm text-muted">Autor: {version.author}</p><ul className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-3">{version.changes.map((change) => <li key={change} className="rounded-2xl bg-slate-50 px-3 py-2">{change}</li>)}</ul></div></div>)}</div>;
}

function CaseStudyGrid({ cases }: { cases: CaseStudy[] }) {
  return <div className="grid gap-4">{cases.map((study) => <article key={study.id} className="overflow-hidden rounded-3xl bg-white shadow-sm"><div className="grid gap-0 md:grid-cols-[220px_1fr]"><img src={study.photos[0]} alt={`Foto do caso real em ${study.city}`} className="h-52 w-full object-cover md:h-full" /><div className="p-5"><Badge>{study.city}, {study.country}</Badge><h3 className="mt-3 text-lg font-semibold">{study.organization}</h3><p className="mt-2 text-sm font-semibold text-teal-800">{study.results}</p><div className="mt-4 grid gap-3 md:grid-cols-2"><Info label="Antes" value={study.before} /><Info label="Depois" value={study.after} /></div></div></div></article>)}</div>;
}

function EvidenceList({ references }: { references: Evidence[] }) {
  return <div className="grid gap-3">{references.map((reference) => <a key={reference.id} href={reference.url} className="rounded-3xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"><span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-700"><ExternalLink size={14} />{reference.type}</span><h3 className="mt-2 font-semibold text-slate-900">{reference.title}</h3><p className="mt-2 text-sm leading-6 text-muted">{reference.description}</p><p className="mt-2 break-all text-sm text-teal-700 underline underline-offset-4">{reference.url}</p></a>)}</div>;
}

function EmptyDetail({ message }: { message: string }) { return <section className="rounded-[2rem] border border-line bg-white p-8 text-sm font-semibold text-slate-700 shadow-sm">{message}</section>; }
function Badge({ children }: { children: ReactNode }) { return <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{children}</span>; }
function Action({ icon, label, onClick, pressed, ariaLabel }: { icon: ReactNode; label: string; onClick?: () => void; pressed?: boolean; ariaLabel?: string }) { return <button onClick={onClick} aria-pressed={pressed} aria-label={ariaLabel ?? label} className={`inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-400 ${pressed ? 'bg-rose-50 text-rose-700' : ''}`}>{icon}{label}</button>; }
function Feedback({ message }: { message: string }) { return <p aria-live="polite" className="mt-4 break-words text-sm font-semibold text-slate-700">{message}</p>; }
function Info({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) { return <div className="rounded-2xl bg-slate-50 p-4"><span className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">{icon}{label}</span><p className="mt-2 text-sm font-semibold text-slate-800">{value}</p></div>; }
function Metric({ icon, value, label }: { icon: ReactNode; value: number; label: string }) { return <span className="inline-flex items-center gap-2 rounded-2xl bg-teal-50 px-3 py-2 text-teal-800">{icon}{value} {label}</span>; }
function formatDate(date: string) { return new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }); }
