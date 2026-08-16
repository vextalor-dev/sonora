import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Heart, ListMusic, Plus } from 'lucide-react';
import { libraryApi } from '../api';
import type { Like, Playlist, RecentlyPlayed, Song } from '../types';
import { SongRow } from '../components/SongRow';
import { EmptyState, LazyArtwork, Spinner } from '../components/ui';
import { usePlayer } from '../store';

export function LibraryPage({ initialTab = 'playlists' }: { initialTab?: 'playlists' | 'liked' | 'recent' }) {
  const [tab, setTab] = useState<'playlists' | 'liked' | 'recent'>(initialTab);
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);
  const [liked, setLiked] = useState<Like[] | null>(null);
  const [recent, setRecent] = useState<RecentlyPlayed[] | null>(null);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const player = usePlayer();

  const load = () => {
    libraryApi.playlists().then((r) => setPlaylists(r.playlists)).catch((e: any) => setErr(e.message));
    libraryApi.likes().then((r) => setLiked(r.likes)).catch(() => {});
    libraryApi.recentlyPlayed().then((r) => setRecent(r.recentlyPlayed)).catch(() => {});
  };
  useEffect(load, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await libraryApi.createPlaylist(name.trim());
    setName('');
    load();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {(['playlists', 'liked', 'recent'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm capitalize ${tab === t ? 'bg-txt text-bg' : 'bg-surface2 text-muted hover:text-txt'}`}
          >
            {t === 'playlists' ? 'Playlists' : t === 'liked' ? 'Liked Songs' : 'Recently Played'}
          </button>
        ))}
      </div>

      {tab === 'playlists' && (
        <>
          <form onSubmit={create} className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New playlist name"
              className="flex-1 rounded-xl border border-edge bg-surface px-4 py-2.5 text-sm outline-none focus:border-accent"
            />
            <button type="submit" className="flex items-center gap-1 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-bg hover:opacity-90">
              <Plus className="h-4 w-4" /> Create
            </button>
          </form>
          {err && <p className="text-xs text-red-400">{err}</p>}
          {!playlists ? (
            <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-accent" /></div>
          ) : playlists.length === 0 ? (
            <EmptyState title="No playlists yet" hint="Create one above, then add songs with the “+” menu on any track." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {playlists.map((p) => (
                <Link key={p.id} to={`/playlists/${p.id}`} className="group flex items-center gap-3 rounded-xl border border-edge bg-surface p-3 hover:bg-surface2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface2 text-muted">
                    <ListMusic className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium group-hover:text-accent">{p.name}</p>
                    <p className="text-xs text-muted">{p.tracks.length} songs</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'liked' && (
        <>
          <h2 className="flex items-center gap-2 text-lg font-bold"><Heart className="h-5 w-5 text-accent" /> Liked Songs</h2>
          {!liked ? (
            <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-accent" /></div>
          ) : liked.length === 0 ? (
            <EmptyState title="No liked songs" hint="Tap the heart on any track." />
          ) : (
            <div className="flex flex-col gap-1">{liked.map((l) => <SongRow key={l.songId} song={l.song} />)}</div>
          )}
        </>
      )}

      {tab === 'recent' && (
        <>
          <h2 className="flex items-center gap-2 text-lg font-bold"><Clock className="h-5 w-5 text-accent" /> Recently Played</h2>
          {!recent ? (
            <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-accent" /></div>
          ) : recent.length === 0 ? (
            <EmptyState title="Nothing played yet" />
          ) : (
            <div className="flex flex-col gap-1">{recent.map((r) => <SongRow key={r.id} song={r.song} />)}</div>
          )}
        </>
      )}
    </div>
  );
}