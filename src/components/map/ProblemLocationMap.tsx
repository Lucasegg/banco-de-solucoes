import { useEffect, useState } from 'react';
import { mapRepository } from '../../repositories/map';
import type { MapProblem } from '../../types/map';
import { PublicProblemMap } from './PublicProblemMap';
import { useTranslation } from '../../i18n/I18nProvider';
export function ProblemLocationMap({problemId,onOpen}:{problemId:string;onOpen:(id:string)=>void}){const {t}=useTranslation();const [problem,setProblem]=useState<MapProblem|null>(null);useEffect(()=>{let active=true;void mapRepository.getProblemLocation(problemId).then(result=>{if(active&&result.ok)setProblem(result.data)});return()=>{active=false}},[problemId]);if(!problem)return null;const lat=problem.location.latitude,lon=problem.location.longitude;return <section className="mt-8" aria-label={t('map.problemLocation')}><h2 className="mb-3 text-xl font-semibold">{t('map.location')}</h2>{problem.location.precision!=='exact'&&<p className="mb-3 text-sm font-semibold text-amber-800">{t('map.approximate')}</p>}<PublicProblemMap compact problems={[problem]} bounds={{north:lat+2,south:lat-2,east:lon+2,west:lon-2}} onOpen={onOpen}/></section>}
