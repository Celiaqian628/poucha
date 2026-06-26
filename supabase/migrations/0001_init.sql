-- 泼茶 · 初始化 schema
-- 在 Supabase Dashboard → SQL Editor 一次性执行

-- 主表
create table feathers (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  excerpt      text not null,
  pen_name     text not null,
  mbti         text,
  source       text,
  tags         text[] default '{}',
  mood         text check (mood in ('blue','pink','yellow','green','purple')),
  allow_claim  boolean default true,
  status       text default 'pending'
               check (status in ('pending','live','hidden','rejected')),
  ip_hash      text,
  user_agent   text,
  created_at   timestamptz default now(),
  approved_at  timestamptz,
  synced_dingding boolean default false
);
create index idx_feathers_status_created on feathers (status, created_at desc);
create index idx_feathers_ip_created on feathers (ip_hash, created_at);
create index idx_feathers_sync_pending on feathers (synced_dingding, approved_at) where synced_dingding = false and status = 'live';

-- 审计 + 频控（投递日志）
create table drop_log (
  id          bigserial primary key,
  ip_hash     text not null,
  action      text not null,
  feather_id  uuid references feathers(id),
  created_at  timestamptz default now()
);
create index idx_drop_log_ip_created on drop_log (ip_hash, created_at);

-- 关闭行级安全 的方式：开启 RLS 但不创建任何 policy，等于 anon 完全无权限
alter table feathers enable row level security;
alter table drop_log enable row level security;

-- 5 条种子吉光片羽（从原 SEED_FEATHERS 迁移）
insert into feathers (title, excerpt, pen_name, mbti, source, tags, mood, allow_claim, status, approved_at)
values
  ('夜路灯',   '昨晚加班回家，发现小区门口的路灯坏了一半。剩下那盏的光落在地上，像一片不愿离开的金色。',
   '河河', 'INFP', '《千千静千》· 读后感', array['治愈','晚归'], 'yellow', true, 'live', now()),
  ('地铁站',   '在地铁站看到一对老夫妻分着吃一个三明治，老爷爷把面包多的那一半给老奶奶。我突然想，这应该就是诗。',
   '小满', 'ENFJ', '日记 06.15', array['亲密','陌生人'], 'pink', false, 'live', now()),
  ('雨檐下',   '雨檐下的麻雀缩成一团，但它的眼睛是亮的。和我一样在等雨停，但只有它是真的等得起。',
   '慢慢', 'INTP', '《动物寓言》札记', array['自然','孤独'], 'green', true, 'live', now()),
  ('外婆',     '收拾旧物翻出外婆给我织的围巾，针脚松散到不像她的手艺，但暖。可能她当时已经看不清针眼了。',
   '阿茶', 'ISFJ', '日记 04.03', array['亲情','怀念'], 'blue', true, 'live', now()),
  ('凌晨三点', '写不出来。窗外有人在唱粤语老歌，跑调跑得理直气壮。我笑出声，又能写下去了。',
   '清玄', 'ENTP', '《创作笔记》', array['创作','深夜'], 'purple', true, 'live', now());
