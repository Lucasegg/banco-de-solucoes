export type TaxonomyKind = 'category' | 'tag';
export type TaxonomyScope = 'problem' | 'solution' | 'both';
export type TaxonomyTermStatus = 'approved' | 'deprecated';
export type TaxonomyProposalStatus = 'pending' | 'approved' | 'rejected';
export interface TaxonomyTerm { id:string; kind:TaxonomyKind; scope:TaxonomyScope; name:string; slug:string; totalCount:number }
export interface TaxonomyAlias { id:string; alias:string; normalizedAlias:string; termId:string }
export interface TaxonomyProposal { id:string; proposedName:string; normalizedName:string; kind:TaxonomyKind; scope:TaxonomyScope; justification:string; authorId:string; status:TaxonomyProposalStatus; reviewerId:string|null; decisionReason:string|null; createdAt:string; reviewedAt:string|null }
