export type PublicActivityKind = 'problem' | 'solution' | 'comment' | 'contribution';
export type PublicMemberProfile = {
  userId: string; username: string; displayName: string; avatarUrl: string | null; bio: string | null;
  organization: string | null; city: string | null; state: string | null; country: string | null;
  website: string | null; role: string; joinedAt: string;
  metrics: { reputation: number; comments: number; discussions: number; reactionsReceived: number; bestAnswers: number; problems: number; solutions: number; approvedContributions: number };
  achievements: { key: 'active_voice' | 'supported_idea' | 'best_answer' | 'frequent_collaborator' | 'community_expert'; earnedAt: string }[];
  activity: { kind: PublicActivityKind; id: string; title: string; occurred_at: string }[];
};
export type PublicProfilePayload = { status: 'public'; profile: PublicMemberProfile } | { status: 'not_found' } | { status: 'private' };

const achievementKeys = new Set(['active_voice','supported_idea','best_answer','frequent_collaborator','community_expert']);
const activityKinds = new Set(['problem','solution','comment','contribution']);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const string = (value: unknown): value is string => typeof value === 'string';
const nullableString = (value: unknown): value is string | null => value === null || string(value);
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const date = (value: unknown): value is string => string(value) && !Number.isNaN(Date.parse(value));
function safeWebsite(value:string|null){if(!value)return true;try{const url=new URL(value);return (url.protocol==='http:'||url.protocol==='https:')&&Boolean(url.hostname);}catch{return false;}}

export function parsePublicMemberProfile(value: unknown): { ok: true; data: PublicProfilePayload } | { ok: false } {
  if (!record(value) || !string(value.status)) return { ok:false };
  if (value.status === 'not_found' || value.status === 'private') return Object.keys(value).length === 1 ? { ok:true,data:{ status:value.status } } : { ok:false };
  if (value.status !== 'public' || !record(value.profile)) return { ok:false };
  const p=value.profile,m=p.metrics;
  if (!string(p.userId)||!string(p.username)||!string(p.displayName)||!nullableString(p.avatarUrl)||!nullableString(p.bio)||!nullableString(p.organization)||!nullableString(p.city)||!nullableString(p.state)||!nullableString(p.country)||!nullableString(p.website)||!string(p.role)||!date(p.joinedAt)||!record(m)) return {ok:false};
  const metricKeys=['reputation','comments','discussions','reactionsReceived','bestAnswers','problems','solutions','approvedContributions'];
  if (!metricKeys.every(k=>count(m[k]))||!Array.isArray(p.achievements)||!p.achievements.every(a=>record(a)&&string(a.key)&&achievementKeys.has(a.key)&&date(a.earnedAt))||!Array.isArray(p.activity)||p.activity.length>20||!p.activity.every(a=>record(a)&&string(a.kind)&&activityKinds.has(a.kind)&&string(a.id)&&string(a.title)&&date(a.occurred_at))) return {ok:false};
  if (!safeWebsite(p.website)) return {ok:false};
  return {ok:true,data:value as PublicProfilePayload};
}

export function publicProfilePage(username: string) { return `member:${username.trim().toLowerCase()}`; }
