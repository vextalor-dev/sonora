import type { Context, Next } from 'hono';
import type { Env } from './env';
import { getUserById } from './db';

export type Role = 'USER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

export interface AppEnv {
  Bindings: Env;
  Variables: { user: AuthUser };
}

const encoder = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  let t = s.replace(/-/g, '+').replace(/_/g, '/');
  while (t.length % 4) t += '=';
  const bin = atob(t);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pbkdf2(plain: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(plain), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await pbkdf2(plain, salt, 100_000);
  return `pbkdf2$100000$${b64url(salt)}$${b64url(bits)}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations < 1) return false;
  try {
    const salt = b64urlDecode(parts[2]);
    const expected = b64urlDecode(parts[3]);
    const actual = await pbkdf2(plain, salt, iterations);
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}

export function jwtTtl(env: Env): number {
  const n = parseInt(env.JWT_EXPIRES ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 2592000;
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return b64url(new Uint8Array(sig));
}

export interface TokenPayload {
  sub: string;
  role: Role;
}

export async function signToken(user: AuthUser, secret: string, ttlSeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = b64url(
    encoder.encode(JSON.stringify({ sub: user.id, email: user.email, role: user.role, iat: now, exp: now + ttlSeconds })),
  );
  const sig = await hmac(secret, `${header}.${payload}`);
  return `${header}.${payload}.${sig}`;
}

export async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const sig = await hmac(secret, `${parts[0]}.${parts[1]}`);
  if (sig !== parts[2]) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])));
    if (typeof payload.sub !== 'string' || (payload.role !== 'USER' && payload.role !== 'ADMIN')) return null;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export function tokenFromRequest(c: Context<AppEnv>): string | null {
  const header = c.req.header('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const t = c.req.query('token');
  return typeof t === 'string' && t ? t : null;
}

export const authRequired = async (c: Context<AppEnv>, next: Next) => {
  const token = tokenFromRequest(c);
  const payload = token ? await verifyToken(token, c.env.JWT_SECRET) : null;
  if (!payload) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Authentication required.' }, 401);
  }
  const user = await getUserById(c.env.DB, payload.sub);
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED', message: 'User no longer exists.' }, 401);
  }
  c.set('user', user);
  await next();
};

export const streamAuth = async (c: Context<AppEnv>, next: Next) => {
  const token = tokenFromRequest(c);
  const payload = token ? await verifyToken(token, c.env.JWT_SECRET) : null;
  if (!payload) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Invalid or expired token.' }, 401);
  }
  const user = await getUserById(c.env.DB, payload.sub);
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED', message: 'User no longer exists.' }, 401);
  }
  c.set('user', user);
  await next();
};

export const adminGate = async (c: Context<AppEnv>, next: Next) => {
  const user = c.get('user');
  if (user.role !== 'ADMIN') {
    return c.json({ error: 'FORBIDDEN', message: 'Admin access required.' }, 403);
  }
  await next();
};