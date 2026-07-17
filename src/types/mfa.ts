export type MfaStatus = 'unavailable' | 'loading' | 'disabled' | 'enrollment-pending' | 'enabled' | 'challenge-required' | 'verifying' | 'error';
export type AssuranceLevel = 'aal1' | 'aal2' | null;

export interface MfaFactor { id: string; status: 'verified' | 'unverified'; createdAt: string; }
export interface MfaEnrollment { factorId: string; qrCode: string; secret: string; uri: string; }

export const normalizeTotpCode = (code: string) => code.replace(/\s+/g, '').replace(/\D/g, '').slice(0, 6);

export function selectVerifiedFactor(factors: MfaFactor[]) {
  return [...factors].filter((factor) => factor.status === 'verified')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0] ?? null;
}
