import type { LegalDocumentType } from './versions';
import type { LegalAcceptance, LegalConsentStatus } from '../types/legalConsent';

export function selectCurrentLegalAcceptance(status: LegalConsentStatus | null, type: LegalDocumentType): LegalAcceptance | undefined {
  if (!status) return undefined;
  const requiredVersion = status.requiredVersions[type];
  return status.acceptances.find((acceptance) => acceptance.documentType === type && acceptance.documentVersion === requiredVersion);
}
