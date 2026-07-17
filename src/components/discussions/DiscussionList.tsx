import type { Comment } from '../../types/discussion';
import { CommentCard } from './CommentCard';
import { CommentEditor } from './CommentEditor';
type ActionResult = { ok: boolean; message?: string }; type MaybePromise<T> = T | Promise<T>;
export function DiscussionList({ title, comments, currentUserId, storageError, onComment, onEdit, onDelete }: { title: string; comments: Comment[]; currentUserId: string | null; storageError?: string | null; onComment: (content: string) => MaybePromise<ActionResult>; onEdit: (commentId: string, content: string) => MaybePromise<ActionResult>; onDelete: (commentId: string) => MaybePromise<ActionResult> }) {
  const ordered = [...comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return <section className="mt-8 rounded-[2rem] border border-line bg-white p-6 shadow-sm"><div className="flex items-end justify-between gap-3"><div><h2 className="text-2xl font-semibold">{title}</h2><p className="mt-1 text-sm text-muted">Compartilhe contexto e informações sobre este item.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{comments.length} comentários</span></div>
    {storageError && <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">{storageError}</p>}
    {currentUserId ? <div className="mt-5"><CommentEditor onSubmit={onComment} /></div> : <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold">Entre na sua conta para comentar.</p>}
    <div className="mt-6 space-y-4">{ordered.length ? ordered.map((comment) => <CommentCard key={comment.id} comment={comment} currentUserId={currentUserId} onEdit={onEdit} onDelete={onDelete} />) : <p className="rounded-3xl bg-slate-50 p-6 text-sm text-muted">Ainda não há comentários.</p>}</div></section>;
}
