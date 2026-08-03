import type { Badge, BadgeLevel, UserReputation } from '../../types/discussion.ts';
import type { RepositoryResult } from '../problems/ProblemRepository.ts';

const metadata: Record<string, { title: string; description: string; level: BadgeLevel }> = {
 active_voice:{title:'Voz ativa',description:'Publicou o primeiro comentário válido.',level:'bronze'}, supported_idea:{title:'Ideia apoiada',description:'Recebeu pelo menos três reações válidas.',level:'silver'}, best_answer:{title:'Melhor resposta',description:'Teve uma resposta marcada como melhor.',level:'gold'}, frequent_collaborator:{title:'Colaborador frequente',description:'Participou de pelo menos cinco discussões.',level:'silver'}, community_expert:{title:'Especialista da comunidade',description:'Alcançou 250 pontos de reputação.',level:'gold'},
};
function record(value:unknown):value is Record<string,unknown>{return Boolean(value)&&typeof value==='object'&&!Array.isArray(value)}
function count(value:unknown):value is number{return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0}
function badge(value:unknown):Badge|null{if(!record(value)||typeof value.key!=='string'||typeof value.earnedAt!=='string'||!Number.isFinite(Date.parse(value.earnedAt)))return null;const item=metadata[value.key];return item?{id:value.key,...item,earnedAt:value.earnedAt}:null}
export function parseReputations(value:unknown):RepositoryResult<UserReputation[]>{
 if(!Array.isArray(value))return{ok:false,message:'Não foi possível interpretar a reputação.'};const output:UserReputation[]=[];
 for(const row of value){if(!record(row)||typeof row.user_id!=='string'||!count(row.points)||!count(row.active_comments)||!count(row.reactions_received)||!count(row.best_answers)||!count(row.discussions_participated)||!Array.isArray(row.achievements))return{ok:false,message:'Não foi possível interpretar a reputação.'};const badges=row.achievements.map(badge);if(badges.some(item=>item===null))return{ok:false,message:'Não foi possível interpretar a reputação.'};output.push({userId:row.user_id,points:row.points,comments:row.active_comments,reactionsReceived:row.reactions_received,bestAnswers:row.best_answers,discussions:row.discussions_participated,badges:badges as Badge[]})}return{ok:true,data:output};
}
