import { Hono } from 'hono';
import type { AppEnv } from '../auth';
import { authRequired } from '../auth';
import { selectSongs, selectSong, mapSong } from '../db';
import { escLike, genId } from '../util';

export const libraryRouter = new Hono<AppEnv>();

libraryRouter.use(authRequired);

const PL_COLS = 'p.id, p.name, p.description, p.user_id AS userId, p.created_at AS createdAt';

async function albumsWithSongs(db: D1Database, where = '', params: Array<string | number | null> = [], limit?: number): Promise<any[]> {
  const sql = `SELECT alb.id, alb.title, alb.artist_id AS artistId, alb.artwork_path AS artworkPath, alb.created_at AS createdAt, art.id AS "artist.id", art.name AS "artist.name", art.bio AS "artist.bio", art.artwork_path AS "artist.artworkPath", art.created_at AS "artist.createdAt" FROM album alb JOIN artist art ON art.id = alb.artist_id${where ? ` WHERE ${where}` : ''} ORDER BY alb.created_at DESC${limit !== undefined ? ' LIMIT ?' : ''}`;
  const stmt = db.prepare(sql);
  const bound = limit !== undefined ? stmt.bind(...params, limit) : stmt.bind(...params);
  const res = await bound.all();
  const albums: any[] = res.results.map((row: any) => ({
    id: row.id,
    title: row.title,
    artistId: row.artistId,
    artworkPath: row.artworkPath,
    createdAt: row.createdAt,
    artist: {
      id: row['artist.id'],
      name: row['artist.name'],
      bio: row['artist.bio'],
      artworkPath: row['artist.artworkPath'],
      createdAt: row['artist.createdAt'],
    },
    songs: [],
  }));
  const ids = albums.map((a) => a.id);
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    const songRes = await db
      .prepare(
        `SELECT ${SONG_COLS_FULL}, art2.id AS "songArtist.id", art2.name AS "songArtist.name", art2.bio AS "songArtist.bio", art2.artwork_path AS "songArtist.artworkPath", art2.created_at AS "songArtist.createdAt", alb2.id AS "songAlbum.id", alb2.title AS "songAlbum.title", alb2.artist_id AS "songAlbum.artistId", alb2.artwork_path AS "songAlbum.artworkPath", alb2.created_at AS "songAlbum.createdAt" FROM song s LEFT JOIN artist art2 ON art2.id = s.artist_id LEFT JOIN album alb2 ON alb2.id = s.album_id WHERE s.album_id IN (${placeholders}) ORDER BY s.album_id, s.track_number ASC`,
      )
      .bind(...ids)
      .all();
    for (const row of songRes.results as any[]) {
      const album = albums.find((a) => a.id === row.albumId);
      const song = mapSong({
        ...row,
        'artist.id': row['songArtist.id'],
        'artist.name': row['songArtist.name'],
        'artist.bio': row['songArtist.bio'],
        'artist.artworkPath': row['songArtist.artworkPath'],
        'artist.createdAt': row['songArtist.createdAt'],
        'album.id': row['songAlbum.id'],
        'album.title': row['songAlbum.title'],
        'album.artistId': row['songAlbum.artistId'],
        'album.artworkPath': row['songAlbum.artworkPath'],
        'album.createdAt': row['songAlbum.createdAt'],
      });
      album?.songs.push(song);
    }
  }
  return albums;
}

const SONG_COLS_FULL = 's.id, s.title, s.artist_id AS artistId, s.album_id AS albumId, s.audio_path AS audioPath, s.artwork_path AS artworkPath, s.duration, s.genre, s.release_date AS releaseDate, s.track_number AS trackNumber, s.disc_number AS discNumber, s.description, s.lyric, s.play_count AS playCount, s.created_at AS createdAt';

