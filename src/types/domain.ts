export type ImpactLevel = 'local' | 'regional' | 'national' | 'global';
export type Maturity = 'ideia' | 'piloto' | 'validada' | 'escala';

export interface Problem {
  id: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  region: string;
  impactLevel: ImpactLevel;
  tags: string[];
  relatedSolutionIds: string[];
  owner: string;
  createdAt: string;
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
