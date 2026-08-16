import type { AuthUser, Role } from './auth';

export interface DbUser extends AuthUser {
  passwordHash: string;
  createdAt: string;
}

export const SONG_COLS = `s.id, s.title, s.artist_id AS artistId, s.album_id AS albumId, s.audio_path AS audioPath, s.artwork_path AS artworkPath, s.duration, s.genre, s.release_date AS releaseDate, s.track_number AS trackNumber, s.disc_number AS discNumber, s.description, s.lyric, s.play_count AS playCount, s.created_at AS createdAt`;

export const ARTIST_COLS = `art.id AS "artist.id", art.name AS "artist.name", art.bio AS "artist.bio", art.artwork_path AS "artist.artworkPath", art.created_at AS "artist.createdAt"`;

export const ALBUM_COLS = `alb.id AS "album.id", alb.title AS "album.title", alb.artist_id AS "album.artistId", alb.artwork_path AS "album.artworkPath", alb.created_at AS "album.createdAt"`;

export const SONG_JOIN = `FROM song s LEFT JOIN artist art ON art.id = s.artist_id LEFT JOIN album alb ON alb.id = s.album_id`;

type Row = Record<string, any>;

export function mapSong(row: Row): any {
  return {
    id: row.id,
    title: row.title,
    artistId: row.artistId,
    albumId: row.albumId,
    audioPath: row.audioPath,
    artworkPath: row.artworkPath,
    duration: row.duration,
    genre: row.genre,
    releaseDate: row.releaseDate,
    trackNumber: row.trackNumber,
    discNumber: row.discNumber,
    description: row.description,
    lyric: row.lyric,
    playCount: row.playCount,
    createdAt: row.createdAt,
    artist: row['artist.id']
      ? {
          id: row['artist.id'],
          name: row['artist.name'],
          bio: row['artist.bio'],
          artworkPath: row['artist.artworkPath'],
          createdAt: row['artist.createdAt'],
        }
      : null,
    album: row['album.id']
      ? {
          id: row['album.id'],
          title: row['album.title'],
          artistId: row['album.artistId'],
          artworkPath: row['album.artworkPath'],
          createdAt: row['album.createdAt'],
        }
      : null,
  };
}

export async function selectSongs(
  db: D1Database,
  where = '',
  params: Array<string | number | null> = [],
  order = 's.created_at DESC',
  limit = 50,
): Promise<any[]> {
  const sql = `SELECT ${SONG_COLS}, ${ARTIST_COLS}, ${ALBUM_COLS} ${SONG_JOIN}${
    where ? ` WHERE ${where}` : ''
  } ORDER BY ${order} LIMIT ?`;
  const res = await db.prepare(sql).bind(...params, limit).all();
  return res.results.map(mapSong);
}

export async function selectSong(db: D1Database, id: string): Promise<any | null> {
  const rows = await selectSongs(db, 's.id = ?', [id], 's.created_at DESC', 1);
  return rows[0] ?? null;
}

export async function selectSongsByIds(db: D1Database, ids: string[]): Promise<any[]> {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const res = await db
    .prepare(`SELECT ${SONG_COLS}, ${ARTIST_COLS}, ${ALBUM_COLS} ${SONG_JOIN} WHERE s.id IN (${placeholders})`)
    .bind(...ids)
    .all();
  return res.results.map(mapSong);
}

// ---------- users ----------

export async function getUserByEmail(db: D1Database, email: string): Promise<DbUser | null> {
  const row = await db
    .prepare(`SELECT id, name, email, password_hash AS passwordHash, role, created_at AS createdAt FROM "user" WHERE email = ?`)
    .bind(email)
    .first<DbUser>();
  return row ?? null;
}

export async function getUserById(db: D1Database, id: string): Promise<DbUser | null> {
  const row = await db
    .prepare(`SELECT id, name, email, password_hash AS passwordHash, role, created_at AS createdAt FROM "user" WHERE id = ?`)
    .bind(id)
    .first<DbUser>();
  return row ?? null;
}

export async function countUsers(db: D1Database): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM "user"').first<{ n: number }>();
  return row?.n ?? 0;
}

export async function createUserRow(
  db: D1Database,
  data: { id: string; name: string | null; email: string; passwordHash: string; role: Role },
): Promise<DbUser> {
  await db
    .prepare(`INSERT INTO "user" (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(data.id, data.name, data.email, data.passwordHash, data.role, new Date().toISOString())
    .run();
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    role: data.role,
    createdAt: new Date().toISOString(),
  };
}