import { createHash } from 'node:crypto';

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
  // 支持 "Bearer xxx" 或裸 token
  const t = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  return t === ADMIN;
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip + ':' + SALT).digest('hex').slice(0, 32);
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0]?.trim() || '0.0.0.0';
}
