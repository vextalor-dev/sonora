import { API_BASE } from './config';

export interface Artist {
  id: string;
  name: string;
  bio: string | null;
  artworkPath: string | null;
  createdAt: string;
  _count?: { songs: number; albums: number };
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  artworkPath: string | null;
  createdAt: string;
  artist: Artist;
  songs?: Song[];
}

export interface Song {
  id: string;
  title: string;
  artistId: string | null;
  albumId: string | null;
  audioPath: string;
  artworkPath: string | null;
  duration: number;
  genre: string | null;
  releaseDate: string | null;
  trackNumber: number | null;
  discNumber: number | null;
  description: string | null;
  lyric: string | null;
  playCount: number;
  audioSize: number;
  createdAt: string;
  artist: Artist | null;
  album: Album | null;
}

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: string;
  tracks: PlaylistTrack[];
}

export interface PlaylistTrack {
  id: string;
  playlistId: string;
  songId: string;
  position: number;
  song: Song;
}

export interface Like {
  id: string;
  songId: string;
  song: Song;
}

export interface RecentlyPlayed {
  id: string;
  songId: string;
  playedAt: string;
  song: Song;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: 'USER' | 'ADMIN';
}

export function artworkUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const token = localStorage.getItem('sonora_token');
  return `${API_BASE}/api/artwork/${encodeURIComponent(path.split('/').pop() || '')}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}

export function formatDuration(sec: number): string {
  if (!sec || !isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}