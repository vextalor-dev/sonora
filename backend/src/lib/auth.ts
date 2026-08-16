import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { prisma } from './prisma.js';

export type Role = 'USER' | 'ADMIN';

const JWT_SECRET = process.env.JWT_SECRET || 'sonora-dev-secret-change-me';
const JWT_EXPIRES = '30d';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });
}

export function verifyToken(token: string): { sub: string; role: Role } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string; role: Role };
  } catch {
    return null;
  }
}

export function authRequired() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
    }
    const payload = verifyToken(header.slice(7));
    if (!payload) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired token.' });
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'User no longer exists.' });
    }
    (req as any).user = user;
    next();
  };
}

export function adminRequired() {
  return async (req: Request, res: Response, next: NextFunction) => {
    await authRequired()(req, res, () => {
      const user = (req as any).user;
      if (user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Admin access required.' });
      }
      next();
    });
  };
}

/**
 * Auth for the streaming route: the browser <audio> element cannot send
 * Authorization headers, so we also accept a one-off token via query string.
 * Tokens expire after 30 days and are only honored on this route.
 */
export function streamAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    let token: string | null = null;
    if (header?.startsWith('Bearer ')) token = header.slice(7);
    else if (typeof req.query.token === 'string') token = req.query.token;
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired token.' });
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'User no longer exists.' });
    }
    (req as any).user = user;
    next();
  };
}