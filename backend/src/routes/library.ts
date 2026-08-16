import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../lib/auth.js';

export const libraryRouter: Router = Router();
libraryRouter.use(authRequired());

// Home feed: recently added, popular, albums, artists, recently played (auth).
libraryRouter.get('/home', async (req, res) => {
  try {
    const user = (req as any).user;
    const [recentlyAdded, popular, albums, artists, recentlyPlayed] = await Promise.all([
      prisma.song.findMany({ orderBy: { createdAt: 'desc' }, take: 20, include: { artist: true, album: true } }),
      prisma.song.findMany({ orderBy: { playCount: 'desc' }, take: 20, include: { artist: true, album: true } }),
      prisma.album.findMany({ orderBy: { createdAt: 'desc' }, take: 20, include: { artist: true, songs: true } }),
      prisma.artist.findMany({ orderBy: { name: 'asc' }, take: 20, include: { _count: { select: { songs: true } } } }),
      prisma.recentlyPlayed.findMany({
        where: { userId: user.id },
        orderBy: { playedAt: 'desc' },
        take: 50,
        include: { song: { include: { artist: true, album: true } } },
      }),
    ]);
    res.json({ recentlyAdded, popular, albums, artists, recentlyPlayed });
  } catch (err) {
    console.error('[library] home error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

// Search across songs, artists, albums.
libraryRouter.get('/search', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) return res.json({ songs: [], artists: [], albums: [] });
    const [songs, artists, albums] = await Promise.all([
      prisma.song.findMany({ where: { OR: [{ title: { contains: q } }, { artist: { name: { contains: q } } }] }, take: 20, include: { artist: true, album: true } }),
      prisma.artist.findMany({ where: { name: { contains: q } }, take: 10, include: { _count: { select: { songs: true } } } }),
      prisma.album.findMany({ where: { OR: [{ title: { contains: q } }, { artist: { name: { contains: q } } }] }, take: 10, include: { artist: true } }),
    ]);
    res.json({ songs, artists, albums });
  } catch (err) {
    console.error('[library] search error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

// Artists list + detail.
libraryRouter.get('/artists', async (_req, res) => {
  try {
    const artists = await prisma.artist.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { songs: true, albums: true } } },
    });
    res.json({ artists });
  } catch (err) {
    console.error('[library] artists error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

libraryRouter.get('/artists/:id', async (req, res) => {
  try {
    const artist = await prisma.artist.findUnique({
      where: { id: req.params.id },
      include: {
        albums: { include: { _count: { select: { songs: true } } } },
        songs: { include: { album: true, artist: true }, orderBy: { playCount: 'desc' } },
      },
    });
    if (!artist) return res.status(404).json({ error: 'NOT_FOUND', message: 'Artist not found.' });
    res.json({ artist });
  } catch (err) {
    console.error('[library] artist error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

// Albums list + detail.
libraryRouter.get('/albums', async (_req, res) => {
  try {
    const albums = await prisma.album.findMany({
      orderBy: { createdAt: 'desc' },
      include: { artist: true, songs: { include: { artist: true } } },
    });
    res.json({ albums });
  } catch (err) {
    console.error('[library] albums error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

libraryRouter.get('/albums/:id', async (req, res) => {
  try {
    const album = await prisma.album.findUnique({
      where: { id: req.params.id },
      include: {
        artist: true,
        songs: {
          include: { album: true, artist: true },
          orderBy: [{ discNumber: 'asc' }, { trackNumber: 'asc' }],
        },
      },
    });
    if (!album) return res.status(404).json({ error: 'NOT_FOUND', message: 'Album not found.' });
    res.json({ album });
  } catch (err) {
    console.error('[library] album error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

// ---------- Playlists ----------
libraryRouter.get('/playlists', async (req, res) => {
  try {
    const user = (req as any).user;
    const playlists = await prisma.playlist.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { tracks: { include: { song: { include: { artist: true, album: true } } }, orderBy: { position: 'asc' } } },
    });
    res.json({ playlists });
  } catch (err) {
    console.error('[library] playlists error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

libraryRouter.post('/playlists', async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, description } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Playlist name is required.' });
    }
    const playlist = await prisma.playlist.create({
      data: { name: name.trim().slice(0, 120), description: typeof description === 'string' ? description.slice(0, 500) : null, userId: user.id },
    });
    res.status(201).json({ playlist });
  } catch (err) {
    console.error('[library] playlist create error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

libraryRouter.get('/playlists/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const playlist = await prisma.playlist.findFirst({
      where: { id: req.params.id, userId: user.id },
      include: { tracks: { include: { song: { include: { artist: true, album: true } } }, orderBy: { position: 'asc' } } },
    });
    if (!playlist) return res.status(404).json({ error: 'NOT_FOUND', message: 'Playlist not found.' });
    res.json({ playlist });
  } catch (err) {
    console.error('[library] playlist error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

libraryRouter.put('/playlists/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, description } = req.body ?? {};
    const playlist = await prisma.playlist.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!playlist) return res.status(404).json({ error: 'NOT_FOUND', message: 'Playlist not found.' });
    const updated = await prisma.playlist.update({
      where: { id: playlist.id },
      data: {
        name: typeof name === 'string' && name.trim() ? name.trim().slice(0, 120) : playlist.name,
        description: typeof description === 'string' ? description.slice(0, 500) : playlist.description,
      },
    });
    res.json({ playlist: updated });
  } catch (err) {
    console.error('[library] playlist update error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

libraryRouter.delete('/playlists/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const playlist = await prisma.playlist.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!playlist) return res.status(404).json({ error: 'NOT_FOUND', message: 'Playlist not found.' });
    await prisma.playlist.delete({ where: { id: playlist.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[library] playlist delete error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

libraryRouter.post('/playlists/:id/tracks', async (req, res) => {
  try {
    const user = (req as any).user;
    const { songId, position } = req.body ?? {};
    const playlist = await prisma.playlist.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!playlist) return res.status(404).json({ error: 'NOT_FOUND', message: 'Playlist not found.' });
    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song) return res.status(400).json({ error: 'BAD_REQUEST', message: 'Song not found.' });
    const maxPos = await prisma.playlistTrack.aggregate({
      where: { playlistId: playlist.id },
      _max: { position: true },
    });
    const nextPos = typeof position === 'number' ? position : (maxPos._max.position ?? -1) + 1;
    const track = await prisma.playlistTrack.create({
      data: { playlistId: playlist.id, songId, position: nextPos },
    });
    res.status(201).json({ track });
  } catch (err) {
    console.error('[library] playlist add track error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

libraryRouter.delete('/playlists/:id/tracks/:trackId', async (req, res) => {
  try {
    const user = (req as any).user;
    const playlist = await prisma.playlist.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!playlist) return res.status(404).json({ error: 'NOT_FOUND', message: 'Playlist not found.' });
    await prisma.playlistTrack.deleteMany({ where: { playlistId: playlist.id, id: req.params.trackId } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[library] playlist remove track error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

// Reorder tracks: send array of track ids in desired order.
libraryRouter.put('/playlists/:id/tracks/order', async (req, res) => {
  try {
    const user = (req as any).user;
    const { trackIds } = req.body ?? {};
    if (!Array.isArray(trackIds)) return res.status(400).json({ error: 'BAD_REQUEST', message: 'trackIds required.' });
    const playlist = await prisma.playlist.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!playlist) return res.status(404).json({ error: 'NOT_FOUND', message: 'Playlist not found.' });
    await prisma.$transaction(
      trackIds.map((id, idx) =>
        prisma.playlistTrack.updateMany({ where: { playlistId: playlist.id, id }, data: { position: idx } }),
      ),
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[library] playlist reorder error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

// ---------- Likes ----------
libraryRouter.get('/likes', async (req, res) => {
  try {
    const user = (req as any).user;
    const likes = await prisma.like.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { song: { include: { artist: true, album: true } } },
    });
    res.json({ likes });
  } catch (err) {
    console.error('[library] likes error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

libraryRouter.post('/likes/:songId', async (req, res) => {
  try {
    const user = (req as any).user;
    const song = await prisma.song.findUnique({ where: { id: req.params.songId } });
    if (!song) return res.status(404).json({ error: 'NOT_FOUND', message: 'Song not found.' });
    await prisma.like.upsert({
      where: { userId_songId: { userId: user.id, songId: song.id } },
      update: {},
      create: { userId: user.id, songId: song.id },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[library] like error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

libraryRouter.delete('/likes/:songId', async (req, res) => {
  try {
    const user = (req as any).user;
    await prisma.like.deleteMany({ where: { userId: user.id, songId: req.params.songId } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[library] unlike error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});

// ---------- Recently played ----------
libraryRouter.get('/recently-played', async (req, res) => {
  try {
    const user = (req as any).user;
    const entries = await prisma.recentlyPlayed.findMany({
      where: { userId: user.id },
      orderBy: { playedAt: 'desc' },
      take: 50,
      include: { song: { include: { artist: true, album: true } } },
    });
    res.json({ recentlyPlayed: entries });
  } catch (err) {
    console.error('[library] recently error:', err);
    res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
  }
});