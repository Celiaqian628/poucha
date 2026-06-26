import { supabase } from '../../lib/supabase.js';
import { checkAdminToken } from '../../lib/auth.js';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('t');
  const tokenFromHeader = req.headers.get('authorization');
  if (!checkAdminToken(tokenFromHeader || tokenFromQuery)) {
    return new Response('Forbidden', { status: 403 });
  }

  const { data, error } = await supabase
    .from('feathers')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ feathers: data || [] }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
