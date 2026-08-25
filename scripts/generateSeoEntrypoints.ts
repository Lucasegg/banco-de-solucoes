import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const origin = 'https://www.bancodesolucoes.com.br';
const pages = [
  { path: 'problems', title: 'Problemas públicos | Banco de Soluções', description: 'Explore problemas públicos catalogados por comunidades e organizações.' },
  { path: 'solutions', title: 'Soluções públicas | Banco de Soluções', description: 'Explore soluções reutilizáveis para desafios reais.' },
  { path: 'mapa', title: 'Mapa público | Banco de Soluções', description: 'Visualize problemas públicos por localização aproximada.' },
  { path: 'about', title: 'Sobre | Banco de Soluções', description: 'Conheça a missão do Banco de Soluções e sua base aberta de conhecimento.' },
  { path: 'contact', title: 'Fale Conosco | Banco de Soluções', description: 'Entre em contato com a equipe do Banco de Soluções.' },
  { path: 'privacy', title: 'Política de Privacidade | Banco de Soluções', description: 'Leia como o Banco de Soluções trata dados pessoais e privacidade.' },
  { path: 'terms', title: 'Termos de Uso | Banco de Soluções', description: 'Consulte as regras de uso do Banco de Soluções.' },
  { path: 'lgpd', title: 'LGPD | Banco de Soluções', description: 'Conheça os canais e direitos relacionados à LGPD.' },
] as const;

const root = resolve(import.meta.dirname, '..');
const template = readFileSync(resolve(root, 'index.html'), 'utf8');

for (const page of pages) {
  const canonical = `${origin}/${page.path}/`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: page.title,
        description: page.description,
        inLanguage: 'pt-BR',
        isPartOf: { '@id': `${origin}/#website` },
        breadcrumb: { '@id': `${canonical}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: page.title.replace(' | Banco de Soluções', ''), item: canonical },
        ],
      },
    ],
  };
  const html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${page.description}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${page.title}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${page.description}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${page.title}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${page.description}" />`)
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">\n      ${JSON.stringify(structuredData, null, 2).replace(/\n/g, '\n      ')}\n    </script>`);
  const destination = resolve(root, page.path, 'index.html');
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, html);
}
