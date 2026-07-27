import { useCallback, useEffect, useRef, useState } from 'react';
import { TaxonomyRepository } from '../repositories/taxonomy';
import type { TaxonomyKind, TaxonomyProposal, TaxonomyScope, TaxonomyTerm } from '../types/taxonomy';

export function useTaxonomy(kind:TaxonomyKind,scope:TaxonomyScope,query=''){
 const [terms,setTerms]=useState<TaxonomyTerm[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const version=useRef(0);
 const reload=useCallback(async()=>{const request=++version.current;setLoading(true);setError('');if(!TaxonomyRepository){setError('A taxonomia está indisponível.');setLoading(false);return;}const result=await TaxonomyRepository.list(kind,scope,query);if(request!==version.current)return;if(result.ok)setTerms(result.data.items);else setError(result.message);setLoading(false)},[kind,scope,query]);
 useEffect(()=>{const timer=window.setTimeout(()=>void reload(),250);return()=>{window.clearTimeout(timer);version.current++}},[reload]);
 return {terms,loading,error,retry:reload,isApproved:(value:string)=>terms.some(term=>term.name===value)};
}

export function useTaxonomyProposals(mode:'mine'|'queue'='mine'){
 const [items,setItems]=useState<TaxonomyProposal[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[submitting,setSubmitting]=useState(false);const version=useRef(0);
 const reload=useCallback(async()=>{const request=++version.current;setLoading(true);setError('');const result=mode==='mine'?await TaxonomyRepository?.mine():await TaxonomyRepository?.queue();if(request!==version.current)return;if(result?.ok)setItems(result.data);else setError(result?.message??'A taxonomia está indisponível.');setLoading(false)},[mode]);
 useEffect(()=>{void reload();return()=>{version.current++}},[reload]);
 const propose=async(name:string,kind:TaxonomyKind,scope:TaxonomyScope,reason:string)=>{if(submitting)return {ok:false as const,message:'Aguarde o envio atual.'};setSubmitting(true);const result=await TaxonomyRepository?.propose(name,kind,scope,reason)??{ok:false as const,message:'A taxonomia está indisponível.'};setSubmitting(false);if(result.ok){setMessage('Sugestão enviada para moderação.');await reload()}return result};
 const review=async(id:string,decision:'approved'|'rejected',reason:string)=>{if(submitting)return {ok:false as const,message:'Aguarde a revisão atual.'};setSubmitting(true);const result=await TaxonomyRepository?.review(id,decision,reason)??{ok:false as const,message:'A taxonomia está indisponível.'};setSubmitting(false);if(result.ok){setMessage('Revisão registrada.');await reload()}return result};
 return {items,loading,error,message,submitting,retry:reload,propose,review};
}
