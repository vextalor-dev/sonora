import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { songsRouter } from './routes/songs.js';
import { adminRouter, artworkRouter } from './routes/admin.js';
import { libraryRouter } from './routes/library.js';

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', name: 'Sonora API' }));

app.use('/api/auth', authRouter);
app.use('/api/songs', songsRouter);
app.use('/api/library', libraryRouter);
app.use('/api/admin', adminRouter);
app.use('/api/artwork', artworkRouter);

// Serve the built frontend when present (production).
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

process.on('uncaughtException', (err) => {
  console.error('[sonora] UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[sonora] UNHANDLED REJECTION:', reason);
});

// Minimal request log so a crash can always be traced.
app.use((req, _res, next) => {
  console.log(`[req] ${req.method} ${req.originalUrl}`);
  next();
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', '..', '..', 'frontend', 'dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[sonora] error:', err.message);
  if (res.headersSent) return;
  const isBodyParser = err.type === 'entity.parse.failed' || err.type === 'entity.too.large';
  res.status(isBodyParser ? 400 : 500).json({
    error: isBodyParser ? 'BAD_REQUEST' : 'INTERNAL',
    message: isBodyParser ? 'Malformed request body.' : 'Something went wrong.',
  });
});

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const server = app.listen(PORT, HOST, () => {
  console.log(`[sonora] API listening on http://${HOST}:${PORT}`);
});
server.on('error', (err: any) => {
  console.error('[sonora] server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error('[sonora] port already in use — is another instance running?');
    process.exit(1);
  }
});