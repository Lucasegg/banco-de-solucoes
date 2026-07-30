import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { mergeNotifications } from '../src/repositories/notifications/realtime.ts';
import type { NotificationItem } from '../src/types/notification.ts';

const migration=readFileSync('supabase/migrations/20260730140000_sprint45_notifications_realtime.sql','utf8');
const realtime=readFileSync('src/repositories/notifications/realtime.ts','utf8');
const translations=readFileSync('src/i18n/locales/engagement.ts','utf8');
const workflow=readFileSync('.github/workflows/deploy.yml','utf8');
const packageJson=readFileSync('package.json','utf8');
const item=(id:string,order:number,readAt:string|null=null):NotificationItem=>({id,actorId:null,actorName:'Sistema',type:'comment.created',title:'t',message:'m',targetType:null,targetId:null,actionUrl:null,metadata:{},readAt,createdAt:'2026-01-01',notificationOrder:order});

test('migration publishes idempotently and protects private RPCs',()=>{assert.match(migration,/not exists \([\s\S]*pg_publication_tables/);assert.match(migration,/force row level security/);assert.match(migration,/revoke all on table public\.notification_preferences/);for(const name of ['get_my_notification_preferences','update_my_notification_preferences','delete_my_old_read_notifications']){const body=migration.slice(migration.indexOf(`create function public.${name}`),migration.indexOf('$$;',migration.indexOf(`create function public.${name}`)));assert.match(body,/security definer set search_path = pg_catalog, public/);assert.match(body,/auth\.uid\(\)/);assert.doesNotMatch(body,/p_recipient_id/);}});
test('critical categories cannot be disabled and cleanup is scoped, read and 30 days old',()=>{assert.doesNotMatch(migration,/p_(security|reports|moderation)/);assert.match(migration,/n\.recipient_id=v_user_id[\s\S]*n\.read_at is not null[\s\S]*interval '30 days'/);});
test('merge deduplicates, orders and rejects stale unread updates',()=>{const read=item('a',1,'2026-02-01');const merged=mergeNotifications([item('b',2),read],item('a',1,null));assert.deepEqual(merged.map(x=>x.id),['b','a']);assert.equal(merged[1].readAt,'2026-02-01');assert.equal(mergeNotifications([item('a',1)],item('a',1)).length,1);});
test('subscription owns one filtered channel, polling and complete cleanup',()=>{assert.match(realtime,/if \(!this\.stopped\) return/);assert.match(realtime,/filter: `recipient_id=eq\.\$\{this\.userId\}`/);assert.match(realtime,/visibilityState !== 'visible'/);assert.match(realtime,/60_000/);assert.match(realtime,/removeChannel/);assert.match(realtime,/clearInterval/);assert.match(realtime,/SUBSCRIBED[\s\S]*stopPolling/);});
test('translations and CI cover both locales and Sprint 31/44 regressions',()=>{for(const key of ['preferencesTitle','cleanupConfirm','criticalAlwaysOn'])assert.equal(translations.match(new RegExp(`notifications\\.${key}`,'g'))?.length,2);assert.match(packageJson,/sprint31Notifications\.test\.ts/);assert.match(packageJson,/sprint44Notifications\.test\.ts/);assert.match(workflow,/test:sprint45/);});
