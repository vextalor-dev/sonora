import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { libraryApi } from '../api';
import type { Album, Artist, Song } from '../types';
import { SongRow } from '../components/SongRow';
import { EmptyState, LazyArtwork } from '../components/ui';

export function SearchPage() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<{ songs: Song[]; artists: Artist[]; albums: Album[] } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (!term) { setRes(null); return; }
    setBusy(true);
    const t = setTimeout(() => {
      libraryApi.search(term).then((r) => setRes(r)).catch(() => setRes(null)).finally(() => setBusy(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 -mx-4 bg-bg/90 px-4 pb-3 pt-4 backdrop-blur">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search songs, artists, albums…"
            className="w-full rounded-full border border-edge bg-surface py-3 pl-11 pr-4 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      {!q.trim() && <EmptyState title="Type something to search the library" />}
      {res && (
        <>
          {res.songs.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-bold">Songs</h2>
              <div className="flex flex-col gap-1">{res.songs.map((s) => <SongRow key={s.id} song={s} />)}</div>
            </section>
          )}
          {res.artists.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold">Artists</h2>
              <div className="flex flex-wrap gap-4">
                {res.artists.map((a) => (
                  <Link key={a.id} to={`/artists/${a.id}`} className="flex items-center gap-3 rounded-xl border border-edge bg-surface p-3 pr-6 hover:bg-surface2">
                    <div className="h-10 w-10 rounded-full bg-surface2" />
                    <span className="text-sm font-medium">{a.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {res.albums.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold">Albums</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {res.albums.map((alb) => (
                  <Link key={alb.id} to={`/albums/${alb.id}`} className="group">
                    <LazyArtwork song={{ artworkPath: alb.artworkPath, album: null, artist: null } as any} className="h-36 w-full sm:h-40" />
                    <p className="mt-2 truncate text-sm font-medium group-hover:text-accent">{alb.title}</p>
                    <p className="truncate text-xs text-muted">{alb.artist?.name}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {res.songs.length === 0 && res.artists.length === 0 && res.albums.length === 0 && (
            <EmptyState title={`No results for “${q}”`} />
          )}
        </>
      )}
      {busy && <p className="text-center text-xs text-muted">Searching…</p>}
    </div>
  );
}