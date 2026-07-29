export const CURRENT_LEGAL_VERSIONS = {
  terms: 'terms-2026-07-29',
  privacy: 'privacy-2026-07-29',
} as const;

export type LegalDocumentType = keyof typeof CURRENT_LEGAL_VERSIONS;
export type LegalDocumentVersion = typeof CURRENT_LEGAL_VERSIONS[LegalDocumentType];
export type LegalLocale = 'pt-BR' | 'en-US';

