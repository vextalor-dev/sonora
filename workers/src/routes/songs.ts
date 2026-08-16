import { Hono } from 'hono';
import type { AppEnv } from '../auth';
import { authRequired, streamAuth } from '../auth';
import { selectSong, selectSongs } from '../db';
import { AUDIO_MIME, escLike, extOf, genId } from '../util';
import { mediaGet } from '../storage';

export const songsRouter = new Hono<AppEnv>();

songsRouter.use('/:id/stream', streamAuth);

songsRouter.get('/', authRequired, async (c) => {
  try {
    const q = typeof c.req.query('q') === 'string' ? c.req.query('q')!.trim() : '';
    let songs;
    if (q) {
      const like = `%${escLike(q)}%`;
      songs = await selectSongs(
        c.env.DB,
        `(s.title LIKE ? ESCAPE '\\' OR art.name LIKE ? ESCAPE '\\' OR alb.title LIKE ? ESCAPE '\\')`,
        [like, like, like],
        's.created_at DESC',
        100,
      );
    } else {
      songs = await selectSongs(c.env.DB, '', [], 's.created_at DESC', 100);
    }
    return c.json({ songs });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

songsRouter.get('/:id', authRequired, async (c) => {
  try {
    const song = await selectSong(c.env.DB, c.req.param('id')!);
    if (!song) return c.json({ error: 'NOT_FOUND', message: 'Song not found.' }, 404);
    return c.json({ song });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

songsRouter.post('/:id/play', authRequired, async (c) => {
  try {
    const id = c.req.param('id')!;
    const song = await selectSong(c.env.DB, id);
    if (!song) return c.json({ error: 'NOT_FOUND', message: 'Song not found.' }, 404);
    const user = c.get('user');
    const now = new Date().toISOString();
    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE song SET play_count = play_count + 1, updated_at = ? WHERE id = ?').bind(now, id),
      c.env.DB.prepare('DELETE FROM recently_played WHERE user_id = ? AND song_id = ?').bind(user.id, id),
      c.env.DB.prepare('INSERT INTO recently_played (id, user_id, song_id, played_at) VALUES (?, ?, ?, ?)').bind(
        genId('rp'),
        user.id,
        id,
        now,
      ),
    ]);
    return c.json({ ok: true });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

songsRouter.get('/:id/stream', async (c) => {
  try {
    const song = await selectSong(c.env.DB, c.req.param('id')!);
    if (!song?.audioPath) return c.json({ error: 'NOT_FOUND', message: 'Song not found.' }, 404);
    const file = song.audioPath.split('/').pop() as string;
    const stored = await mediaGet(c.env, `audio/${file}`);
    if (!stored) return c.json({ error: 'NOT_FOUND', message: 'Audio file missing on disk.' }, 404);
    const mime = AUDIO_MIME[extOf(file)] ?? 'application/octet-stream';
    const size = stored.size;
    const cache = 'private, max-age=3600';

    const range = c.req.header('range');
    const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
    if (match) {
      let start = match[1] ? parseInt(match[1], 10) : 0;
      let end = match[2] ? parseInt(match[2], 10) : size - 1;
      if (Number.isNaN(start)) start = 0;
      if (Number.isNaN(end)) end = size - 1;
      if (start >= size || end < start) {
        c.header('Content-Range', `bytes */${size}`);
        return c.json({ error: 'RANGE_NOT_SATISFIABLE', message: 'Range not satisfiable.' }, 416);
      }
      end = Math.min(end, size - 1);
      return new Response(stored.bytes.slice(start, end + 1), {
        status: 206,
        headers: {
          'Content-Type': mime,
          'Content-Length': String(end - start + 1),
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': cache,
        },
      });
    }

    return new Response(stored.bytes, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Length': String(size),
        'Accept-Ranges': 'bytes',
        'Cache-Control': cache,
      },
    });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});