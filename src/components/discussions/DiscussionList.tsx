import type { Comment, DiscussionTargetType, Reaction, ReactionType } from '../../types/discussion';
import { CommentCard } from './CommentCard';
import { CommentEditor } from './CommentEditor';

function sortComments(comments: Comment[]) {
  return [...comments].sort((a, b) => Number(b.bestAnswer) - Number(a.bestAnswer) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function DiscussionList({ title, targetType, comments, reactions, currentUserId, targetAuthorId, onComment, onReply, onReact, onMarkBestAnswer }: { title: string; targetType: DiscussionTargetType; comments: Comment[]; reactions: Reaction[]; currentUserId: string | null; targetAuthorId?: string; onComment: (content: string) => { ok: boolean; message?: string }; onReply: (content: string, parentId: string) => { ok: boolean; message?: string }; onReact: (commentId: string, type: ReactionType) => void; onMarkBestAnswer: (commentId: string) => void }) {
  const rootComments = sortComments(comments.filter((comment) => comment.parentId === null));
  const canMarkBestAnswer = Boolean(currentUserId && targetAuthorId === currentUserId);

  const renderComment = (comment: Comment, depth: number): JSX.Element => {
    const replies = sortComments(comments.filter((item) => item.parentId === comment.id));
    return (
      <CommentCard key={comment.id} comment={comment} depth={depth} reactions={reactions} currentUserId={currentUserId} canMarkBestAnswer={canMarkBestAnswer && targetType === 'problem'} onReply={onReply} onReact={onReact} onMarkBestAnswer={onMarkBestAnswer}>
        {replies.map((reply) => renderComment(reply, depth + 1))}
      </CommentCard>
    );
  };

  return (
    <section className="mt-8 rounded-[2rem] border border-line bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted">Discussões em árvore com até três níveis, reações e melhor resposta.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">{comments.length} comentários</span>
      </div>
      <div className="mt-5"><CommentEditor onSubmit={onComment} /></div>
      <div className="mt-6 space-y-4">
        {rootComments.length > 0 ? rootComments.map((comment) => renderComment(comment, 1)) : <p className="rounded-3xl bg-slate-50 p-6 text-sm text-muted">Seja a primeira pessoa a iniciar a discussão.</p>}
      </div>
    </section>
  );
}
