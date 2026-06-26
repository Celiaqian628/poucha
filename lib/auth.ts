// Edge-runtime friendly: use Web Crypto API (globalThis.crypto.subtle), not node:crypto

const PUBLIC = process.env.PUBLIC_TOKEN || '';
const ADMIN  = process.env.ADMIN_TOKEN  || '';
const SALT   = process.env.SALT         || '';

export function checkPublicToken(token: string | null): boolean {
  if (!PUBLIC) return false;
  return !!token && token === PUBLIC;
}

export function checkAdminToken(authHeader: string | null): boolean {
  if (!ADMIN) return false;
  if (!authHeader) return false;
  const t = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  return t === ADMIN;
}

function bytesToHex(buf: ArrayBuffer): string {
  const a = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < a.length; i++) s += a[i].toString(16).padStart(2, '0');
  return s;
}

export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + ':' + SALT);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(buf).slice(0, 32);
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0]?.trim() || '0.0.0.0';
}
