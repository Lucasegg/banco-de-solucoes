import { OFFICIAL_ORIGIN } from './version.ts';
import { publicPagePaths } from './routing/hashRouter.ts';

export type SeoEntry = { title: string; description: string; index: boolean };
const fallback: SeoEntry = { title: 'Banco de Soluções', description: 'Banco de Soluções — conhecimento compartilhado para desafios reais.', index: true };

export const publicSeo: Record<string, SeoEntry> = {
  home: { ...fallback, index: true },
  problemas: { title: 'Problemas públicos | Banco de Soluções', description: 'Explore problemas públicos catalogados por comunidades e organizações.', index: true },
  solucoes: { title: 'Soluções públicas | Banco de Soluções', description: 'Explore soluções reutilizáveis para desafios reais.', index: true },
  mapa: { title: 'Mapa público | Banco de Soluções', description: 'Visualize problemas públicos por localização aproximada.', index: true },
  sobre: { title: 'Sobre | Banco de Soluções', description: 'Conheça a missão do Banco de Soluções e sua base aberta de conhecimento.', index: true },
  contact: { title: 'Fale Conosco | Banco de Soluções', description: 'Entre em contato com a equipe do Banco de Soluções.', index: true },
  privacy: { title: 'Política de Privacidade | Banco de Soluções', description: 'Leia como o Banco de Soluções trata dados pessoais e privacidade.', index: true },
  terms: { title: 'Termos de Uso | Banco de Soluções', description: 'Consulte as regras de uso do Banco de Soluções.', index: true },
  lgpd: { title: 'LGPD | Banco de Soluções', description: 'Conheça os canais e direitos relacionados à LGPD.', index: true },
};

export function seoForPage(page: string): SeoEntry {
  return publicSeo[page] ?? { ...fallback, index: false };
}

export function canonicalForPage(page: string): string {
  return `${OFFICIAL_ORIGIN}${publicPagePaths[page] ?? '/'}`;
}

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) { element = document.createElement('meta'); document.head.appendChild(element); }
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
}

export function applySeo(page: string) {
  const seo = seoForPage(page);
  const canonical = canonicalForPage(page);
  document.title = seo.title;
  upsertMeta('meta[name="description"]', { name: 'description', content: seo.description });
  upsertMeta('meta[name="robots"]', { name: 'robots', content: seo.index ? 'index,follow' : 'noindex,follow' });
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
  link.href = canonical;
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: seo.title });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: seo.description });
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary' });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: seo.title });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: seo.description });
}
