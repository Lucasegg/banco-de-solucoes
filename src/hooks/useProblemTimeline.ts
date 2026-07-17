import { useCallback, useEffect, useState } from 'react';
import { ProblemTimelineRepository } from '../repositories/problemTimeline';
import type { ProblemTimelineEvent } from '../types/problemTimeline';

export function useProblemTimeline(problemId:string) {
  const [events,setEvents]=useState<ProblemTimelineEvent[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const reload=useCallback(async()=>{setLoading(true);setError('');if(!ProblemTimelineRepository){setEvents([]);setLoading(false);return;}const result=await ProblemTimelineRepository.list(problemId);if(result.ok)setEvents(result.data);else setError(result.message);setLoading(false);},[problemId]);
  useEffect(()=>{void reload();},[reload]);
  return {events,loading,error,reload};
}
