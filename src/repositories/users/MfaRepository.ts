import type { SupabaseClient } from '@supabase/supabase-js';
import type { AssuranceLevel, MfaEnrollment, MfaFactor } from '../../types/mfa';

export class MfaRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listMfaFactors(): Promise<{ factors: MfaFactor[]; error?: string }> {
    const { data, error } = await this.client.auth.mfa.listFactors();
    if (error) return { factors: [], error: error.message };
    return { factors: data.totp.map(({ id, status, created_at }) => ({ id, status, createdAt: created_at })) };
  }
  async enrollTotp(): Promise<{ enrollment?: MfaEnrollment; error?: string }> {
    const { data, error } = await this.client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Aplicativo autenticador' });
    if (error) return { error: error.message };
    return { enrollment: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri } };
  }
  async challengeAndVerifyTotp(factorId: string, code: string) {
    return this.client.auth.mfa.challengeAndVerify({ factorId, code });
  }
  async unenrollTotp(factorId: string) { return this.client.auth.mfa.unenroll({ factorId }); }
  async getAssuranceLevel(): Promise<{ currentLevel: AssuranceLevel; nextLevel: AssuranceLevel; error?: string }> {
    const { data, error } = await this.client.auth.mfa.getAuthenticatorAssuranceLevel();
    return error ? { currentLevel: null, nextLevel: null, error: error.message } : { currentLevel: data.currentLevel === 'aal2' ? 'aal2' : data.currentLevel === 'aal1' ? 'aal1' : null, nextLevel: data.nextLevel === 'aal2' ? 'aal2' : data.nextLevel === 'aal1' ? 'aal1' : null }; 
  }
}
