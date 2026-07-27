import { commonEnUS, commonPtBR } from './locales/common.ts';
import { homeEnUS, homePtBR } from './locales/home.ts';
import { contentEnUS, contentPtBR } from './locales/content.ts';
import { domainEnUS, domainPtBR } from './locales/domain.ts';

export const ptBR = { ...commonPtBR, ...homePtBR, ...contentPtBR, ...domainPtBR } as const;
export type TranslationKey = keyof typeof ptBR;
export type TranslationResource = { readonly [K in TranslationKey]: string };
export const enUS = { ...commonEnUS, ...homeEnUS, ...contentEnUS, ...domainEnUS } satisfies TranslationResource;
export const resources = { 'pt-BR': ptBR, 'en-US': enUS } as const;
export type SupportedLocale = keyof typeof resources;
