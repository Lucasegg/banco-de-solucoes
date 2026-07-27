import { commonEnUS, commonPtBR } from './locales/common.ts';
import { homeEnUS, homePtBR } from './locales/home.ts';

export const ptBR = { ...commonPtBR, ...homePtBR } as const;
export type TranslationKey = keyof typeof ptBR;
export type TranslationResource = { readonly [K in TranslationKey]: string };
export const enUS = { ...commonEnUS, ...homeEnUS } satisfies TranslationResource;
export const resources = { 'pt-BR': ptBR, 'en-US': enUS } as const;
export type SupportedLocale = keyof typeof resources;
