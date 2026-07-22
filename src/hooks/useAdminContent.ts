import { useEffect, useMemo, useState } from 'react';
import { supabaseClient } from '../integrations/supabase/client';
import { AdminContentRepository, type AdminContentKind, type AdminContentListOptions, type AdminContentRecord } from '../repositories/adminContent';

export function useAdminContent(kind: AdminContentKind, enabled: boolean, options: AdminContentListOptions) {
  const repository = useMemo(() => supabaseClient ? new AdminContentRepository(supabaseClient) : null, []);
  const [state, setState] = useState({ records: [] as AdminContentRecord[], total: 0, loading: enabled, error: '', refresh: 0 });
  useEffect(() => {
    if (!enabled) return;
    if (!repository) { setState((value) => ({ ...value, loading: false, error: 'A consulta administrativa requer uma conexão configurada com o Supabase.' })); return; }
    let active = true;
    setState((value) => ({ ...value, loading: true, error: '' }));
    void repository.list(kind, options).then((result) => { if (!active) return; setState((value) => result.ok ? { ...value, records: result.data.records, total: result.data.total, loading: false } : { ...value, loading: false, error: result.message }); });
    return () => { active = false; };
  }, [enabled, kind, options.page, options.search, options.status, repository, state.refresh]);
  return { records: state.records, total: state.total, loading: state.loading, error: state.error, retry: () => setState((value) => ({ ...value, refresh: value.refresh + 1 })) };
}
