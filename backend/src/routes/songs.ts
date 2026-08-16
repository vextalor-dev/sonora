import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../lib/prisma.js';
import { authRequired, streamAuth } from '../lib/auth.js';
import { resolveStored } from '../lib/storage.js';

const MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.webm': 'audio/webm',
};

function mimeFor(filePath: string): string {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

let activeStreams = 0;
const MAX_ACTIVE_STREAMS = 64;

/** Streams a file with full HTTP Range support. */
function streamFile(req: any, res: any, absolutePath: string) {
  if (activeStreams >= MAX_ACTIVE_STREAMS) {
    return res.status(503).json({ error: 'BUSY', message: 'Too many concurrent streams.' });
  }
  const stat = fs.statSync(absolutePath);
  const mime = mimeFor(absolutePath);
  const range = req.headers.range as string | undefined;

  const send = (status: number, headers: Record<string, string>, start: number, end: number) => {
    activeStreams += 1;
    const stream = fs.createReadStream(absolutePath, { start, end });
    const cleanup = () => {
      stream.destroy();
      activeStreams -= 1;
      req.removeListener('close', cleanup);
      req.removeListener('aborted', cleanup);
    };
    req.on('close', cleanup);
    req.on('aborted', cleanup);
    stream.on('close', () => {
      activeStreams -= 1;
      req.removeListener('close', cleanup);
      req.removeListener('aborted', cleanup);
    });
    res.writeHead(status, headers);
    stream.pipe(res);
  };

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match || (!match[1] && !match[2])) {
      return res.status(416).json({ error: 'INVALID_RANGE', message: 'Invalid range header.' });
    }
    let start = match[1] ? parseInt(match[1], 10) : 0;
    let end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
    if (Number.isNaN(start)) start = 0;
    if (Number.isNaN(end)) end = stat.size - 1;
    if (start >= stat.size || end < start) {
      res.setHeader('Content-Range', `bytes */${stat.size}`);
      return res.status(416).json({ error: 'RANGE_NOT_SATISFIABLE', message: 'Range not satisfiable.' });
    }
    end = Math.min(end, stat.size - 1);
    send(206, {
      'Content-Type': mime,
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    }, start, end);
    return;
  }

  send(200, {
    'Content-Type': mime,
    'Content-Length': String(stat.size),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=3600',
  }, 0, stat.size - 1);
}

export const songsRouter: Router = Router();

// Public song list with search across songs, artists, albums.
songsRouter.get('/', authRequired(), async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const where = q
      ? {
          OR: [
            { title: { contains: q } },
            { artist: { name: { contains: q } } },
            { album: { title: { contains: q } } },
          ],
        }
      : undefined;
    const songs = await prisma.song.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { artist: true, album: true },
    });
    res.json({ songs });
  } catch (err) {
    console.error('[songs] list error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

songsRouter.get('/:id', authRequired(), async (req, res) => {
  try {
    const song = await prisma.song.findUnique({
      where: { id: req.params.id },
      include: { artist: true, album: true },
    });
    if (!song) return res.status(404).json({ error: 'NOT_FOUND', message: 'Song not found.' });
    res.json({ song });
  } catch (err) {
    console.error('[songs] get error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

// Increment play count + record recently played.
songsRouter.post('/:id/play', authRequired(), async (req, res) => {
  try {
    const song = await prisma.song.findUnique({ where: { id: req.params.id } });
    if (!song) return res.status(404).json({ error: 'NOT_FOUND', message: 'Song not found.' });
    const user = (req as any).user;
    await prisma.$transaction([
      prisma.song.update({ where: { id: song.id }, data: { playCount: { increment: 1 } } }),
      prisma.recentlyPlayed.deleteMany({ where: { userId: user.id, songId: song.id } }),
      prisma.recentlyPlayed.create({ data: { userId: user.id, songId: song.id, playedAt: new Date() } }),
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[songs] play error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

// Range-enabled audio streaming.
songsRouter.get('/:id/stream', streamAuth(), async (req, res) => {
  try {
    const song = await prisma.song.findUnique({ where: { id: req.params.id }, select: { audioPath: true } });
    if (!song?.audioPath) return res.status(404).json({ error: 'NOT_FOUND', message: 'Song not found.' });
    const absolute = resolveStored(song.audioPath);
    if (!absolute) return res.status(404).json({ error: 'NOT_FOUND', message: 'Audio file missing on disk.' });
    streamFile(req, res, absolute);
  } catch (err) {
    console.error('[songs] stream error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});