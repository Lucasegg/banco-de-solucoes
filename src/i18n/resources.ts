export const ptBR = {
  'app.name': 'Banco de Soluções',
  'app.tagline': 'Problemas conectados a ação',
  'app.description': 'Banco de Soluções — conhecimento compartilhado para desafios reais.',
  'language.label': 'Idioma da interface',
  'language.pt-BR': 'Português (Brasil)',
  'language.en-US': 'English',
  'nav.home': 'Início', 'nav.problems': 'Problemas', 'nav.map': 'Mapa', 'nav.solutions': 'Soluções',
  'nav.search': 'Buscar', 'nav.newProblem': 'Cadastrar problema', 'nav.newSolution': 'Cadastrar solução',
  'nav.about': 'Sobre', 'nav.favorites': 'Meus favoritos', 'nav.contributions': 'Contribuições',
  'nav.taxonomy': 'Taxonomia', 'nav.admin': 'Admin', 'nav.account': 'Conta', 'nav.profile': 'Perfil', 'nav.login': 'Entrar',
  'a11y.avatar': 'Avatar de {{name}}',
  'footer.openSource': 'Open source, colaborativo e preparado para dados reais.',
  'home.eyebrow': 'Base nacional de conhecimento colaborativo',
  'home.title': 'Conecte problemas reais a soluções que podem escalar.',
  'home.description': 'Registros cadastrados pela comunidade e informações públicas com proveniência verificável.',
  'home.exploreProblems': 'Explorar problemas', 'home.viewSolutions': 'Ver soluções',
  'home.region': 'Explore por região', 'home.regionTitle': 'Encontre problemas no território',
  'home.regionDescription': 'Pesquise cidade, estado, bairro e visualize somente os registros existentes.', 'home.openMap': 'Abrir mapa',
  'home.publishedProblems': 'Problemas publicados', 'home.catalogTitle': 'Catálogo com origem identificada',
  'home.loadingCatalog': 'Carregando catálogo', 'home.loadingRecords': 'Buscando registros publicados...',
  'home.noProblems': 'Nenhum problema publicado', 'home.noProblemsMessage': 'Ainda não há registros publicados nesta seção.',
  'home.publishedSolutions': 'Soluções publicadas', 'home.solutionsTitle': 'Soluções cadastradas pela comunidade',
  'home.loadingSolutions': 'Carregando soluções', 'home.loadingSolutionsMessage': 'Buscando soluções publicadas...',
  'home.noSolutions': 'Nenhuma solução publicada', 'home.noSolutionsMessage': 'Ainda não há registros publicados nesta seção.',
  'home.unavailable': 'O catálogo não está disponível sem uma conexão configurada.',
} as const;

export type TranslationKey = keyof typeof ptBR;
export type TranslationResource = { readonly [K in TranslationKey]: string };

export const enUS: TranslationResource = {
  'app.name': 'Solution Bank', 'app.tagline': 'Connecting problems to action',
  'app.description': 'Solution Bank — shared knowledge for real challenges.',
  'language.label': 'Interface language', 'language.pt-BR': 'Português (Brasil)', 'language.en-US': 'English',
  'nav.home': 'Home', 'nav.problems': 'Problems', 'nav.map': 'Map', 'nav.solutions': 'Solutions', 'nav.search': 'Search',
  'nav.newProblem': 'Submit a problem', 'nav.newSolution': 'Submit a solution', 'nav.about': 'About',
  'nav.favorites': 'My favorites', 'nav.contributions': 'Contributions', 'nav.taxonomy': 'Taxonomy', 'nav.admin': 'Admin',
  'nav.account': 'Account', 'nav.profile': 'Profile', 'nav.login': 'Sign in', 'a11y.avatar': '{{name}}\'s avatar',
  'footer.openSource': 'Open source, collaborative, and ready for real data.',
  'home.eyebrow': 'A nationwide collaborative knowledge base',
  'home.title': 'Connect real problems to solutions that can scale.',
  'home.description': 'Community submissions and public information with verifiable provenance.',
  'home.exploreProblems': 'Explore problems', 'home.viewSolutions': 'View solutions', 'home.region': 'Explore by region',
  'home.regionTitle': 'Find problems in your area', 'home.regionDescription': 'Search by city, state, or neighborhood and view existing records only.',
  'home.openMap': 'Open map', 'home.publishedProblems': 'Published problems', 'home.catalogTitle': 'A catalog with identified sources',
  'home.loadingCatalog': 'Loading catalog', 'home.loadingRecords': 'Fetching published records...',
  'home.noProblems': 'No published problems', 'home.noProblemsMessage': 'There are no published records in this section yet.',
  'home.publishedSolutions': 'Published solutions', 'home.solutionsTitle': 'Community-submitted solutions',
  'home.loadingSolutions': 'Loading solutions', 'home.loadingSolutionsMessage': 'Fetching published solutions...',
  'home.noSolutions': 'No published solutions', 'home.noSolutionsMessage': 'There are no published records in this section yet.',
  'home.unavailable': 'The catalog is unavailable without a configured connection.',
};

export const resources = { 'pt-BR': ptBR, 'en-US': enUS } as const;
export type SupportedLocale = keyof typeof resources;