async function artistsWithCounts(db: D1Database, where = '', params: Array<string | number | null> = [], limit?: number): Promise<any[]> {
  const sql = `SELECT art.id, art.name, art.bio, art.artwork_path AS artworkPath, art.created_at AS createdAt, (SELECT COUNT(*) FROM song s WHERE s.artist_id = art.id) AS songCount, (SELECT COUNT(*) FROM album al WHERE al.artist_id = art.id) AS albumCount FROM artist art${where ? ` WHERE ${where}` : ''} ORDER BY art.name COLLATE NOCASE ASC${limit !== undefined ? ' LIMIT ?' : ''}`;
  const stmt = db.prepare(sql);
  const bound = limit !== undefined ? stmt.bind(...params, limit) : stmt.bind(...params);
  const res = await bound.all();
  return res.results.map((row: any) => ({
    id: row.id,
    name: row.name,
    bio: row.bio,
    artworkPath: row.artworkPath,
    createdAt: row.createdAt,
    _count: { songs: row.songCount, albums: row.albumCount },
  }));
}

async function recentlyPlayed(db: D1Database, userId: string, limit = 50): Promise<any[]> {
  const res = await db
    .prepare(
      `SELECT rp.id AS rp_id, rp.song_id AS rp_songId, rp.played_at AS rp_playedAt, ${SONG_COLS_FULL}, art2.id AS "songArtist.id", art2.name AS "songArtist.name", art2.bio AS "songArtist.bio", art2.artwork_path AS "songArtist.artworkPath", art2.created_at AS "songArtist.createdAt", alb2.id AS "songAlbum.id", alb2.title AS "songAlbum.title", alb2.artist_id AS "songAlbum.artistId", alb2.artwork_path AS "songAlbum.artworkPath", alb2.created_at AS "songAlbum.createdAt" FROM recently_played rp JOIN song s ON s.id = rp.song_id LEFT JOIN artist art2 ON art2.id = s.artist_id LEFT JOIN album alb2 ON alb2.id = s.album_id WHERE rp.user_id = ? ORDER BY rp.played_at DESC LIMIT ?`,
    )
    .bind(userId, limit)
    .all();
  return (res.results as any[]).map((row) => ({
    id: row.rp_id,
    songId: row.rp_songId,
    playedAt: row.rp_playedAt,
    song: mapSong({
      ...row,
      'artist.id': row['songArtist.id'],
      'artist.name': row['songArtist.name'],
      'artist.bio': row['songArtist.bio'],
      'artist.artworkPath': row['songArtist.artworkPath'],
      'artist.createdAt': row['songArtist.createdAt'],
      'album.id': row['songAlbum.id'],
      'album.title': row['songAlbum.title'],
      'album.artistId': row['songAlbum.artistId'],
      'album.artworkPath': row['songAlbum.artworkPath'],
      'album.createdAt': row['songAlbum.createdAt'],
    }),
  }));
}

async function likes(db: D1Database, userId: string): Promise<any[]> {
  const res = await db
    .prepare(
      `SELECT lk.id AS lk_id, lk.song_id AS lk_songId, lk.created_at AS lk_createdAt, ${SONG_COLS_FULL}, art2.id AS "songArtist.id", art2.name AS "songArtist.name", art2.bio AS "songArtist.bio", art2.artwork_path AS "songArtist.artworkPath", art2.created_at AS "songArtist.createdAt", alb2.id AS "songAlbum.id", alb2.title AS "songAlbum.title", alb2.artist_id AS "songAlbum.artistId", alb2.artwork_path AS "songAlbum.artworkPath", alb2.created_at AS "songAlbum.createdAt" FROM likes lk JOIN song s ON s.id = lk.song_id LEFT JOIN artist art2 ON art2.id = s.artist_id LEFT JOIN album alb2 ON alb2.id = s.album_id WHERE lk.user_id = ? ORDER BY lk.created_at DESC`,
    )
    .bind(userId)
    .all();
  return (res.results as any[]).map((row) => ({
    id: row.lk_id,
    songId: row.lk_songId,
    song: mapSong({
      ...row,
      'artist.id': row['songArtist.id'],
      'artist.name': row['songArtist.name'],
      'artist.bio': row['songArtist.bio'],
      'artist.artworkPath': row['songArtist.artworkPath'],
      'artist.createdAt': row['songArtist.createdAt'],
      'album.id': row['songAlbum.id'],
      'album.title': row['songAlbum.title'],
      'album.artistId': row['songAlbum.artistId'],
      'album.artworkPath': row['songAlbum.artworkPath'],
      'album.createdAt': row['songAlbum.createdAt'],
    }),
  }));
}

