export type ImpactLevel = 'local' | 'regional' | 'national' | 'global';
export type Maturity = 'ideia' | 'piloto' | 'validada' | 'escala';
export type ProblemStatus = 'Aberto' | 'Em andamento' | 'Resolvido';
export type ProblemCategory =
  | 'Infraestrutura'
  | 'Educação'
  | 'Saúde'
  | 'Segurança'
  | 'Tecnologia'
  | 'Mobilidade'
  | 'Meio Ambiente'
  | 'Assistência Social'
  | 'Outros';

export interface Problem {
  id: string;
  title: string;
  summary: string;
  description: string;
  category: ProblemCategory;
  city: string;
  state: string;
  country: string;
  image: string;
  createdAt: string;
  author: string;
  status: ProblemStatus;
  views: number;
  likes: number;
  comments: number;
  impactLevel: ImpactLevel;
  tags: string[];
  relatedSolutionIds: string[];
}

export interface Solution {
  id: string;
  title: string;
  summary: string;
  description: string;
  maturity: Maturity;
  organization: string;
  impactMetric: string;
  tags: string[];
  relatedProblemIds: string[];
  createdAt: string;
}
