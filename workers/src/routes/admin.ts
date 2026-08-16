import { Hono } from 'hono';
import type { AppEnv } from '../auth';
import { adminGate, authRequired, streamAuth } from '../auth';
import { selectSong, selectSongsByIds } from '../db';
import { mediaCount, mediaDelete, mediaGet, mediaPut, MEDIA_SIZE_LIMIT } from '../storage';
import { genId, IMAGE_MIME, isAudioName, isImageName, extOf } from '../util';

export const adminRouter = new Hono<AppEnv>();

adminRouter.use(authRequired);
adminRouter.use(adminGate);

const STAGING_TTL = 24 * 60 * 60;

interface StagingEntry {
  originalName: string;
  size: number;
  ext: string;
}

async function putStaging(c: any, id: string, entry: StagingEntry): Promise<void> {
  await c.env.KV_MEDIA.put(`staging/${id}`, JSON.stringify(entry), { expirationTtl: STAGING_TTL });
}

async function takeStaging(c: any, id: string): Promise<{ key: string; originalName: string; size: number } | null> {
  const raw = await c.env.KV_MEDIA.get(`staging/${id}`);
  if (raw === null) return null;
  await c.env.KV_MEDIA.delete(`staging/${id}`);
  let entry: StagingEntry;
  try {
    entry = JSON.parse(raw);
  } catch {
    return null;
  }
  return { key: `audio/${id}${entry.ext}`, originalName: entry.originalName, size: entry.size };
}

async function safeJson(c: any): Promise<any> {
  try {
    return (await c.req.json()) ?? {};
  } catch {
    return {};
  }
}

// ---------- Audio upload (staged) ----------
adminRouter.post('/songs/upload', async (c) => {
  try {
    const fd = await c.req.formData();
    const file: any = fd.get('audio');
    if (!(file instanceof File)) {
      return c.json({ error: 'BAD_REQUEST', message: 'No audio file provided.' }, 400);
    }
    if (!isAudioName(file.name)) {
      return c.json({ error: 'BAD_REQUEST', message: 'Unsupported audio format.' }, 400);
    }
    if (file.size > MEDIA_SIZE_LIMIT) {
      return c.json({ error: 'BAD_REQUEST', message: 'File too large (max 20MB).' }, 400);
    }
    const ext = extOf(file.name);
    const stagingId = genId('stg');
    const key = `audio/${stagingId}${ext}`;
    await mediaPut(c.env, key, new Uint8Array(await file.arrayBuffer()));
    await putStaging(c, stagingId, { originalName: file.name, size: file.size, ext });
    return c.json({
      stagingId,
      originalName: baseName(file.name),
      size: file.size,
      duration: 0,
      meta: { title: '', artist: '', album: '', genre: '', trackNumber: null },
    });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Upload failed.' }, 500);
  }
});

function baseName(name: string): string {
  return name.split('/').pop() ?? name;
}

// ---------- Artwork upload ----------
adminRouter.post('/artwork', async (c) => {
  try {
    const fd = await c.req.formData();
    const file: any = fd.get('artwork');
    if (!(file instanceof File)) {
      return c.json({ error: 'BAD_REQUEST', message: 'No image file provided.' }, 400);
    }
    if (!isImageName(file.name)) {
      return c.json({ error: 'BAD_REQUEST', message: 'Unsupported image format.' }, 400);
    }
    if (file.size > MEDIA_SIZE_LIMIT) {
      return c.json({ error: 'BAD_REQUEST', message: 'File too large (max 20MB).' }, 400);
    }
    const ext = extOf(file.name);
    const filename = `${genId('art')}${ext}`;
    await mediaPut(c.env, `artwork/${filename}`, new Uint8Array(await file.arrayBuffer()));
    return c.json({ filename, path: `uploads/artwork/${filename}` });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Upload failed.' }, 500);
  }
});

