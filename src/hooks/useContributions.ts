import { useCallback, useEffect, useMemo, useState } from 'react';
import { ContributionRepository } from '../repositories/contributions';
import type { Contribution, ContributionPayload, ContributionTargetType, ContributionType } from '../types/contribution';
import type { UserProfile } from '../types/user';

export function useContributions(user?: UserProfile | null) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => { if (!user || !ContributionRepository) { setContributions([]); setLoading(false); return; } setLoading(true); const result = await ContributionRepository.list(); if (result.ok) { setContributions(result.data); setError(''); } else setError(result.message); setLoading(false); }, [user]);
  useEffect(() => { void refresh(); }, [refresh]);
  const createContribution = useCallback(async (input: { targetType: ContributionTargetType; targetId: string; contributionType: ContributionType; payload: ContributionPayload }) => { if (!user || !ContributionRepository) return { ok: false as const, message: 'Entre e configure o Supabase para contribuir.' }; const result = await ContributionRepository.create({ ...input, userId: user.id }); if (result.ok) await refresh(); return result; }, [refresh, user]);
  const review = useCallback(async (id: string, status: 'approved' | 'rejected', reason = '') => { if (!ContributionRepository) return { ok: false as const, message: 'Supabase não configurado.' }; if (status === 'rejected' && !reason.trim()) return { ok: false as const, message: 'Informe o motivo da rejeição.' }; const result = await ContributionRepository.review(id, status, reason); if (result.ok) await refresh(); return result; }, [refresh]);
  const stats = useMemo(() => { const mine = contributions.filter((x) => x.userId === user?.id); const approved = mine.filter((x) => x.status === 'approved').length; const rejected = mine.filter((x) => x.status === 'rejected').length; return { sent: mine.length, approved, rejected, approvalRate: mine.length ? Math.round(approved / mine.length * 100) : 0, reputationPoints: approved * 20, badges: [] }; }, [contributions, user]);
  return { contributions, loading, error, stats, refresh, createContribution, approveContribution: (id: string) => review(id, 'approved'), rejectContribution: (id: string, reason: string) => review(id, 'rejected', reason) };
}
