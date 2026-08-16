import { Hono } from 'hono';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AppEnv, AuthUser } from '../auth';
import { authRequired, hashPassword, jwtTtl, signToken, verifyPassword } from '../auth';
import { countUsers, createUserRow, getUserByEmail } from '../db';
import { genId } from '../util';

export const authRouter = new Hono<AppEnv>();

async function safeJson(c: Context<AppEnv>): Promise<any> {
  try {
    return (await c.req.json()) ?? {};
  } catch {
    return {};
  }
}

function sanitize(user: AuthUser) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function respondWithToken(c: Context<AppEnv>, user: AuthUser, status: ContentfulStatusCode) {
  const token = await signToken(user, c.env.JWT_SECRET, jwtTtl(c.env));
  return c.json({ token, user: sanitize(user) }, status);
}

authRouter.post('/register', async (c) => {
  try {
    const { name, email, password, invite } = await safeJson(c);
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail || typeof password !== 'string' || password.length < 6) {
      return c.json({ error: 'BAD_REQUEST', message: 'Email and a password of at least 6 characters are required.' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return c.json({ error: 'BAD_REQUEST', message: 'Invalid email address.' }, 400);
    }
    const existing = await getUserByEmail(c.env.DB, normalizedEmail);
    if (existing) {
      return c.json({ error: 'CONFLICT', message: 'An account with this email already exists.' }, 409);
    }
    const total = await countUsers(c.env.DB);
    const role = total === 0 ? 'ADMIN' : 'USER';
    const user = await createUserRow(c.env.DB, {
      id: genId('usr'),
      name: typeof name === 'string' ? name.trim().slice(0, 80) : null,
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
      role,
    });
    return await respondWithToken(c, user, 201);
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

authRouter.post('/login', async (c) => {
  try {
    const { email, password } = await safeJson(c);
    if (typeof email !== 'string' || typeof password !== 'string') {
      return c.json({ error: 'BAD_REQUEST', message: 'Email and password are required.' }, 400);
    }
    const user = await getUserByEmail(c.env.DB, email.trim().toLowerCase());
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return c.json({ error: 'UNAUTHORIZED', message: 'Invalid email or password.' }, 401);
    }
    return await respondWithToken(c, user, 200);
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

authRouter.get('/me', authRequired, (c) => {
  return c.json({ user: sanitize(c.get('user')) });
});

authRouter.post('/bootstrap', async (c) => {
  try {
    if (!c.env.ADMIN_EMAIL || !c.env.ADMIN_PASSWORD) {
      return c.json({ error: 'DISABLED', message: 'Bootstrap is not enabled.' }, 404);
    }
    const { email, password } = await safeJson(c);
    if (email !== c.env.ADMIN_EMAIL || password !== c.env.ADMIN_PASSWORD) {
      return c.json({ error: 'FORBIDDEN', message: 'Invalid bootstrap credentials.' }, 403);
    }
    if ((await countUsers(c.env.DB)) > 0) {
      return c.json({ error: 'CONFLICT', message: 'Users already exist.' }, 409);
    }
    const user = await createUserRow(c.env.DB, {
      id: genId('usr'),
      name: 'Admin',
      email: c.env.ADMIN_EMAIL,
      passwordHash: await hashPassword(c.env.ADMIN_PASSWORD),
      role: 'ADMIN',
    });
    return await respondWithToken(c, user, 201);
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});