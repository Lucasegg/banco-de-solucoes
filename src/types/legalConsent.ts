import type { LegalDocumentType, LegalDocumentVersion } from '../legal/versions';

export interface LegalAcceptance { documentType: LegalDocumentType; documentVersion: LegalDocumentVersion | string; locale: string; acceptedAt: string }
export interface LegalConsentStatus { requiredVersions: Record<LegalDocumentType, LegalDocumentVersion>; acceptances: LegalAcceptance[]; pending: boolean }

