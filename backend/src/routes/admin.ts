import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { parseFile } from 'music-metadata';
import { prisma } from '../lib/prisma.js';
import { adminRequired, authRequired, streamAuth } from '../lib/auth.js';
import {
  AUDIO_DIR,
  ARTWORK_DIR,
  resolveStored,
  publicPaths,
  deleteFile,
  statSize,
} from '../lib/storage.js';

const upload = multer({
  storage: multer.diskStorage({
    destination: AUDIO_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = /^\.(mp3|wav|flac|m4a|ogg|aac|opus|webm)$/.test(ext) ? ext : '.mp3';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`);
    },
  }),
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB ceiling; format-validated before publish
});

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: ARTWORK_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = /^\.(jpg|jpeg|png|webp|gif)$/.test(ext) ? ext : '.jpg';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WebP and GIF images are allowed.'));
  },
});

// ---------- Staging area for uploaded-but-unpublished audio ----------
const staging = new Map<string, { filePath: string; originalName: string; size: number; expiresAt: number }>();
const STAGING_TTL = 1000 * 60 * 60 * 24; // 24h

function rememberStaging(filename: string, originalName: string) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const filePath = path.join(AUDIO_DIR, filename);
  staging.set(id, {
    filePath,
    originalName,
    size: fs.statSync(filePath).size,
    expiresAt: Date.now() + STAGING_TTL,
  });
  return id;
}

function takeStaging(id: string) {
  const entry = staging.get(id);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    staging.delete(id);
    deleteFile(entry.filePath);
    return null;
  }
  staging.delete(id);
  return entry;
}

export const adminRouter: Router = Router();
adminRouter.use(adminRequired());

// ---------- Audio upload (one file per request; parallel from the UI) ----------
adminRouter.post('/songs/upload', upload.single('audio'), async (req: any, res) => {
  try {
    const file: Express.Multer.File | undefined = req.file;
    if (!file) return res.status(400).json({ error: 'BAD_REQUEST', message: 'No audio file provided.' });

    let meta: any = {};
    try {
      const parsed = await parseFile(file.path);
      meta = {
        title: parsed.common.title || '',
        artist: parsed.common.artist || '',
        album: parsed.common.album || '',
        genre: parsed.common.genre?.[0] || '',
        trackNumber: parsed.common.track?.no ?? null,
        duration: parsed.format.duration ?? 0,
      };
    } catch {
      meta = { duration: 0 };
    }

    const stagingId = rememberStaging(file.filename, file.originalname);
    res.json({
      stagingId,
      originalName: file.originalname,
      size: file.size,
      duration: Math.round(meta.duration * 10) / 10,
      meta: {
        title: meta.title,
        artist: meta.artist,
        album: meta.album,
        genre: meta.genre,
        trackNumber: meta.trackNumber,
      },
    });
  } catch (err) {
    console.error('[admin] upload error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Upload failed.' });
  }
});

// ---------- Artwork upload (returns a filename to reference) ----------
adminRouter.post('/artwork', imageUpload.single('artwork'), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'BAD_REQUEST', message: 'No image file provided.' });
  res.json({ filename: req.file.filename, path: publicPaths(req.file.filename, 'artwork') });
});

// ---------- Bulk publish: staged audio + metadata + optional artwork ----------
adminRouter.post('/songs/publish', async (req: any, res) => {
  try {
    const { tracks } = req.body ?? {};
    if (!Array.isArray(tracks) || !tracks.length) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'No tracks to publish.' });
    }
    const results = [];
    for (const track of tracks) {
      const { stagingId, title, artist, album, albumArtist, genre, releaseDate, trackNumber, discNumber, description, lyric, artworkPath, artworkFilename } = track ?? {};
      if (!stagingId || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'BAD_REQUEST', message: 'Each track needs a staging id and a title.' });
      }
      const staged = takeStaging(stagingId);
      if (!staged) {
        return res.status(400).json({ error: 'BAD_REQUEST', message: 'Staged upload expired; please upload the audio again.' });
      }

      const artwork = (artworkPath as string) || (artworkFilename ? publicPaths(artworkFilename, 'artwork') : null);

      let artistRecord = null;
      let albumRecord = null;
      if (typeof artist === 'string' && artist.trim()) {
        artistRecord = await prisma.artist.upsert({
          where: { name: artist.trim() },
          update: {},
          create: { name: artist.trim() },
        });
      }
      if (artistRecord && typeof album === 'string' && album.trim()) {
        const existingAlbum = await prisma.album.findFirst({
          where: { title: album.trim(), artistId: artistRecord.id },
        });
        albumRecord =
          existingAlbum ??
          (await prisma.album.create({
            data: { title: album.trim(), artistId: artistRecord.id, artworkPath: artwork },
          }));
      }

      const song = await prisma.song.create({
        data: {
          title: title.trim().slice(0, 300),
          artistId: artistRecord?.id,
          albumId: albumRecord?.id,
          audioPath: publicPaths(path.basename(staged.filePath), 'audio'),
          artworkPath: artwork,
          duration: 0,
          genre: typeof genre === 'string' && genre.trim() ? genre.trim().slice(0, 100) : null,
          releaseDate: releaseDate ? new Date(releaseDate) : null,
          trackNumber: Number.isFinite(trackNumber) ? trackNumber : null,
          discNumber: Number.isFinite(discNumber) ? discNumber : null,
          description: typeof description === 'string' && description.trim() ? description.trim().slice(0, 2000) : null,
          lyric: typeof lyric === 'string' && lyric.trim() ? lyric.trim() : null,
        },
        include: { artist: true, album: true },
      });

      // Re-read duration from the file so seeking works correctly.
      try {
        const meta = await parseFile(staged.filePath);
        await prisma.song.update({
          where: { id: song.id },
          data: { duration: Math.round((meta.format.duration ?? 0) * 100) / 100 },
        });
        song.duration = Math.round((meta.format.duration ?? 0) * 100) / 100;
      } catch {
        /* duration stays 0; player handles it */
      }

      results.push(song);
    }
    res.json({ songs: results });
  } catch (err) {
    console.error('[admin] publish error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Publish failed.' });
  }
});

// ---------- Full metadata update ----------
adminRouter.put('/songs/:id', async (req: any, res) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.song.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'NOT_FOUND', message: 'Song not found.' });

    const { title, artist, album, albumArtist, genre, releaseDate, trackNumber, discNumber, description, lyric, artworkPath } = req.body ?? {};

    let artistId = existing.artistId;
    let albumId = existing.albumId;
    if (typeof artist === 'string' && artist.trim()) {
      const artistRecord = await prisma.artist.upsert({
        where: { name: artist.trim() },
        update: {},
        create: { name: artist.trim() },
      });
      artistId = artistRecord.id;
      if (typeof album === 'string' && album.trim()) {
        let albumRecord = await prisma.album.findFirst({ where: { title: album.trim(), artistId: artistRecord.id } });
        albumRecord = await prisma.album.upsert({
          where: albumRecord ? { id: albumRecord.id } : { id: '' },
          update: {},
          create: { title: album.trim(), artistId: artistRecord.id },
        });
        albumId = albumRecord.id;
      }
    }

    const updated = await prisma.song.update({
      where: { id },
      data: {
        title: typeof title === 'string' && title.trim() ? title.trim().slice(0, 300) : existing.title,
        artistId,
        albumId,
        genre: typeof genre === 'string' && genre.trim() ? genre.trim().slice(0, 100) : existing.genre,
        releaseDate: releaseDate ? new Date(releaseDate) : existing.releaseDate,
        trackNumber: Number.isFinite(trackNumber) ? trackNumber : existing.trackNumber,
        discNumber: Number.isFinite(discNumber) ? discNumber : existing.discNumber,
        description: typeof description === 'string' ? description.slice(0, 2000) : existing.description,
        lyric: typeof lyric === 'string' ? lyric.trim() : existing.lyric,
        artworkPath: typeof artworkPath === 'string' ? artworkPath : existing.artworkPath,
      },
      include: { artist: true, album: true },
    });
    res.json({ song: updated });
  } catch (err) {
    console.error('[admin] update error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Update failed.' });
  }
});

// ---------- Replace audio file ----------
adminRouter.post('/songs/:id/audio', upload.single('audio'), async (req: any, res) => {
  try {
    const song = await prisma.song.findUnique({ where: { id: req.params.id } });
    if (!song) return res.status(404).json({ error: 'NOT_FOUND', message: 'Song not found.' });
    const file: Express.Multer.File | undefined = req.file;
    if (!file) return res.status(400).json({ error: 'BAD_REQUEST', message: 'No audio file provided.' });

    let duration = 0;
    try {
      const meta = await parseFile(file.path);
      duration = Math.round((meta.format.duration ?? 0) * 100) / 100;
    } catch {
      /* ignore */
    }
    const old = resolveStored(song.audioPath);
    const updated = await prisma.song.update({
      where: { id: song.id },
      data: {
        audioPath: publicPaths(path.basename(file.path), 'audio'),
        duration,
      },
    });
    deleteFile(old);
    res.json({ song: updated });
  } catch (err) {
    console.error('[admin] replace audio error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Replace failed.' });
  }
});

// ---------- Delete song (DB + files) ----------
adminRouter.delete('/songs/:id', async (req: any, res) => {
  try {
    const song = await prisma.song.findUnique({
      where: { id: req.params.id },
      include: { likes: true, recentPlays: true, playlistTracks: true },
    });
    if (!song) return res.status(404).json({ error: 'NOT_FOUND', message: 'Song not found.' });

    await prisma.$transaction([
      prisma.like.deleteMany({ where: { songId: song.id } }),
      prisma.recentlyPlayed.deleteMany({ where: { songId: song.id } }),
      prisma.playlistTrack.deleteMany({ where: { songId: song.id } }),
      prisma.song.delete({ where: { id: song.id } }),
    ]);
    deleteFile(resolveStored(song.audioPath));
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin] delete error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Delete failed.' });
  }
});

// ---------- Admin stats ----------
adminRouter.get('/stats', async (_req, res) => {
  try {
    const [songs, albums, artists, users] = await Promise.all([
      prisma.song.count(),
      prisma.album.count(),
      prisma.artist.count(),
      prisma.user.count(),
    ]);
    res.json({
      stats: {
        songs,
        albums,
        artists,
        users,
        storage: {
          audio: statSize(AUDIO_DIR),
          artwork: statSize(ARTWORK_DIR),
        },
      },
    });
  } catch (err) {
    console.error('[admin] stats error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

// ---------- Artists admin CRUD ----------
adminRouter.post('/artists', async (req: any, res) => {
  try {
    const { name, bio } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Artist name is required.' });
    }
    const artist = await prisma.artist.create({ data: { name: name.trim(), bio: bio ?? null } });
    res.status(201).json({ artist });
  } catch (err) {
    console.error('[admin] artist create error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Create failed.' });
  }
});

adminRouter.delete('/artists/:id', async (req: any, res) => {
  try {
    await prisma.artist.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin] artist delete error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Delete failed (artist may still have albums).' });
  }
});

// ---------- Albums admin CRUD ----------
adminRouter.post('/albums', async (req: any, res) => {
  try {
    const { title, artistId } = req.body ?? {};
    if (typeof title !== 'string' || !title.trim() || !artistId) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Album title and artist are required.' });
    }
    const album = await prisma.album.create({ data: { title: title.trim(), artistId } });
    res.status(201).json({ album });
  } catch (err) {
    console.error('[admin] album create error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Create failed.' });
  }
});

adminRouter.delete('/albums/:id', async (req: any, res) => {
  try {
    await prisma.album.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin] album delete error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Delete failed.' });
  }
});

// ---------- Public artwork serving (safe filename) ----------
export const artworkRouter: Router = Router();
artworkRouter.get('/:filename', streamAuth(), (req, res) => {
  const filename = req.params.filename;
  if (!/^[\w.-]+$/.test(filename)) return res.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid filename.' });
  const absolute = resolveStored(`uploads/artwork/${filename}`);
  if (!absolute) return res.status(404).json({ error: 'NOT_FOUND', message: 'Artwork not found.' });
  res.sendFile(absolute);
});