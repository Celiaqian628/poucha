import { supabase } from '../../lib/supabase.js';
import { checkAdminToken } from '../../lib/auth.js';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('t');
  const tokenFromHeader = req.headers.get('authorization');
  if (!checkAdminToken(tokenFromHeader || tokenFromQuery)) {
    return new Response('Forbidden', { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch { return new Response('bad json', { status: 400 }); }
  const id = body?.id;
  if (!id) return new Response('id required', { status: 400 });

  const { error } = await supabase
    .from('feathers')
    .update({ status: 'live', approved_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending');
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  await supabase.from('drop_log').insert({ ip_hash: 'admin', action: 'approve', feather_id: id });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
