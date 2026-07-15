import type { ChangeEvent, ReactNode } from 'react';
import { useState } from 'react';
import { Award, CheckCircle2, Eye, GitBranch, MessageCircle, Share2, X } from 'lucide-react';
import type { Comment, Reaction, ReactionType } from '../../types/discussion';
import { CommentEditor } from './CommentEditor';
import { ReactionBar } from './ReactionBar';

type ActionResult = { ok: boolean; message?: string };
type MaybePromise<T> = T | Promise<T>;

export function CommentCard({ comment, children, depth, reactions, currentUserId, canMarkBestAnswer, onReply, onReact, onMarkBestAnswer, onEdit, onDelete, onReport }: { comment: Comment; children?: ReactNode; depth: number; reactions: Reaction[]; currentUserId: string | null; canMarkBestAnswer: boolean; onReply: (content: string, parentId: string) => MaybePromise<ActionResult>; onReact: (commentId: string, type: ReactionType) => void; onMarkBestAnswer: (commentId: string) => MaybePromise<ActionResult>; onEdit: (commentId: string, content: string) => MaybePromise<ActionResult>; onDelete: (commentId: string) => MaybePromise<ActionResult>; onReport: (commentId: string, reason: string) => MaybePromise<ActionResult> }) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [message, setMessage] = useState('');
  const isAuthor = currentUserId === comment.authorId;
  const isHidden = comment.visibility === 'hidden';
  const isRemoved = comment.visibility === 'removed' || comment.deleted;

  const markBestAnswer = async () => {
    const result = await onMarkBestAnswer(comment.id);
    setMessage(result.message ?? '');
  };

  const deleteComment = async () => {
    const result = await onDelete(comment.id);
    setMessage(result.message ?? '');
  };

  const reportComment = async () => {
    const result = await onReport(comment.id, reportReason);
    setMessage(result.message ?? '');
    if (result.ok) {
      setReporting(false);
      setReportReason('');
    }
  };

  return (
    <article className={`rounded-3xl border p-5 ${comment.bestAnswer ? 'border-emerald-300 bg-emerald-50/60' : 'border-line bg-white'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold"><MessageCircle size={17} />{comment.authorName}</h3>
          <p className="mt-1 text-xs text-muted">{new Date(comment.createdAt).toLocaleString('pt-BR')} {comment.edited ? '· editado' : ''} {comment.reports.length > 0 ? `· ${comment.reports.length} reporte(s)` : ''}</p>
        </div>
        {comment.bestAnswer && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white"><Award size={14} /> Melhor resposta</span>}
      </div>
      {editing && !isRemoved && !isHidden ? <div className="mt-4"><CommentEditor initialValue={comment.content} submitLabel="Salvar edição" onSubmit={async (content) => { const result = await onEdit(comment.id, content); if (result.ok) setEditing(false); return result; }} /></div> : <p className="mt-4 whitespace-pre-line leading-7 text-slate-700">{isRemoved ? 'Comentário removido.' : isHidden ? 'Conteúdo ocultado pela moderação.' : comment.content}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ReactionBar commentId={comment.id} reactions={reactions} currentUserId={currentUserId} onToggle={(type) => onReact(comment.id, type)} />
        {depth < 3 && !isRemoved && !isHidden && <button type="button" onClick={() => setReplying((value) => !value)} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-slate-600"><GitBranch size={15} /> Responder</button>}
        {isAuthor && !isRemoved && !isHidden && <button type="button" onClick={() => setEditing((value) => !value)} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-slate-600"><Share2 size={15} /> Editar</button>}
        {isAuthor && !isRemoved && !isHidden && <button type="button" onClick={deleteComment} className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"><X size={15} /> Excluir</button>}
        {currentUserId && !isAuthor && !isRemoved && !isHidden && <button type="button" onClick={() => setReporting((value) => !value)} className="inline-flex items-center gap-1 rounded-full border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700"><Eye size={15} /> Reportar</button>}
        {canMarkBestAnswer && !comment.bestAnswer && !isRemoved && !isHidden && <button type="button" onClick={markBestAnswer} className="inline-flex items-center gap-1 rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={15} /> Marcar melhor resposta</button>}
      </div>
      {message && <p className="mt-3 text-sm font-semibold text-slate-700">{message}</p>}
      {reporting && <div className="mt-4 rounded-2xl bg-amber-50 p-3"><textarea value={reportReason} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setReportReason(event.target.value)} rows={2} placeholder="Descreva o motivo do reporte" className="w-full rounded-xl border border-amber-100 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-amber-300" /><button type="button" onClick={reportComment} className="mt-2 rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white">Enviar reporte</button></div>}
      {replying && <div className="mt-4"><CommentEditor submitLabel="Responder" onSubmit={async (content) => { const result = await onReply(content, comment.id); if (result.ok) setReplying(false); return result; }} /></div>}
      {children && <div className="mt-4 space-y-4 border-l-2 border-slate-100 pl-4">{children}</div>}
    </article>
  );
}