async function trackFor(row: any): Promise<any> {
  return {
    id: row['t.id'],
    playlistId: row['t.playlistId'],
    songId: row['t.songId'],
    position: row['t.position'],
    addedAt: row['t.addedAt'],
    song: mapSong({
      ...row,
      'artist.id': row['songArtist.id'],
      'artist.name': row['songArtist.name'],
      'artist.bio': row['songArtist.bio'],
      'artist.artworkPath': row['songArtist.artworkPath'],
      'artist.createdAt': row['songArtist.createdAt'],
      'album.id': row['songAlbum.id'],
      'album.title': row['songAlbum.title'],
      'album.artistId': row['songAlbum.artistId'],
      'album.artworkPath': row['songAlbum.artworkPath'],
      'album.createdAt': row['songAlbum.createdAt'],
    }),
  };
}

async function tracksForPlaylist(db: D1Database, playlistId: string): Promise<any[]> {
  const res = await db
    .prepare(
      `SELECT pt.id AS "t.id", pt.playlist_id AS "t.playlistId", pt.song_id AS "t.songId", pt.position AS "t.position", pt.added_at AS "t.addedAt", ${SONG_COLS_FULL}, art2.id AS "songArtist.id", art2.name AS "songArtist.name", art2.bio AS "songArtist.bio", art2.artwork_path AS "songArtist.artworkPath", art2.created_at AS "songArtist.createdAt", alb2.id AS "songAlbum.id", alb2.title AS "songAlbum.title", alb2.artist_id AS "songAlbum.artistId", alb2.artwork_path AS "songAlbum.artworkPath", alb2.created_at AS "songAlbum.createdAt" FROM playlist_track pt JOIN song s ON s.id = pt.song_id LEFT JOIN artist art2 ON art2.id = s.artist_id LEFT JOIN album alb2 ON alb2.id = s.album_id WHERE pt.playlist_id = ? ORDER BY pt.position ASC`,
    )
    .bind(playlistId)
    .all();
  return Promise.all((res.results as any[]).map(trackFor));
}

// ---------- Home ----------

