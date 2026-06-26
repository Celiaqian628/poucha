import { supabase } from '../lib/supabase.js';
import { checkPublicToken } from '../lib/auth.js';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || url.searchParams.get('t');
  if (!checkPublicToken(token)) {
    return new Response('Forbidden', { status: 403 });
  }

  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const { data, error } = await supabase
    .from('feathers')
    .select('id,title,excerpt,pen_name,mbti,source,tags,mood,allow_claim,approved_at,created_at')
    .eq('status', 'live')
    .order('approved_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ feathers: data || [] }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}
