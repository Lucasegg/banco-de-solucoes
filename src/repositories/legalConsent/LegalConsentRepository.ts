import type { SupabaseClient } from '@supabase/supabase-js';
import type { LegalLocale } from '../../legal/versions';
import type { LegalAcceptance, LegalConsentStatus } from '../../types/legalConsent';

type StatusRow = { required_versions: LegalConsentStatus['requiredVersions']; accepted: Array<{ document_type: LegalAcceptance['documentType']; document_version: string; locale: string; accepted_at: string }>; pending: boolean };

export class LegalConsentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async status(): Promise<{ ok: true; data: LegalConsentStatus } | { ok: false }> {
    const { data, error } = await this.client.rpc('get_my_legal_consent_status');
    if (error || !data || typeof data !== 'object') return { ok: false };
    const row = data as StatusRow;
    if (!row.required_versions || !Array.isArray(row.accepted) || typeof row.pending !== 'boolean') return { ok: false };
    return { ok: true, data: { requiredVersions: row.required_versions, pending: row.pending, acceptances: row.accepted.map((item) => ({ documentType: item.document_type, documentVersion: item.document_version, locale: item.locale, acceptedAt: item.accepted_at })) } };
  }

  async accept(locale: LegalLocale): Promise<{ ok: boolean }> {
    const { error } = await this.client.rpc('accept_current_legal_documents', { p_locale: locale });
    return { ok: !error };
  }
}

