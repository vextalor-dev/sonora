import { useEffect, useState } from 'react';
import { libraryApi } from '../api';
import type { Playlist } from '../types';

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const refresh = () => libraryApi.playlists().then((r) => setPlaylists(r.playlists)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const addTrack = async (playlistId: string, songId: string) => {
    await libraryApi.addTrack(playlistId, songId);
    refresh();
  };

  return { playlists, refresh, addTrack };
}