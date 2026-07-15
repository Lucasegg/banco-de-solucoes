export type ImpactLevel = 'local' | 'regional' | 'national' | 'global';
export type ProblemStatus = 'Aberto' | 'Em andamento' | 'Resolvido';
export type SolutionStatus = 'Proposta' | 'Em teste' | 'Implementada' | 'Validada' | 'Arquivada';
export type SolutionMaturityLevel = 'Ideia' | 'Protótipo' | 'Piloto' | 'Em operação' | 'Escalável';
export type ImplementationDifficulty = 'Baixa' | 'Média' | 'Alta';
export type ProblemCategory =
  | 'Infraestrutura'
  | 'Educação'
  | 'Saúde'
  | 'Segurança'
  | 'Tecnologia'
  | 'Mobilidade'
  | 'Meio Ambiente'
  | 'Assistência Social'
  | 'Empreendedorismo'
  | 'Outros';

export type SolutionCategory = ProblemCategory;

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
  authorId?: string;
  status: ProblemStatus;
  views: number;
  likes: number;
  comments: number;
  impactLevel: ImpactLevel;
  tags: string[];
}

export interface SolutionVersion {
  id: string;
  solutionId: string;
  version: string;
  summary: string;
  changes: string[];
  createdAt: string;
  author: string;
}

export type EvidenceType = 'Relatório' | 'Pesquisa' | 'Indicador' | 'Repositório' | 'Notícia';

export interface Evidence {
  id: string;
  solutionId: string;
  title: string;
  type: EvidenceType;
  url: string;
  description: string;
}

export interface CaseStudy {
  id: string;
  solutionId: string;
  city: string;
  country: string;
  organization: string;
  results: string;
  before: string;
  after: string;
  photos: string[];
}

export interface Improvement {
  id: string;
  solutionId: string;
  title: string;
  summary: string;
  evidenceIds: string[];
  caseStudyIds: string[];
}

export interface Solution {
  id: string;
  title: string;
  summary: string;
  description: string;
  category: SolutionCategory;
  image: string;
  organization: string;
  author: string;
  authorId?: string;
  createdAt: string;
  updatedAt: string;
  status: SolutionStatus;
  maturityLevel: SolutionMaturityLevel;
  implementationDifficulty: ImplementationDifficulty;
  estimatedCost: string;
  implementationTime: string;
  location: string;
  country: string;
  impactMetric: string;
  likes: number;
  comments: number;
  views: number;
  relatedProblemIds: string[];
  tags: string[];
  evidenceLinks: string[];
}

export type { ProblemRow } from '../repositories/problems/ProblemRepository';
export type { SolutionRow } from '../repositories/solutions/SolutionRepository';
