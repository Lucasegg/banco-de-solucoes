import type { Contribution, ContributionChange, ContributionReview, ContributionStatus, ContributionTargetType, ContributionType, SerializableValue } from '../../types/contribution';
import { localStorageAdapter } from '../../storage/LocalStorageAdapter';
import { ModerationRepository, createAction, isAction } from '../moderation';
import type { ModerationAction } from '../../types/moderation';

const STORAGE_KEY = 'banco-de-solucoes.contributions';
const contributionTypes: ContributionType[] = ['Correção', 'Atualização', 'Nova evidência', 'Novo caso real', 'Nova versão', 'Nova relação', 'Melhoria geral'];
const statuses: ContributionStatus[] = ['Pendente', 'Em revisão', 'Aprovada', 'Rejeitada', 'Cancelada'];
const targetTypes: ContributionTargetType[] = ['problem', 'solution'];
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function isSerializable(value: unknown): value is SerializableValue { if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return true; if (Array.isArray(value)) return value.every(isSerializable); if (isRecord(value)) return Object.values(value).every(isSerializable); return false; }
function isChange(value: unknown): value is ContributionChange { return isRecord(value) && typeof value.id === 'string' && typeof value.field === 'string' && typeof value.label === 'string' && isSerializable(value.previousValue) && isSerializable(value.proposedValue); }
function isReview(value: unknown): value is ContributionReview { return isRecord(value) && typeof value.id === 'string' && statuses.includes(value.status as ContributionStatus) && typeof value.reviewerId === 'string' && typeof value.reviewerName === 'string' && typeof value.message === 'string' && typeof value.createdAt === 'string'; }
export function isContribution(value: unknown): value is Contribution { return isRecord(value) && typeof value.id === 'string' && targetTypes.includes(value.targetType as ContributionTargetType) && typeof value.targetId === 'string' && typeof value.targetTitle === 'string' && typeof value.targetOwnerName === 'string' && contributionTypes.includes(value.type as ContributionType) && statuses.includes(value.status as ContributionStatus) && typeof value.title === 'string' && typeof value.description === 'string' && typeof value.justification === 'string' && Array.isArray(value.changes) && value.changes.length > 0 && value.changes.every(isChange) && typeof value.authorId === 'string' && typeof value.authorName === 'string' && typeof value.createdAt === 'string' && typeof value.updatedAt === 'string' && Array.isArray(value.reviews) && value.reviews.every(isReview); }
function normalizeContribution(value: unknown): Contribution | null { if (!isContribution(value)) return null; return { ...value, reviewerId: typeof value.reviewerId === 'string' ? value.reviewerId : null, reviewerName: typeof value.reviewerName === 'string' ? value.reviewerName : null }; }
export const ContributionRepository = {
  key: STORAGE_KEY,
  list: () => localStorageAdapter.list(STORAGE_KEY, { normalizer: normalizeContribution }),
  save: (contributions: Contribution[]) => localStorageAdapter.set(STORAGE_KEY, contributions.filter(isContribution)),
  saveWithModerationAction: (contributions: Contribution[], action: Omit<ModerationAction, 'id' | 'createdAt'>) => localStorageAdapter.transaction([
    { type: 'set', key: STORAGE_KEY, value: contributions.filter(isContribution) },
    { type: 'set', key: ModerationRepository.keys.actions, value: [createAction(action), ...ModerationRepository.listActions()].filter(isAction) },
  ]),
};
