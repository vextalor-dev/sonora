import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword, signToken, authRequired } from '../lib/auth.js';
import type { Role } from '../lib/auth.js';

export const authRouter: Router = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password, invite = '' } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || password.length < 6) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Email and a password of at least 6 characters are required.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid email address.' });
    }
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: 'CONFLICT', message: 'An account with this email already exists.' });
    }
    // First registered account becomes the admin; others can be promoted later.
    const total = await prisma.user.count();
    const role = total === 0 ? 'ADMIN' : 'USER';
    const user = await prisma.user.create({
      data: {
        name: typeof name === 'string' ? name.trim().slice(0, 80) : null,
        email: normalizedEmail,
        passwordHash: await hashPassword(password),
        role,
      },
    });
    const token = signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
    });
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[auth] register error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Email and password are required.' });
    }
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid email or password.' });
    }
    const token = signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
    });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[auth] login error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

authRouter.get('/me', authRequired(), (req, res) => {
  const user = (req as any).user;
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});