// ---------- Bulk publish ----------
adminRouter.post('/songs/publish', async (c) => {
  try {
    const { tracks } = await safeJson(c);
    if (!Array.isArray(tracks) || !tracks.length) {
      return c.json({ error: 'BAD_REQUEST', message: 'No tracks to publish.' }, 400);
    }
    const ids: string[] = [];
    for (const track of tracks) {
      const { stagingId, title, artist, album, genre, releaseDate, trackNumber, discNumber, description, lyric, artworkPath, artworkFilename } = track ?? {};
      if (!stagingId || typeof title !== 'string' || !title.trim()) {
        return c.json({ error: 'BAD_REQUEST', message: 'Each track needs a staging id and a title.' }, 400);
      }
      const staged = await takeStaging(c, stagingId);
      if (!staged) {
        return c.json({ error: 'BAD_REQUEST', message: 'Staged upload expired; please upload the audio again.' }, 400);
      }

      let artwork: string | null = null;
      if (typeof artworkPath === 'string' && artworkPath) artwork = artworkPath;
      else if (typeof artworkFilename === 'string' && artworkFilename) artwork = `uploads/artwork/${artworkFilename}`;

      let artistId: string | null = null;
      if (typeof artist === 'string' && artist.trim()) {
        const record = await upsertArtist(c, artist.trim());
        artistId = record.id;
        if (typeof album === 'string' && album.trim()) {
          await upsertAlbum(c, album.trim(), record.id, artwork);
        }
      }
      const albumId = artistId
        ? (await findAlbum(c, typeof album === 'string' && album.trim() ? album.trim() : '', artistId))?.id ?? null
        : null;

      const songId = genId('sng');
      const now = new Date().toISOString();
      const rd = typeof releaseDate === 'string' && releaseDate ? new Date(releaseDate) : null;
      const releaseDateIso = rd && !Number.isNaN(rd.getTime()) ? rd.toISOString() : null;

      await c.env.DB
        .prepare(
          `INSERT INTO song (id, title, artist_id, album_id, audio_path, artwork_path, duration, genre, release_date, track_number, disc_number, description, lyric, play_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        )
        .bind(
          songId,
          title.trim().slice(0, 300),
          artistId,
          albumId,
          `uploads/audio/${staged.key.split('/').pop()}`,
          artwork,
          typeof genre === 'string' && genre.trim() ? genre.trim().slice(0, 100) : null,
          releaseDateIso,
          Number.isFinite(trackNumber) ? trackNumber : null,
          Number.isFinite(discNumber) ? discNumber : null,
          typeof description === 'string' && description.trim() ? description.trim().slice(0, 2000) : null,
          typeof lyric === 'string' && lyric.trim() ? lyric.trim() : null,
          now,
          now,
        )
        .run();
      ids.push(songId);
    }
    const songs = await selectSongsByIds(c.env.DB, ids);
    return c.json({ songs });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Publish failed.' }, 500);
  }
});

async function findArtist(c: any, name: string) {
  const row = (await c.env.DB.prepare('SELECT id FROM artist WHERE name = ?').bind(name).first()) as any;
  return row ?? null;
}

async function findAlbum(c: any, title: string, artistId: string) {
  const row = (await c.env.DB
    .prepare('SELECT id, artwork_path AS artworkPath FROM album WHERE title = ? AND artist_id = ?')
    .bind(title, artistId)
    .first()) as any;
  return row ?? null;
}

async function upsertArtist(c: any, name: string) {
  const existing = await findArtist(c, name);
  if (existing) return { id: existing.id };
  const id = genId('art');
  await c.env.DB
    .prepare('INSERT INTO artist (id, name, bio, created_at) VALUES (?, ?, NULL, ?)')
    .bind(id, name, new Date().toISOString())
    .run();
  return { id };
}

async function upsertAlbum(c: any, title: string, artistId: string, artworkPath: string | null) {
  const existing = await findAlbum(c, title, artistId);
  if (existing) return { id: existing.id };
  const id = genId('alb');
  await c.env.DB
    .prepare('INSERT INTO album (id, title, artist_id, artwork_path, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, title, artistId, artworkPath, new Date().toISOString())
    .run();
  return { id };
}

// ---------- Full metadata update ----------
adminRouter.put('/songs/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await selectSong(c.env.DB, id);
    if (!existing) return c.json({ error: 'NOT_FOUND', message: 'Song not found.' }, 404);
    const { title, artist, album, genre, releaseDate, trackNumber, discNumber, description, lyric, artworkPath } = await safeJson(c);

    let artistId = existing.artistId;
    let albumId = existing.albumId;
    if (typeof artist === 'string' && artist.trim()) {
      const record = await upsertArtist(c, artist.trim());
      artistId = record.id;
      if (typeof album === 'string' && album.trim()) {
        albumId = (await upsertAlbum(c, album.trim(), record.id, null)).id;
      }
    }

    const rd = typeof releaseDate === 'string' && releaseDate ? new Date(releaseDate) : null;
    const releaseDateIso = rd && !Number.isNaN(rd.getTime()) ? rd.toISOString() : existing.releaseDate;

    await c.env.DB
      .prepare(
        `UPDATE song SET title = ?, artist_id = ?, album_id = ?, genre = ?, release_date = ?, track_number = ?, disc_number = ?, description = ?, lyric = ?, artwork_path = ?, updated_at = ? WHERE id = ?`,
      )
      .bind(
        typeof title === 'string' && title.trim() ? title.trim().slice(0, 300) : existing.title,
        artistId,
        albumId,
        typeof genre === 'string' && genre.trim() ? genre.trim().slice(0, 100) : existing.genre,
        releaseDateIso,
        Number.isFinite(trackNumber) ? trackNumber : existing.trackNumber,
        Number.isFinite(discNumber) ? discNumber : existing.discNumber,
        typeof description === 'string' ? description.slice(0, 2000) : existing.description,
        typeof lyric === 'string' ? lyric.trim() : existing.lyric,
        typeof artworkPath === 'string' ? artworkPath : existing.artworkPath,
        new Date().toISOString(),
        id,
      )
      .run();
    const song = await selectSong(c.env.DB, id);
    return c.json({ song });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Update failed.' }, 500);
  }
});

// ---------- Replace audio file ----------
adminRouter.post('/songs/:id/audio', async (c) => {
  try {
    const id = c.req.param('id');
    const song = await selectSong(c.env.DB, id);
    if (!song) return c.json({ error: 'NOT_FOUND', message: 'Song not found.' }, 404);
    const fd = await c.req.formData();
    const file: any = fd.get('audio');
    if (!(file instanceof File)) {
      return c.json({ error: 'BAD_REQUEST', message: 'No audio file provided.' }, 400);
    }
    if (!isAudioName(file.name)) {
      return c.json({ error: 'BAD_REQUEST', message: 'Unsupported audio format.' }, 400);
    }
    if (file.size > MEDIA_SIZE_LIMIT) {
      return c.json({ error: 'BAD_REQUEST', message: 'File too large (max 20MB).' }, 400);
    }
    const key = `audio/${genId('stg')}${extOf(file.name)}`;
    await mediaPut(c.env, key, new Uint8Array(await file.arrayBuffer()));
    const oldKey = `audio/${(song.audioPath ?? '').split('/').pop()}`;
    await c.env.DB
      .prepare('UPDATE song SET audio_path = ?, duration = 0, updated_at = ? WHERE id = ?')
      .bind(`uploads/audio/${key.split('/').pop()}`, new Date().toISOString(), id)
      .run();
    if (oldKey !== key) await mediaDelete(c.env, oldKey);
    const updated = await selectSong(c.env.DB, id);
    return c.json({ song: updated });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Replace failed.' }, 500);
  }
});

// ---------- Delete song (DB + files) ----------
adminRouter.delete('/songs/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const song = await selectSong(c.env.DB, id);
    if (!song) return c.json({ error: 'NOT_FOUND', message: 'Song not found.' }, 404);
    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM likes WHERE song_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM recently_played WHERE song_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM playlist_track WHERE song_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM song WHERE id = ?').bind(id),
    ]);
    if (song.audioPath) await mediaDelete(c.env, `audio/${song.audioPath.split('/').pop()}`);
    if (song.artworkPath) await mediaDelete(c.env, `artwork/${song.artworkPath.split('/').pop()}`);
    return c.json({ ok: true });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Delete failed.' }, 500);
  }
});

// ---------- Admin stats ----------
adminRouter.get('/stats', async (c) => {
  try {
    const count = async (table: string): Promise<number> => {
      const row = (await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first()) as any;
      return row?.n ?? 0;
    };
    const [songs, albums, artists, users] = await Promise.all([
      count('song'),
      count('album'),
      count('artist'),
      count('"user"'),
    ]);
    const [audio, artwork] = await Promise.all([mediaCount(c.env, 'audio/'), mediaCount(c.env, 'artwork/')]);
    return c.json({
      stats: {
        songs,
        albums,
        artists,
        users,
        storage: { audio, artwork },
      },
    });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

// ---------- Artists admin CRUD ----------
adminRouter.post('/artists', async (c) => {
  try {
    const { name, bio } = await safeJson(c);
    if (typeof name !== 'string' || !name.trim()) {
      return c.json({ error: 'BAD_REQUEST', message: 'Artist name is required.' }, 400);
    }
    const id = genId('art');
    const now = new Date().toISOString();
    await c.env.DB
      .prepare('INSERT INTO artist (id, name, bio, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, name.trim(), typeof bio === 'string' ? bio : null, now)
      .run();
    return c.json({ artist: { id, name: name.trim(), bio: typeof bio === 'string' ? bio : null, artworkPath: null, createdAt: now } }, 201);
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Create failed.' }, 500);
  }
});

adminRouter.delete('/artists/:id', async (c) => {
  try {
    await c.env.DB.prepare('DELETE FROM artist WHERE id = ?').bind(c.req.param('id')).run();
    return c.json({ ok: true });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Delete failed (artist may still have albums).' }, 500);
  }
});

// ---------- Albums admin CRUD ----------
adminRouter.post('/albums', async (c) => {
  try {
    const { title, artistId } = await safeJson(c);
    if (typeof title !== 'string' || !title.trim() || !artistId) {
      return c.json({ error: 'BAD_REQUEST', message: 'Album title and artist are required.' }, 400);
    }
    const id = genId('alb');
    const now = new Date().toISOString();
    await c.env.DB
      .prepare('INSERT INTO album (id, title, artist_id, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, title.trim(), artistId, now)
      .run();
    return c.json({ album: { id, title: title.trim(), artistId, artworkPath: null, createdAt: now } }, 201);
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Create failed.' }, 500);
  }
});

adminRouter.delete('/albums/:id', async (c) => {
  try {
    await c.env.DB.prepare('DELETE FROM album WHERE id = ?').bind(c.req.param('id')).run();
    return c.json({ ok: true });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Delete failed.' }, 500);
  }
});

// ---------- Public artwork serving (safe filename) ----------
export const artworkRouter = new Hono<AppEnv>();

artworkRouter.use(streamAuth);

artworkRouter.get('/:filename', async (c) => {
  const filename = c.req.param('filename');
  if (!/^[\w.-]+$/.test(filename)) return c.json({ error: 'BAD_REQUEST', message: 'Invalid filename.' }, 400);
  const stored = await mediaGet(c.env, `artwork/${filename}`);
  if (!stored) return c.json({ error: 'NOT_FOUND', message: 'Artwork not found.' }, 404);
  return new Response(stored.bytes, {
    headers: {
      'Content-Type': IMAGE_MIME[extOf(filename)] ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=86400',
    },
  });
});