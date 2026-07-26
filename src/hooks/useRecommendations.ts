import { useCallback,useEffect,useState } from 'react';
import { RecommendationRepository,type Recommendation } from '../repositories/recommendations';
type Kind='problems'|'solutions'|'solutionProblems';
function useRecommendation(id:string,kind:Kind){const [items,setItems]=useState<Recommendation[]>([]);const [total,setTotal]=useState(0);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const load=useCallback(async(reset=false)=>{if(!RecommendationRepository)return;setLoading(true);setError('');const offset=reset?0:items.length;const result=kind==='problems'?await RecommendationRepository.relatedProblems(id,offset):kind==='solutions'?await RecommendationRepository.recommendedSolutions(id,offset):await RecommendationRepository.relatedProblemsForSolution(id,offset);if(result.ok){setItems(old=>reset?result.data.items:[...old,...result.data.items]);setTotal(result.data.total)}else setError(result.message);setLoading(false)},[id,kind,items.length]);useEffect(()=>{void load(true)},[id,kind]);return{items,total,loading,error,loadMore:()=>load(false)};}
export const useRelatedProblems=(id:string)=>useRecommendation(id,'problems');
export const useRecommendedSolutions=(id:string)=>useRecommendation(id,'solutions');
export const useRelatedProblemsForSolution=(id:string)=>useRecommendation(id,'solutionProblems');
