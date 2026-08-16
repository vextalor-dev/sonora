import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import type { AppEnv } from './auth';
import { authRouter } from './routes/auth';
import { songsRouter } from './routes/songs';
import { libraryRouter } from './routes/library';
import { adminRouter, artworkRouter } from './routes/admin';

const app = new Hono<AppEnv>();

app.use(
  '/api/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Range', 'Content-Length', 'Accept-Ranges', 'Content-Type'],
    maxAge: 86400,
  }),
);

app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }));

app.route('/api/auth', authRouter);
app.route('/api/songs', songsRouter);
app.route('/api/library', libraryRouter);
app.route('/api/admin', adminRouter);
app.route('/api/artwork', artworkRouter);

app.notFound((c) => c.json({ error: 'NOT_FOUND', message: 'Route not found.' }, 404));

export default app;
export type { Env };