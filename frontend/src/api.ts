import type { Album, Artist, Like, Playlist, RecentlyPlayed, Song, User } from './types';

const TOKEN_KEY = 'sonora_token';
const USER_KEY = 'sonora_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api${path}`, { ...options, headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.message) message = body.message;
    } catch {
      /* keep default */
    }
    if (res.status === 401) {
      clearSession();
      window.dispatchEvent(new CustomEvent('sonora:unauthorized'));
    }
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}

export const authApi = {
  register: (name: string, email: string, password: string) =>
    api<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email: string, password: string) =>
    api<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => api<{ user: User }>('/auth/me'),
};

export const songApi = {
  list: (q?: string) => api<{ songs: Song[] }>(`/songs${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  get: (id: string) => api<{ song: Song }>(`/songs/${id}`),
  play: (id: string) => api<{ ok: boolean }>(`/songs/${id}/play`, { method: 'POST' }),
  streamUrl: (id: string) => {
    const token = getToken();
    return `/api/songs/${id}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
};

export const libraryApi = {
  home: () => api<{ recentlyAdded: Song[]; popular: Song[]; albums: Album[]; artists: Artist[]; recentlyPlayed: RecentlyPlayed[] }>('/library/home'),
  search: (q: string) => api<{ songs: Song[]; artists: Artist[]; albums: Album[] }>(`/library/search?q=${encodeURIComponent(q)}`),
  artists: () => api<{ artists: Artist[] }>('/library/artists'),
  artist: (id: string) => api<{ artist: Artist & { albums: Album[]; songs: Song[] } }>(`/library/artists/${id}`),
  albums: () => api<{ albums: Album[] }>('/library/albums'),
  album: (id: string) => api<{ album: Album & { artist: Artist; songs: Song[] } }>(`/library/albums/${id}`),
  playlists: () => api<{ playlists: Playlist[] }>('/library/playlists'),
  createPlaylist: (name: string, description?: string) =>
    api<{ playlist: Playlist }>('/library/playlists', { method: 'POST', body: JSON.stringify({ name, description }) }),
  playlist: (id: string) => api<{ playlist: Playlist }>(`/library/playlists/${id}`),
  updatePlaylist: (id: string, patch: { name?: string; description?: string }) =>
    api<{ playlist: Playlist }>(`/library/playlists/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deletePlaylist: (id: string) => api<{ ok: boolean }>(`/library/playlists/${id}`, { method: 'DELETE' }),
  addTrack: (id: string, songId: string) =>
    api<{ track: Playlist['tracks'][number] }>(`/library/playlists/${id}/tracks`, { method: 'POST', body: JSON.stringify({ songId }) }),
  removeTrack: (id: string, trackId: string) =>
    api<{ ok: boolean }>(`/library/playlists/${id}/tracks/${trackId}`, { method: 'DELETE' }),
  reorderTracks: (id: string, trackIds: string[]) =>
    api<{ ok: boolean }>(`/library/playlists/${id}/tracks/order`, { method: 'PUT', body: JSON.stringify({ trackIds }) }),
  likes: () => api<{ likes: Like[] }>('/library/likes'),
  like: (songId: string) => api<{ ok: boolean }>(`/library/likes/${songId}`, { method: 'POST' }),
  unlike: (songId: string) => api<{ ok: boolean }>(`/library/likes/${songId}`, { method: 'DELETE' }),
  recentlyPlayed: () => api<{ recentlyPlayed: RecentlyPlayed[] }>('/library/recently-played'),
};

export const adminApi = {
  stats: () => api<{ stats: { songs: number; albums: number; artists: number; users: number; storage: { audio: number; artwork: number } } }>('/admin/stats'),
  uploadAudio: (file: File, onProgress?: (pct: number) => void) =>
    new Promise<{ stagingId: string; originalName: string; size: number; duration: number; meta: { title: string; artist: string; album: string; genre: string; trackNumber: number | null } }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/admin/songs/upload');
      if (getToken()) xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      });
      xhr.onload = () => {
        try {
          const body = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(body);
          else reject(new ApiError(body.message || 'Upload failed', xhr.status));
        } catch {
          reject(new ApiError('Upload failed', xhr.status));
        }
      };
      xhr.onerror = () => reject(new ApiError('Network error during upload', 0));
      const form = new FormData();
      form.append('audio', file);
      xhr.send(form);
    }),
  uploadArtwork: (file: File) => {
    const form = new FormData();
    form.append('artwork', file);
    return api<{ filename: string; path: string }>('/admin/artwork', { method: 'POST', body: form });
  },
  publish: (tracks: Array<Record<string, unknown>>) => api<{ songs: Song[] }>('/admin/songs/publish', { method: 'POST', body: JSON.stringify({ tracks }) }),
  updateSong: (id: string, patch: Record<string, unknown>) => api<{ song: Song }>(`/admin/songs/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  replaceAudio: (id: string, file: File, onProgress?: (pct: number) => void) =>
    new Promise<{ song: Song }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/admin/songs/${id}/audio`);
      if (getToken()) xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      });
      xhr.onload = () => {
        try {
          const body = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(body);
          else reject(new ApiError(body.message || 'Replace failed', xhr.status));
        } catch {
          reject(new ApiError('Replace failed', xhr.status));
        }
      };
      xhr.onerror = () => reject(new ApiError('Network error', 0));
      const form = new FormData();
      form.append('audio', file);
      xhr.send(form);
    }),
  deleteSong: (id: string) => api<{ ok: boolean }>(`/admin/songs/${id}`, { method: 'DELETE' }),
  createArtist: (name: string, bio?: string) => api<{ artist: Artist }>('/admin/artists', { method: 'POST', body: JSON.stringify({ name, bio }) }),
  deleteArtist: (id: string) => api<{ ok: boolean }>(`/admin/artists/${id}`, { method: 'DELETE' }),
  createAlbum: (title: string, artistId: string) => api<{ album: Album }>('/admin/albums', { method: 'POST', body: JSON.stringify({ title, artistId }) }),
  deleteAlbum: (id: string) => api<{ ok: boolean }>(`/admin/albums/${id}`, { method: 'DELETE' }),
};