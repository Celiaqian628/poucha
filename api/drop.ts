import { supabase } from '../lib/supabase.js';
import { checkPublicToken, hashIp, getClientIp } from '../lib/auth.js';

export const config = { runtime: 'edge' };

const MAX_PER_IP_PER_DAY = 10;
const MBTI_LIST = ['INTJ','INTP','INFJ','INFP','ISTJ','ISTP','ISFJ','ISFP','ENTJ','ENTP','ENFJ','ENFP','ESTJ','ESTP','ESFJ','ESFP'];
const MOOD_LIST = ['blue','pink','yellow','green','purple'];

type Body = {
  token?: string;
  title?: string;
  excerpt?: string;
  pen_name?: string;
  mbti?: string;
  source?: string;
  tags?: string[];
  mood?: string;
  allow_claim?: boolean;
};

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return bad('method', 405);
  let body: Body;
  try { body = await req.json(); } catch { return bad('invalid json'); }

  if (!checkPublicToken(body.token || '')) return bad('forbidden', 403);

  // 字段校验
  const title   = (body.title   || '').trim();
  const excerpt = (body.excerpt || '').trim();
  const penName = (body.pen_name|| '').trim();
  const mbti    = (body.mbti    || '').trim().toUpperCase();
  const source  = (body.source  || '').trim();
  const mood    = (body.mood    || 'blue').trim();
  const tags    = Array.isArray(body.tags) ? body.tags.slice(0,8).map(t => String(t).trim().slice(0,12)).filter(Boolean) : [];

  if (title.length < 1 || title.length > 30)   return bad('title 长度 1-30 字');
  if (excerpt.length < 5 || excerpt.length > 300) return bad('excerpt 长度 5-300 字');
  if (penName.length < 1 || penName.length > 15)  return bad('pen_name 长度 1-15 字');
  if (mbti && !MBTI_LIST.includes(mbti))           return bad('mbti 非法');
  if (!MOOD_LIST.includes(mood))                    return bad('mood 非法');

  // 频控
  const ip = getClientIp(req);
  const ipHash = await hashIp(ip);
  const today = new Date().toISOString().slice(0, 10);
  const { count, error: countErr } = await supabase
    .from('feathers')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', today + 'T00:00:00Z');
  if (countErr) return bad('count failed: ' + countErr.message, 500);
  if ((count ?? 0) >= MAX_PER_IP_PER_DAY) return bad('今日投递已达上限', 429);

  const ua = req.headers.get('user-agent')?.slice(0, 200) || '';

  const { data, error } = await supabase.from('feathers').insert({
    title, excerpt, pen_name: penName,
    mbti: mbti || null,
    source: source || null,
    tags, mood,
    allow_claim: body.allow_claim !== false,
    status: 'pending',
    ip_hash: ipHash,
    user_agent: ua
  }).select('id').single();

  if (error) return bad('insert failed: ' + error.message, 500);

  // 审计
  await supabase.from('drop_log').insert({
    ip_hash: ipHash, action: 'drop', feather_id: data.id
  });

  return new Response(JSON.stringify({ ok: true, id: data.id }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
