import { useState, type ChangeEvent } from 'react';
import { useTaxonomy } from '../../hooks/useTaxonomy';
import type { TaxonomyKind, TaxonomyScope } from '../../types/taxonomy';
export function TaxonomySelect({kind,scope,value,onChange,label}:{kind:TaxonomyKind;scope:TaxonomyScope;value:string;onChange:(value:string)=>void;label:string}){
 const id=`taxonomy-${kind}-${scope}`,[query,setQuery]=useState('');const {terms,loading,error}=useTaxonomy(kind,scope,query);
 return <label htmlFor={id} className="grid gap-2 text-sm font-medium">{label}<input id={id} role="combobox" aria-autocomplete="list" aria-controls={`${id}-options`} aria-expanded={Boolean(terms.length)} value={value} onChange={(e:ChangeEvent<HTMLInputElement>)=>{onChange(e.target.value);setQuery(e.target.value)}} list={`${id}-options`} className="rounded-2xl border border-line p-3" disabled={loading}/><datalist id={`${id}-options`}>{terms.map(term=><option key={term.id} value={term.name}/>)}</datalist>{loading&&<span role="status">Carregando opções…</span>}{!loading&&!error&&!terms.length&&<span>Nenhum termo aprovado.</span>}{error&&<span role="alert" className="text-red-700">{error}</span>}</label>;
}
