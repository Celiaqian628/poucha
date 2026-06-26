import { supabase } from '../../lib/supabase.js';
import { appendFeathers } from '../../lib/dingtalk.js';

export const config = { runtime: 'edge' };

// Vercel Cron 触发时会在 header 里带 CRON_SECRET（自动注入）
export default async function handler(req: Request) {
  const auth = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (process.env.CRON_SECRET && auth !== expected) {
    return new Response('Forbidden', { status: 403 });
  }

  // 拉取还没同步的 live 纸条
  const { data, error } = await supabase
    .from('feathers')
    .select('id,title,excerpt,pen_name,mbti,source,tags,mood,allow_claim')
    .eq('status', 'live')
    .eq('synced_dingding', false)
    .order('approved_at', { ascending: true })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!data || data.length === 0) {
    return new Response(JSON.stringify({ synced: 0, note: 'no pending' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    await appendFeathers(data.map(r => ({
      title: r.title,
      excerpt: r.excerpt,
      pen_name: r.pen_name,
      mbti: r.mbti,
      source: r.source,
      tags: r.tags || [],
      mood: r.mood,
      allow_claim: r.allow_claim
    })));
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  const ids = data.map(r => r.id);
  await supabase
    .from('feathers')
    .update({ synced_dingding: true })
    .in('id', ids);

  return new Response(JSON.stringify({ synced: data.length }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
