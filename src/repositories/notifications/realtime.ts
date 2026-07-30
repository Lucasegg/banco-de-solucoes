import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

export type ConnectionState = 'connecting' | 'connected' | 'failed' | 'polling';
export interface NotificationSignal { recipient_id:string;notification_id:string;notification_order:number;change_type:'INSERT'|'UPDATE';signaled_at?:string }
export interface SubscriptionDependencies {
  client: Pick<SupabaseClient,'channel'|'removeChannel'>;
  document: Pick<Document,'visibilityState'|'addEventListener'|'removeEventListener'>;
  setInterval: typeof setInterval;
  clearInterval: typeof clearInterval;
}
const browserDependencies=(client:SupabaseClient):SubscriptionDependencies=>({client,document,setInterval,clearInterval});

/** Owns exactly one safe-signal channel and at most one fallback timer. */
export class NotificationRealtimeSubscription {
  private channel:RealtimeChannel|null=null;private timer:ReturnType<typeof setInterval>|null=null;
  private stopped=true;private healthy=false;
  private readonly deps:SubscriptionDependencies;
  private readonly userId:string;private readonly onSignal:(signal:NotificationSignal)=>void;private readonly reconcile:()=>void|Promise<void>;private readonly onState:(state:ConnectionState)=>void;private readonly pollMs:number;
  constructor(client:SupabaseClient,userId:string,onSignal:(signal:NotificationSignal)=>void,reconcile:()=>void|Promise<void>,onState:(state:ConnectionState)=>void,deps?:SubscriptionDependencies,pollMs=60_000){this.deps=deps??browserDependencies(client);this.userId=userId;this.onSignal=onSignal;this.reconcile=reconcile;this.onState=onState;this.pollMs=pollMs;}
  start(){if(!this.stopped)return;this.stopped=false;this.healthy=false;this.onState('connecting');this.deps.document.addEventListener('visibilitychange',this.visibilityChanged);this.channel=this.deps.client.channel(`notification-signals:${this.userId}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'notification_realtime_signals',filter:`recipient_id=eq.${this.userId}`},payload=>{const row=payload.new as unknown as NotificationSignal;if(row.recipient_id===this.userId)this.onSignal(row);}).subscribe(status=>{if(this.stopped)return;if(status==='SUBSCRIBED'){this.healthy=true;this.stopPolling();this.onState('connected');void this.reconcile();}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){this.healthy=false;this.onState('failed');this.startPolling();}});}
  stop(){if(this.stopped)return;this.stopped=true;this.healthy=false;this.deps.document.removeEventListener('visibilitychange',this.visibilityChanged);this.stopPolling();if(this.channel)void this.deps.client.removeChannel(this.channel);this.channel=null;}
  private visibilityChanged=()=>{if(this.deps.document.visibilityState==='visible'&&!this.healthy){void this.reconcile();this.startPolling();}else if(this.deps.document.visibilityState!=='visible')this.stopPolling();};
  private startPolling(){if(this.stopped||this.healthy||this.timer||this.deps.document.visibilityState!=='visible')return;this.onState('polling');void this.reconcile();this.timer=this.deps.setInterval(()=>void this.reconcile(),this.pollMs);}
  private stopPolling(){if(this.timer)this.deps.clearInterval(this.timer);this.timer=null;}
}