libraryRouter.get('/home', async (c) => {
  try {
    const user = c.get('user');
    const [recentlyAdded, popular, albums, artists] = await Promise.all([
      selectSongs(c.env.DB, '', [], 's.created_at DESC', 20),
      selectSongs(c.env.DB, '', [], 's.play_count DESC', 20),
      albumsWithSongs(c.env.DB, '', [], 20),
      artistsWithCounts(c.env.DB, '', [], 20),
    ]);
    const recent = await recentlyPlayed(c.env.DB, user.id);
    return c.json({ recentlyAdded, popular, albums, artists, recentlyPlayed: recent });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

// ---------- Search ----------

libraryRouter.get('/search', async (c) => {
  try {
    const q = typeof c.req.query('q') === 'string' ? c.req.query('q')!.trim() : '';
    if (!q) return c.json({ songs: [], artists: [], albums: [] });
    const like = `%${escLike(q)}%`;
    const [songs, artists, albums] = await Promise.all([
      selectSongs(
        c.env.DB,
        `(s.title LIKE ? ESCAPE '\\' OR art.name LIKE ? ESCAPE '\\')`,
        [like, like],
        's.created_at DESC',
        20,
      ),
      artistsWithCounts(c.env.DB, `art.name LIKE ? ESCAPE '\\'`, [like], 10),
      (async () => {
        const res = await c.env.DB
          .prepare(
            `SELECT alb.id, alb.title, alb.artist_id AS artistId, alb.artwork_path AS artworkPath, alb.created_at AS createdAt, art.id AS "artist.id", art.name AS "artist.name", art.bio AS "artist.bio", art.artwork_path AS "artist.artworkPath", art.created_at AS "artist.createdAt" FROM album alb JOIN artist art ON art.id = alb.artist_id WHERE (alb.title LIKE ? ESCAPE '\\' OR art.name LIKE ? ESCAPE '\\') ORDER BY alb.created_at DESC LIMIT 10`,
          )
          .bind(like, like)
          .all();
        return res.results.map((row: any) => ({
          id: row.id,
          title: row.title,
          artistId: row.artistId,
          artworkPath: row.artworkPath,
          createdAt: row.createdAt,
          artist: {
            id: row['artist.id'],
            name: row['artist.name'],
            bio: row['artist.bio'],
            artworkPath: row['artist.artworkPath'],
            createdAt: row['artist.createdAt'],
          },
        }));
      })(),
    ]);
    return c.json({ songs, artists, albums });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

// ---------- Artists ----------

libraryRouter.get('/artists', async (c) => {
  try {
    const artists = await artistsWithCounts(c.env.DB);
    return c.json({ artists });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

libraryRouter.get('/artists/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const artistRow = (await c.env.DB
      .prepare('SELECT id, name, bio, artwork_path AS artworkPath, created_at AS createdAt FROM artist WHERE id = ?')
      .bind(id)
      .first()) as any;
    if (!artistRow) return c.json({ error: 'NOT_FOUND', message: 'Artist not found.' }, 404);
    const [albums, songs] = await Promise.all([
      (async () => {
        const res = await c.env.DB
          .prepare(
            `SELECT alb.id, alb.title, alb.artist_id AS artistId, alb.artwork_path AS artworkPath, alb.created_at AS createdAt, (SELECT COUNT(*) FROM song s WHERE s.album_id = alb.id) AS songCount FROM album alb WHERE alb.artist_id = ? ORDER BY alb.created_at DESC`,
          )
          .bind(id)
          .all();
        return res.results.map((row: any) => ({
          id: row.id,
          title: row.title,
          artistId: row.artistId,
          artworkPath: row.artworkPath,
          createdAt: row.createdAt,
          _count: { songs: row.songCount },
        }));
      })(),
      selectSongs(c.env.DB, 's.artist_id = ?', [id], 's.play_count DESC', 500),
    ]);
    return c.json({ artist: { ...artistRow, albums, songs } });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

// ---------- Albums ----------

libraryRouter.get('/albums', async (c) => {
  try {
    const albums = await albumsWithSongs(c.env.DB);
    return c.json({ albums });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

libraryRouter.get('/albums/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const albumRow = (await c.env.DB
      .prepare(
        `SELECT alb.id, alb.title, alb.artist_id AS artistId, alb.artwork_path AS artworkPath, alb.created_at AS createdAt, art.id AS "artist.id", art.name AS "artist.name", art.bio AS "artist.bio", art.artwork_path AS "artist.artworkPath", art.created_at AS "artist.createdAt" FROM album alb JOIN artist art ON art.id = alb.artist_id WHERE alb.id = ?`,
      )
      .bind(id)
      .first()) as any;
    if (!albumRow) return c.json({ error: 'NOT_FOUND', message: 'Album not found.' }, 404);
    const songs = await selectSongs(c.env.DB, 's.album_id = ?', [id], 's.disc_number ASC, s.track_number ASC', 500);
    return c.json({
      album: {
        id: albumRow.id,
        title: albumRow.title,
        artistId: albumRow.artistId,
        artworkPath: albumRow.artworkPath,
        createdAt: albumRow.createdAt,
        artist: {
          id: albumRow['artist.id'],
          name: albumRow['artist.name'],
          bio: albumRow['artist.bio'],
          artworkPath: albumRow['artist.artworkPath'],
          createdAt: albumRow['artist.createdAt'],
        },
        songs,
      },
    });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

// ---------- Playlists ----------

libraryRouter.get('/playlists', async (c) => {
  try {
    const user = c.get('user');
    const res = await c.env.DB
      .prepare(`SELECT ${PL_COLS} FROM playlist p WHERE p.user_id = ? ORDER BY p.created_at DESC`)
      .bind(user.id)
      .all();
    const playlists = await Promise.all(
      (res.results as any[]).map(async (row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        userId: row.userId,
        createdAt: row.createdAt,
        tracks: await tracksForPlaylist(c.env.DB, row.id),
      })),
    );
    return c.json({ playlists });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

libraryRouter.post('/playlists', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    const { name, description } = body;
    if (typeof name !== 'string' || !name.trim()) {
      return c.json({ error: 'BAD_REQUEST', message: 'Playlist name is required.' }, 400);
    }
    const id = genId('pl');
    const createdAt = new Date().toISOString();
    await c.env.DB
      .prepare('INSERT INTO playlist (id, name, description, user_id, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, name.trim().slice(0, 120), typeof description === 'string' ? description.slice(0, 500) : null, user.id, createdAt)
      .run();
    return c.json({ playlist: { id, name: name.trim().slice(0, 120), description: typeof description === 'string' ? description.slice(0, 500) : null, userId: user.id, createdAt } }, 201);
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

libraryRouter.get('/playlists/:id', async (c) => {
  try {
    const user = c.get('user');
    const row = (await c.env.DB
      .prepare(`SELECT ${PL_COLS} FROM playlist p WHERE p.id = ? AND p.user_id = ?`)
      .bind(c.req.param('id'), user.id)
      .first()) as any;
    if (!row) return c.json({ error: 'NOT_FOUND', message: 'Playlist not found.' }, 404);
    return c.json({
      playlist: {
        id: row.id,
        name: row.name,
        description: row.description,
        userId: row.userId,
        createdAt: row.createdAt,
        tracks: await tracksForPlaylist(c.env.DB, row.id),
      },
    });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

libraryRouter.put('/playlists/:id', async (c) => {
  try {
    const user = c.get('user');
    const { name, description } = await c.req.json().catch(() => ({}));
    const existing = (await c.env.DB
      .prepare('SELECT id, name, description FROM playlist WHERE id = ? AND user_id = ?')
      .bind(c.req.param('id'), user.id)
      .first()) as any;
    if (!existing) return c.json({ error: 'NOT_FOUND', message: 'Playlist not found.' }, 404);
    const newName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 120) : existing.name;
    const newDesc = typeof description === 'string' ? description.slice(0, 500) : existing.description;
    const row = (await c.env.DB
      .prepare('UPDATE playlist SET name = ?, description = ? WHERE id = ? RETURNING id, name, description, user_id AS userId, created_at AS createdAt')
      .bind(newName, newDesc, existing.id)
      .first()) as any;
    return c.json({ playlist: row });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

libraryRouter.delete('/playlists/:id', async (c) => {
  try {
    const user = c.get('user');
    const existing = (await c.env.DB
      .prepare('SELECT id FROM playlist WHERE id = ? AND user_id = ?')
      .bind(c.req.param('id'), user.id)
      .first()) as any;
    if (!existing) return c.json({ error: 'NOT_FOUND', message: 'Playlist not found.' }, 404);
    await c.env.DB.prepare('DELETE FROM playlist WHERE id = ?').bind(existing.id).run();
    return c.json({ ok: true });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

libraryRouter.post('/playlists/:id/tracks', async (c) => {
  try {
    const user = c.get('user');
    const { songId, position } = await c.req.json().catch(() => ({}));
    const playlist = (await c.env.DB
      .prepare('SELECT id FROM playlist WHERE id = ? AND user_id = ?')
      .bind(c.req.param('id'), user.id)
      .first()) as any;
    if (!playlist) return c.json({ error: 'NOT_FOUND', message: 'Playlist not found.' }, 404);
    const song = await selectSong(c.env.DB, songId);
    if (!song) return c.json({ error: 'BAD_REQUEST', message: 'Song not found.' }, 400);
    const max = (await c.env.DB
      .prepare('SELECT MAX(position) AS m FROM playlist_track WHERE playlist_id = ?')
      .bind(playlist.id)
      .first()) as any;
    const nextPos = typeof position === 'number' ? position : (max?.m ?? -1) + 1;
    const trackId = genId('pt');
    await c.env.DB
      .prepare('INSERT INTO playlist_track (id, playlist_id, song_id, position, added_at) VALUES (?, ?, ?, ?, ?)')
      .bind(trackId, playlist.id, songId, nextPos, new Date().toISOString())
      .run();
    return c.json({ track: { id: trackId, playlistId: playlist.id, songId, position: nextPos } }, 201);
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

libraryRouter.delete('/playlists/:id/tracks/:trackId', async (c) => {
  try {
    const user = c.get('user');
    const playlist = (await c.env.DB
      .prepare('SELECT id FROM playlist WHERE id = ? AND user_id = ?')
      .bind(c.req.param('id'), user.id)
      .first()) as any;
    if (!playlist) return c.json({ error: 'NOT_FOUND', message: 'Playlist not found.' }, 404);
    await c.env.DB
      .prepare('DELETE FROM playlist_track WHERE playlist_id = ? AND id = ?')
      .bind(playlist.id, c.req.param('trackId'))
      .run();
    return c.json({ ok: true });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

libraryRouter.put('/playlists/:id/tracks/order', async (c) => {
  try {
    const user = c.get('user');
    const { trackIds } = await c.req.json().catch(() => ({}));
    if (!Array.isArray(trackIds)) {
      return c.json({ error: 'BAD_REQUEST', message: 'trackIds required.' }, 400);
    }
    const playlist = (await c.env.DB
      .prepare('SELECT id FROM playlist WHERE id = ? AND user_id = ?')
      .bind(c.req.param('id'), user.id)
      .first()) as any;
    if (!playlist) return c.json({ error: 'NOT_FOUND', message: 'Playlist not found.' }, 404);
    await c.env.DB.batch(
      trackIds.map((id, idx) =>
        c.env.DB.prepare('UPDATE playlist_track SET position = ? WHERE playlist_id = ? AND id = ?').bind(idx, playlist.id, id),
      ),
    );
    return c.json({ ok: true });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

// ---------- Likes ----------

libraryRouter.get('/likes', async (c) => {
  try {
    return c.json({ likes: await likes(c.env.DB, c.get('user').id) });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

libraryRouter.post('/likes/:songId', async (c) => {
  try {
    const user = c.get('user');
    const songId = c.req.param('songId');
    const song = await selectSong(c.env.DB, songId);
    if (!song) return c.json({ error: 'NOT_FOUND', message: 'Song not found.' }, 404);
    const existing = (await c.env.DB
      .prepare('SELECT id FROM likes WHERE user_id = ? AND song_id = ?')
      .bind(user.id, songId)
      .first()) as any;
    if (!existing) {
      await c.env.DB
        .prepare('INSERT INTO likes (id, user_id, song_id, created_at) VALUES (?, ?, ?, ?)')
        .bind(genId('lk'), user.id, songId, new Date().toISOString())
        .run();
    }
    return c.json({ ok: true });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

libraryRouter.delete('/likes/:songId', async (c) => {
  try {
    const user = c.get('user');
    await c.env.DB
      .prepare('DELETE FROM likes WHERE user_id = ? AND song_id = ?')
      .bind(user.id, c.req.param('songId'))
      .run();
    return c.json({ ok: true });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});

// ---------- Recently played ----------

libraryRouter.get('/recently-played', async (c) => {
  try {
    return c.json({ recentlyPlayed: await recentlyPlayed(c.env.DB, c.get('user').id) });
  } catch {
    return c.json({ error: 'INTERNAL', message: 'Something went wrong.' }, 500);
  }
});