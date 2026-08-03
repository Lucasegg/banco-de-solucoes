const pageToHashPath: Record<string, string> = {
  home: '/', problemas: '/problems', solucoes: '/solutions', 'novo-problema': '/problems/new', 'nova-solucao': '/solutions/new',
  sobre: '/about', login: '/login', register: '/register', 'password-recovery': '/password-recovery', profile: '/profile',
  contributions: '/contributions', favorites: '/favorites', diagnostics: '/diagnostics', account: '/account', 'mfa-challenge': '/mfa-challenge',
  admin: '/admin', 'admin-system': '/admin/system', 'admin-users': '/admin/users', 'admin-problems': '/admin/problems',
  'admin-solutions': '/admin/solutions', 'admin-comments': '/admin/comments', 'admin-reports': '/admin/reports', 'admin-audit': '/admin/audit',
  'admin-contributions': '/admin/contributions', 'admin-taxonomy': '/admin/taxonomy', notifications: '/notifications', mapa: '/mapa',
  search: '/search', contact: '/contact', privacy: '/privacy', terms: '/terms', lgpd: '/lgpd',
};

export function pageFromHash(hash: string): string {
  const path = (hash.replace(/^#/, '') || '/').split('?')[0];
  if (path === '/problems') return 'problemas';
  if (path === '/problems/new') return 'novo-problema';
  if (path.startsWith('/problems/')) return `problema:${path.replace('/problems/', '')}`;
  if (path === '/solutions') return 'solucoes';
  if (path === '/solutions/new') return 'nova-solucao';
  if (path.startsWith('/solutions/')) return `solucao:${path.replace('/solutions/', '')}`;
  const aliases: Record<string, string> = { '/notifications': 'notifications', '/notificacoes': 'notifications' };
  if (aliases[path]) return aliases[path];
  const match = Object.entries(pageToHashPath).find(([, route]) => route === path);
  if (match) return match[0];
  if (path.startsWith('/contributions/')) return `contribution:${path.replace('/contributions/', '')}`;
  if (path.startsWith('/members/')) {
    try { return `member:${decodeURIComponent(path.replace('/members/', ''))}`; } catch { return 'invalid-route'; }
  }
  return 'home';
}

export function hashFromPage(page: string): string {
  if (page.startsWith('problema:')) return `#/problems/${page.replace('problema:', '')}`;
  if (page.startsWith('solucao:')) return `#/solutions/${page.replace('solucao:', '')}`;
  if (page.startsWith('contribution:')) return `#/contributions/${page.replace('contribution:', '')}`;
  if (page.startsWith('member:')) return `#/members/${encodeURIComponent(page.replace('member:', ''))}`;
  return `#${pageToHashPath[page] ?? '/'}`;
}
