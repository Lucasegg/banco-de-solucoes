import type { BadgeLevel, ReputationAchievementKey, ReputationBadge, UserReputation } from '../../types/discussion.ts';
import type { RepositoryResult } from '../problems/ProblemRepository.ts';

export const REPUTATION_ACHIEVEMENT_LEVELS: Record<ReputationAchievementKey, BadgeLevel> = {
 active_voice:'bronze', supported_idea:'silver', best_answer:'gold', frequent_collaborator:'silver', community_expert:'gold',
};
function record(value:unknown):value is Record<string,unknown>{return Boolean(value)&&typeof value==='object'&&!Array.isArray(value)}
function count(value:unknown):value is number{return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0}
function badge(value:unknown):ReputationBadge|null{if(!record(value)||typeof value.key!=='string'||typeof value.earnedAt!=='string'||!Number.isFinite(Date.parse(value.earnedAt)))return null;if(!(value.key in REPUTATION_ACHIEVEMENT_LEVELS))return null;const id=value.key as ReputationAchievementKey;return{id,level:REPUTATION_ACHIEVEMENT_LEVELS[id],earnedAt:value.earnedAt}}
export function parseReputations(value:unknown):RepositoryResult<UserReputation[]>{
 if(!Array.isArray(value))return{ok:false,message:'Não foi possível interpretar a reputação.'};const output:UserReputation[]=[];
 for(const row of value){if(!record(row)||typeof row.user_id!=='string'||!count(row.points)||!count(row.active_comments)||!count(row.reactions_received)||!count(row.best_answers)||!count(row.discussions_participated)||!Array.isArray(row.achievements))return{ok:false,message:'Não foi possível interpretar a reputação.'};const badges=row.achievements.map(badge);if(badges.some(item=>item===null))return{ok:false,message:'Não foi possível interpretar a reputação.'};output.push({userId:row.user_id,points:row.points,comments:row.active_comments,reactionsReceived:row.reactions_received,bestAnswers:row.best_answers,discussions:row.discussions_participated,badges:badges as ReputationBadge[]})}return{ok:true,data:output};
}
