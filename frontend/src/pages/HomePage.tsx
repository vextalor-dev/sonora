import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Heart, Play, Radio, TrendingUp } from 'lucide-react';
import { libraryApi } from '../api';
import type { Album, Artist, Song, RecentlyPlayed } from '../types';
import { SongRow } from '../components/SongRow';
import { artUrl } from '../utils';
import { EmptyState, LazyArtwork, Spinner } from '../components/ui';
import { usePlayer } from '../store';
import { msStatus } from '../mediaSession';

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
      <span className="text-accent">{icon}</span>
      {label}
    </h2>
  );
}

export function HomePage() {
  const [data, setData] = useState<{ recentlyAdded: Song[]; popular: Song[]; albums: Album[]; artists: Artist[]; recentlyPlayed: RecentlyPlayed[] } | null>(null);
  const [err, setErr] = useState('');
  const player = usePlayer();

  useEffect(() => {
    libraryApi.home().then(setData).catch((e: any) => setErr(e.message));
  }, []);

  if (err) return <EmptyState title={err} />;
  if (!data) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-accent" /></div>;

  const playRow = (songs: Song[], i: number) => {
    player.play(songs, i);
    player.setOverlayOpen(true);
  };

  return (
    <div className="flex flex-col gap-10">
      <section className="animate-card">
        <h1 className="text-3xl font-extrabold tracking-tight text-gradient">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted">Here is what is happening on your server.</p>
      </section>

      {msStatus.native ? (
        <div className="animate-card flex items-center gap-2 rounded-lg border border-edge bg-surface/60 px-3 py-2 text-[11px] text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${msStatus.step.startsWith('init') ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          phone bridge: {msStatus.step} · {msStatus.perm || 'perm:?'} · {msStatus.detail.slice(0, 48) || '…'}
        </div>
      ) : null}

      <section>
        <SectionTitle icon={<Clock className="h-5 w-5" />} label="Recently Played" />
        {data.recentlyPlayed.length === 0 ? (
          <EmptyState title="Nothing played yet" hint="Play any song and it will show up here." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.recentlyPlayed.slice(0, 6).map((r) => (
              <div
                key={r.id}
                onClick={() => playRow([r.song], 0)}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-edge bg-surface p-3 transition-colors hover:bg-surface2"
              >
                <LazyArtwork song={r.song} className="h-11 w-11" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.song.title}</p>
                  <p className="truncate text-xs text-muted">{r.song.artist?.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle icon={<TrendingUp className="h-5 w-5" />} label="Popular" />
        <div className="flex flex-col gap-1">
          {data.popular.slice(0, 10).map((s) => <SongRow key={s.id} song={s} />)}
        </div>
      </section>

      <section>
        <SectionTitle icon={<Play className="h-5 w-5" />} label="Recently Added" />
        <div className="flex flex-col gap-1">
          {data.recentlyAdded.slice(0, 10).map((s) => <SongRow key={s.id} song={s} />)}
        </div>
      </section>

      <section>
        <SectionTitle icon={<Heart className="h-5 w-5" />} label="Albums" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {data.albums.map((alb) => (
            <Link key={alb.id} to={`/albums/${alb.id}`} className="group animate-card">
              <LazyArtwork song={{ artworkPath: alb.artworkPath, album: null, artist: null } as any} className="h-40 w-full sm:h-44" />
              <p className="mt-2 truncate text-sm font-medium group-hover:text-accent">{alb.title}</p>
              <p className="truncate text-xs text-muted">{alb.artist?.name}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle icon={<Radio className="h-5 w-5" />} label="Artists" />
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {data.artists.map((a) => (
            <Link key={a.id} to={`/artists/${a.id}`} className="group flex flex-col items-center gap-2 text-center">
              <div className="h-24 w-24 overflow-hidden rounded-full bg-surface2">
                {a.artworkPath ? (
                  <img src={`${artUrl(a.artworkPath) || ''}`} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted/30">{a.name[0]?.toUpperCase()}</div>
                )}
              </div>
              <p className="truncate text-sm group-hover:text-accent">{a.name}</p>
              <p className="text-[10px] text-muted">{a._count?.songs ?? 0} songs</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}