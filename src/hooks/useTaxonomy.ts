import { useCallback, useEffect, useState } from 'react';
import { TaxonomyRepository } from '../repositories/taxonomy';
import type { TaxonomyKind, TaxonomyScope, TaxonomyTerm } from '../types/taxonomy';
export function useTaxonomy(kind:TaxonomyKind,scope:TaxonomyScope,query=''){
 const [terms,setTerms]=useState<TaxonomyTerm[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const reload=useCallback(async()=>{setLoading(true);setError('');if(!TaxonomyRepository){setError('A taxonomia está indisponível.');setLoading(false);return;}const result=await TaxonomyRepository.list(kind,scope,query);if(result.ok)setTerms(result.data.items);else setError(result.message);setLoading(false)},[kind,scope,query]);
 useEffect(()=>{void reload()},[reload]); return {terms,loading,error,reload};
}
