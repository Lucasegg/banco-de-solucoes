import { useState } from 'react';
import { Share2, X, UsersRound } from 'lucide-react';
import type { Comment } from '../../types/discussion';
import { CommentEditor } from './CommentEditor';

type ActionResult = { ok: boolean; message?: string };
type MaybePromise<T> = T | Promise<T>;

export function CommentCard({ comment, currentUserId, onEdit, onDelete }: { comment: Comment; currentUserId: string | null; onEdit: (commentId: string, content: string) => MaybePromise<ActionResult>; onDelete: (commentId: string) => MaybePromise<ActionResult> }) {
  const [editing, setEditing] = useState(false); const [message, setMessage] = useState(''); const [deleting, setDeleting] = useState(false); const isAuthor = currentUserId === comment.authorId;
  const remove = async () => { if (deleting || !window.confirm('Excluir este comentário?')) return; setDeleting(true); const result = await onDelete(comment.id); setMessage(result.ok ? 'Comentário excluído.' : result.message ?? 'Não foi possível excluir.'); setDeleting(false); };
  return <article className="rounded-3xl border border-line bg-white p-5">
    <header className="flex items-center gap-3">{comment.authorAvatarUrl ? <img src={comment.authorAvatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100"><UsersRound size={20} /></span>}<div><h3 className="font-semibold">{comment.authorName}</h3><p className="text-xs text-muted">{new Date(comment.createdAt).toLocaleString('pt-BR')}{comment.edited ? ' · editado' : ''}</p></div></header>
    {editing ? <div className="mt-4"><CommentEditor initialValue={comment.content} submitLabel="Salvar edição" onSubmit={async (content) => { const result = await onEdit(comment.id, content); if (result.ok) setEditing(false); return result; }} /></div> : <p className="mt-4 whitespace-pre-line leading-7 text-slate-700">{comment.content}</p>}
    {isAuthor && <div className="mt-4 flex gap-2"><button type="button" disabled={deleting} onClick={() => setEditing((value) => !value)} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-semibold"><Share2 size={14} /> Editar</button><button type="button" disabled={deleting} onClick={remove} className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"><X size={14} /> {deleting ? 'Excluindo...' : 'Excluir'}</button></div>}
    {message && <p className="mt-3 text-sm font-semibold text-slate-700">{message}</p>}
  </article>;
}
