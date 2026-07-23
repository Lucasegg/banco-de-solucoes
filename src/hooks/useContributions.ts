import { useCallback, useEffect, useMemo, useState } from 'react';
import { ContributionRepository } from '../repositories/contributions';
import type { Contribution, ContributionAudit, ContributionPayload, ContributionTargetType, ContributionType } from '../types/contribution';
import type { UserProfile } from '../types/user';

export function useContributions(user?: UserProfile | null, target?: { type: ContributionTargetType; id: string }) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [audit, setAudit] = useState<ContributionAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => { if (!ContributionRepository || (!user && !target)) { setContributions([]); setAudit([]); setLoading(false); return; } setLoading(true); const result = target ? await ContributionRepository.listByTarget(target.type, target.id) : await ContributionRepository.list(); if (result.ok) { setContributions(result.data); setError(''); } else setError(result.message); if (user?.roleKey === 'curator' || user?.roleKey === 'admin') { const auditResult = await ContributionRepository.listAudit(); if (auditResult.ok) setAudit(auditResult.data); else setError(auditResult.message); } setLoading(false); }, [target?.id, target?.type, user]);
  useEffect(() => { void refresh(); }, [refresh]);
  const createContribution = useCallback(async (input: { targetType: ContributionTargetType; targetId: string; contributionType: ContributionType; payload: ContributionPayload }) => { if (!user || !ContributionRepository) return { ok: false as const, message: 'Entre ou crie uma conta para contribuir.' }; const result = await ContributionRepository.create({ ...input, userId: user.id }); if (result.ok) await refresh(); return result; }, [refresh, user]);
  const review = useCallback(async (id: string, status: 'approved' | 'rejected' | 'changes_requested', reason = '') => { if (!ContributionRepository) return { ok: false as const, message: 'Não foi possível concluir esta ação.' }; if ((status === 'rejected' || status === 'changes_requested') && !reason.trim()) return { ok: false as const, message: 'Informe o motivo da rejeição.' }; const result = await ContributionRepository.review(id, status, reason); if (result.ok) await refresh(); return result; }, [refresh]);
  const stats = useMemo(() => { const mine = contributions.filter((x) => x.userId === user?.id); const approved = mine.filter((x) => x.status === 'approved').length; const rejected = mine.filter((x) => x.status === 'rejected').length; return { sent: mine.length, approved, rejected, approvalRate: mine.length ? Math.round(approved / mine.length * 100) : 0, reputationPoints: approved * 20, badges: [] }; }, [contributions, user]);
  const withdrawContribution = useCallback(async (id: string) => { if (!ContributionRepository) return { ok: false as const, message: 'Não foi possível concluir esta ação.' }; const result = await ContributionRepository.withdraw(id); if (result.ok) await refresh(); return result; }, [refresh]);
  return { contributions, audit, loading, error, stats, refresh, createContribution, withdrawContribution, approveContribution: (id: string) => review(id, 'approved'), rejectContribution: (id: string, reason: string) => review(id, 'rejected', reason), requestChangesContribution: (id: string, reason: string) => review(id, 'changes_requested', reason) };
}
