import type { ProblemCategory, ProblemStatus } from './domain';

export type GeolocationPrecision = 'exact' | 'street' | 'neighborhood' | 'city' | 'state';
export interface MapBounds { north: number; south: number; east: number; west: number }
export interface ProblemLocation { latitude: number; longitude: number; precision: GeolocationPrecision; source?: string }
export interface MapProblem { id: string; title: string; category: ProblemCategory; status: ProblemStatus; city: string; state: string; neighborhood?: string; location: ProblemLocation; updatedAt: string; verified: boolean }
export interface ProblemRegionSummary { state: string; city: string; totalProblems: number; inProgress: number; resolved: number; lastUpdated: string }
export interface MapFilters { status?: string; category?: string; state?: string; city?: string; neighborhood?: string; verifiedOnly?: boolean; recentlyUpdatedOnly?: boolean }

