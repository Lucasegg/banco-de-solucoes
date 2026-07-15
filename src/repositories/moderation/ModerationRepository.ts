import type { Comment } from '../../types/discussion';
import type { ContentVisibility, ModerationAction, ModerationActionType, ModerationCase, ModerationStatus } from '../../types/moderation';
import { LOCAL_STORAGE_EVENT, localStorageAdapter } from '../../storage/LocalStorageAdapter';
import { COMMENTS_KEY, isComment } from '../comments';

const CASES_KEY = 'banco-de-solucoes.moderation.cases';
const ACTIONS_KEY = 'banco-de-solucoes.moderation.actions';
const statuses: ModerationStatus[] = ['open', 'under_review', 'resolved', 'dismissed'];
const actionTypes: ModerationActionType[] = ['case_created', 'assigned', 'review_started', 'note_added', 'comment_hidden', 'comment_restored', 'comment_removed', 'report_dismissed', 'case_resolved', 'contribution_assigned', 'contribution_approved', 'contribution_rejected'];

export type ModerationTransaction = { cases: ModerationCase[]; actions: ModerationAction[]; comments?: Comment[] };

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function isContentVisibility(value: unknown): value is ContentVisibility { return value === 'visible' || value === 'hidden' || value === 'removed'; }
export function isCase(value: unknown): value is ModerationCase { return isRecord(value) && typeof value.id === 'string' && value.targetType === 'comment' && typeof value.targetId === 'string' && statuses.includes(value.status as ModerationStatus) && isContentVisibility(value.visibility) && Array.isArray(value.reportIds) && value.reportIds.every((reportId) => typeof reportId === 'string') && (value.assignedToId === null || typeof value.assignedToId === 'string') && (value.assignedToName === null || typeof value.assignedToName === 'string') && typeof value.internalNote === 'string' && typeof value.createdAt === 'string' && typeof value.updatedAt === 'string' && (value.resolvedAt === null || typeof value.resolvedAt === 'string'); }
export function isAction(value: unknown): value is ModerationAction { return isRecord(value) && typeof value.id === 'string' && typeof value.caseId === 'string' && (value.targetType === 'comment' || value.targetType === 'contribution') && typeof value.targetId === 'string' && actionTypes.includes(value.action as ModerationActionType) && typeof value.moderatorId === 'string' && typeof value.moderatorName === 'string' && typeof value.reason === 'string' && typeof value.createdAt === 'string'; }
function id(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
export function createAction(action: Omit<ModerationAction, 'id' | 'createdAt'>): ModerationAction { return { ...action, id: id('action'), createdAt: new Date().toISOString() }; }

export const ModerationRepository = {
  eventName: LOCAL_STORAGE_EVENT,
  keys: { cases: CASES_KEY, actions: ACTIONS_KEY, comments: COMMENTS_KEY },
  createId: id,
  listCases: () => localStorageAdapter.list(CASES_KEY, { validator: isCase }),
  listActions: () => localStorageAdapter.list(ACTIONS_KEY, { validator: isAction }),
  listComments: () => localStorageAdapter.list(COMMENTS_KEY, { validator: isComment }),
  saveCases: (cases: ModerationCase[]) => localStorageAdapter.set(CASES_KEY, cases.filter(isCase)),
  persistTransaction: (transaction: ModerationTransaction) => localStorageAdapter.transaction([
    { type: 'set', key: CASES_KEY, value: transaction.cases },
    { type: 'set', key: ACTIONS_KEY, value: transaction.actions },
    ...(transaction.comments ? [{ type: 'set' as const, key: COMMENTS_KEY, value: transaction.comments }] : []),
  ]),
  addAction: (action: Omit<ModerationAction, 'id' | 'createdAt'>) => localStorageAdapter.transaction([{ type: 'set', key: ACTIONS_KEY, value: [createAction(action), ...localStorageAdapter.list(ACTIONS_KEY, { validator: isAction })] }]),
};
