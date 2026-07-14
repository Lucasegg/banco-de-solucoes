import type { ReactNode } from 'react';
import { Award, CheckCircle2, GitBranch, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import type { Comment, Reaction, ReactionType } from '../../types/discussion';
import { CommentEditor } from './CommentEditor';
import { ReactionBar } from './ReactionBar';

export function CommentCard({ comment, children, depth, reactions, currentUserId, canMarkBestAnswer, onReply, onReact, onMarkBestAnswer }: { comment: Comment; children?: ReactNode; depth: number; reactions: Reaction[]; currentUserId: string | null; canMarkBestAnswer: boolean; onReply: (content: string, parentId: string) => { ok: boolean; message?: string }; onReact: (commentId: string, type: ReactionType) => void; onMarkBestAnswer: (commentId: string) => void }) {
  const [replying, setReplying] = useState(false);

  return (
    <article className={`rounded-3xl border p-5 ${comment.bestAnswer ? 'border-emerald-300 bg-emerald-50/60' : 'border-line bg-white'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold"><MessageCircle size={17} />{comment.authorName}</h3>
          <p className="mt-1 text-xs text-muted">{new Date(comment.createdAt).toLocaleString('pt-BR')} {comment.edited ? '· editado' : ''}</p>
        </div>
        {comment.bestAnswer && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white"><Award size={14} /> Melhor resposta</span>}
      </div>
      <p className="mt-4 whitespace-pre-line leading-7 text-slate-700">{comment.deleted ? 'Comentário removido.' : comment.content}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ReactionBar commentId={comment.id} reactions={reactions} currentUserId={currentUserId} onToggle={(type) => onReact(comment.id, type)} />
        {depth < 3 && <button type="button" onClick={() => setReplying((value) => !value)} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-slate-600"><GitBranch size={15} /> Responder</button>}
        {canMarkBestAnswer && !comment.bestAnswer && <button type="button" onClick={() => onMarkBestAnswer(comment.id)} className="inline-flex items-center gap-1 rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={15} /> Marcar melhor resposta</button>}
      </div>
      {replying && <div className="mt-4"><CommentEditor submitLabel="Responder" onSubmit={(content) => { const result = onReply(content, comment.id); if (result.ok) setReplying(false); return result; }} /></div>}
      {children && <div className="mt-4 space-y-4 border-l-2 border-slate-100 pl-4">{children}</div>}
    </article>
  );
}
