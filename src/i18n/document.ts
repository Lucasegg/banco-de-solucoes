import { translate } from './core.ts';
import type { SupportedLocale } from './resources.ts';

type LocalizableDocument = {
  documentElement: { lang: string };
  title: string;
  querySelector(selector: string): { setAttribute(name: string, value: string): void } | null;
};

export function applyLocaleToDocument(document: LocalizableDocument, locale: SupportedLocale): void {
  document.documentElement.lang = locale;
  document.title = translate(locale, 'app.name');
  document.querySelector('meta[name="description"]')?.setAttribute('content', translate(locale, 'app.description'));
}
