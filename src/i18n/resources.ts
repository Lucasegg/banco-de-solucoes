import { commonEnUS, commonPtBR } from './locales/common.ts';
import { homeEnUS, homePtBR } from './locales/home.ts';
import { contentEnUS, contentPtBR } from './locales/content.ts';
import { domainEnUS, domainPtBR } from './locales/domain.ts';
import { sharedEnUS, sharedPtBR } from './locales/shared.ts';
import { recoveryEnUS, recoveryPtBR } from './locales/recovery.ts';
import { authEnUS, authPtBR } from './locales/auth.ts';
import { accountEnUS, accountPtBR } from './locales/account.ts';
import { profileEnUS, profilePtBR } from './locales/profile.ts';
import { adminEnUS, adminPtBR } from './locales/admin.ts';

export const ptBR = { ...commonPtBR, ...homePtBR, ...contentPtBR, ...domainPtBR, ...sharedPtBR, ...recoveryPtBR, ...authPtBR, ...accountPtBR, ...profilePtBR, ...adminPtBR } as const;
export type TranslationKey = keyof typeof ptBR;
export type TranslationResource = { readonly [K in TranslationKey]: string };
export const enUS = { ...commonEnUS, ...homeEnUS, ...contentEnUS, ...domainEnUS, ...sharedEnUS, ...recoveryEnUS, ...authEnUS, ...accountEnUS, ...profileEnUS, ...adminEnUS } satisfies TranslationResource;
export const resources = { 'pt-BR': ptBR, 'en-US': enUS } as const;
export type SupportedLocale = keyof typeof resources;
