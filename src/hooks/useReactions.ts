import { useCallback, useEffect, useRef, useState } from 'react';
import { ReactionRepository, type ReactionTarget } from '../repositories/reactions';
import type { ReactionState, ReactionType } from '../types/discussion';
import { useAuth } from './useAuth';
const initialState: ReactionState = { counts: { useful: 0, liked: 0, interesting: 0 }, selected: [] };
export function useReactions(target: ReactionTarget) {
  const { isAuthenticated } = useAuth(); const [state, setState] = useState(initialState); const [isLoading, setIsLoading] = useState(true); const [error, setError] = useState(''); const pending = useRef(false);
  const reload = useCallback(async () => {
    if (!ReactionRepository) { setError('Supabase não configurado para reações.'); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const result = await ReactionRepository.summary(target);
      if (result.ok) { setState(result.data); setError(''); } else setError(result.message);
    } catch {
      setError('Ocorreu um erro inesperado ao carregar as reações.');
    } finally {
      setIsLoading(false);
    }
  }, [target.id, target.kind]);
  useEffect(() => { void reload(); }, [reload, isAuthenticated]);
  const toggle = useCallback(async (type: ReactionType) => {
    if (!isAuthenticated) return { ok: false, message: 'Entre na sua conta para reagir.' }; if (!ReactionRepository) return { ok: false, message: 'Supabase não configurado para reações.' }; if (pending.current) return { ok: false, message: 'Aguarde a reação anterior.' };
    pending.current = true; const active = state.selected.includes(type);
    setState((current) => ({ counts: { ...current.counts, [type]: Math.max(0, current.counts[type] + (active ? -1 : 1)) }, selected: active ? current.selected.filter((item) => item !== type) : [...current.selected, type] }));
    try {
      const result = active ? await ReactionRepository.remove(target, type) : await ReactionRepository.add(target, type);
      if (!result.ok) { setError(result.message); await reload(); return result; }
      setError(''); await reload(); return result;
    } catch {
      const message = 'Ocorreu um erro inesperado ao atualizar a reação.';
      setError(message); await reload(); return { ok: false, message };
    } finally {
      pending.current = false;
    }
  }, [isAuthenticated, reload, state, target.id, target.kind]);
  return { ...state, isLoading, error, toggle };
}
