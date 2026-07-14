import type { MockUser, UserAchievement, UserStats } from '../types/user';

export const defaultAchievements: UserAchievement[] = [
  {
    id: 'primeira-contribuicao',
    title: 'Primeira contribuição',
    description: 'Publicou ou salvou sua primeira iniciativa no Banco de Soluções.',
    level: 'bronze',
    unlockedAt: '2026-01-12',
  },
  {
    id: 'conector-local',
    title: 'Conector local',
    description: 'Ajudou a conectar problemas e soluções em seu território.',
    level: 'silver',
    unlockedAt: '2026-03-04',
  },
  {
    id: 'impacto-validado',
    title: 'Impacto validado',
    description: 'Contribuiu com evidências para uma solução implementada.',
    level: 'gold',
    unlockedAt: '2026-05-20',
  },
];

export const defaultStats: UserStats = {
  problemsSubmitted: 4,
  solutionsSubmitted: 3,
  favoritesSaved: 12,
  contributionsReviewed: 8,
  impactScore: 86,
};

export const mockUsers: MockUser[] = [
  {
    id: 'user-marina-costa',
    name: 'Marina Costa',
    email: 'marina@bancodesolucoes.dev',
    password: 'solucoes123',
    role: 'Gestora de inovação social',
    organization: 'Rede Cidadã',
    city: 'Recife',
    state: 'PE',
    bio: 'Mapeia desafios urbanos e aproxima comunidades de soluções replicáveis.',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80',
    createdAt: '2026-01-10',
    stats: defaultStats,
    achievements: defaultAchievements,
    settings: {
      emailNotifications: true,
      publicProfile: true,
      weeklyDigest: true,
    },
  },
  {
    id: 'user-diego-lima',
    name: 'Diego Lima',
    email: 'diego@bancodesolucoes.dev',
    password: 'impacto123',
    role: 'Analista de políticas públicas',
    organization: 'Observatório Urbano',
    city: 'São Paulo',
    state: 'SP',
    bio: 'Organiza evidências e indicadores para apoiar decisões públicas colaborativas.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
    createdAt: '2026-02-18',
    stats: {
      problemsSubmitted: 2,
      solutionsSubmitted: 5,
      favoritesSaved: 9,
      contributionsReviewed: 14,
      impactScore: 92,
    },
    achievements: defaultAchievements.slice(0, 2),
    settings: {
      emailNotifications: true,
      publicProfile: false,
      weeklyDigest: true,
    },
  },
];
