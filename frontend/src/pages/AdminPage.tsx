import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Music2, Upload, X } from 'lucide-react';
import { adminApi, songApi } from '../api';
import type { Song } from '../types';
import { EmptyState, Spinner } from '../components/ui';

type Staging = { stagingId: string; originalName: string; size: number; meta?: { title?: string; artist?: string; album?: string; genre?: string; trackNumber?: number | null } };

export function AdminPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<Staging | null>(null);
  const [pubBusy, setPubBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [editing, setEditing] = useState<Song | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editAlbum, setEditAlbum] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editArtwork, setEditArtwork] = useState<File | null>(null);

  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [albumTitle, setAlbumTitle] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [genre, setGenre] = useState('');
  const [trackNo, setTrackNo] = useState(0);
  const [artwork, setArtwork] = useState<File | null>(null);

  const load = () => songApi.list().then((r) => setSongs(r.songs)).catch((e: any) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const doUpload = async (file: File) => {
    if (!file) return;
    setUploading(file.name);
    setProgress(0);
    setErr('');
    setMsg('');
    try {
      const r = await adminApi.uploadAudio(file, (pct) => setProgress(pct));
      setStage(r);
      setTitle(r.meta?.title || file.name.replace(/\.[^.]+$/, ''));
      setArtistName(r.meta?.artist || '');
      setAlbumTitle(r.meta?.album || '');
      setGenre(r.meta?.genre || '');
      setTrackNo(r.meta?.trackNumber || 0);
      setMsg('');
    } catch (e: any) {
      setErr(e.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stage) return;
    setPubBusy(true);
    setErr('');
    try {
      let artworkPath: string | null = null;
      if (artwork) {
        const up = await adminApi.uploadArtwork(artwork);
        artworkPath = up.path;
      }
      const r = await adminApi.publish([{
        stagingId: stage.stagingId,
        title,
        artist: artistName,
        album: albumTitle,
        releaseDate: Number(year) ? new Date(`${year}-01-01`).toISOString() : undefined,
        genre,
        trackNumber: Number(trackNo) || undefined,
        artworkPath,
      }]);
      if (stage.stagingId) {
        setMsg(`Published “${r.songs[0]?.title}” — playable and searchable now.`);
      }
      setStage(null);
      setTitle(''); setArtistName(''); setAlbumTitle(''); setGenre('');
      setTrackNo(0); setYear(new Date().getFullYear()); setArtwork(null);
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (e2: any) {
      setErr(e2.message || 'Publish failed');
    } finally {
      setPubBusy(false);
    }
  };

  const delSong = async (s: Song) => {
    if (!confirm(`Delete “${s.title}”? The audio file is removed from disk too.`)) return;
    await adminApi.deleteSong(s.id);
    load();
  };

  const openEdit = (s: Song) => {
    setEditing(s);
    setEditTitle(s.title);
    setEditArtist(s.artist?.name || '');
    setEditAlbum(s.album?.title || '');
    setEditGenre(s.genre || '');
    setEditArtwork(null);
    setErr('');
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setPubBusy(true);
    setErr('');
    try {
      let artworkPath: string | null = null;
      if (editArtwork) {
        const up = await adminApi.uploadArtwork(editArtwork);
        artworkPath = up.path;
      }
      await adminApi.updateSong(editing.id, {
        title: editTitle,
        artist: editArtist,
        album: editAlbum,
        genre: editGenre,
        artworkPath,
      });
      setMsg(`Saved changes for “${editing.title}”.`);
      setEditing(null);
      load();
    } catch (e2: any) {
      setErr(e2.message || 'Save failed');
    } finally {
      setPubBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight">Admin</h1>
        <p className="text-sm text-muted">Upload music, publish it, manage the library. This dashboard is only visible to admins.</p>
      </div>

      <section className="rounded-2xl border border-edge bg-surface p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Upload className="h-5 w-5 text-accent" /> Upload audio</h2>
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); doUpload(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${drag ? 'border-accent bg-accent/10' : 'border-edge bg-bg hover:border-accent/50'}`}
        >
          <Music2 className="h-10 w-10 text-muted" />
          {uploading ? (
            <>
              <p className="text-sm font-medium">Uploading {uploading}… {Math.round(progress)}%</p>
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-edge">
                <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Drop an audio file here, or click to browse</p>
              <p className="text-xs text-muted">mp3, m4a/aac, flac, wav, ogg — metadata is filled in by you on the next step</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { doUpload(e.target.files?.[0] as File); e.target.value = ''; }} />
      </section>

      {stage && (
        <section className="animate-card rounded-2xl border border-accent/40 bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Publish: <span className="text-accent">{stage.originalName}</span></h2>
            <button onClick={() => setStage(null)} className="rounded-full p-1.5 text-muted hover:bg-edge hover:text-txt"><X className="h-4 w-4" /></button>
          </div>
          <p className="mb-4 text-xs text-muted">{(stage.size / 1024 / 1024).toFixed(1)} MB staged — fill in the details and publish to the library.</p>
          <form onSubmit={publish} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-muted">Title*
                <input required value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl border border-edge bg-bg px-4 py-2.5 text-sm text-txt outline-none focus:border-accent" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">Artist*
                <input required value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Will be created if new" className="rounded-xl border border-edge bg-bg px-4 py-2.5 text-sm text-txt outline-none focus:border-accent" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">Album
                <input value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} placeholder="Will be created if new (optional)" className="rounded-xl border border-edge bg-bg px-4 py-2.5 text-sm text-txt outline-none focus:border-accent" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">Genre
                <input value={genre} onChange={(e) => setGenre(e.target.value)} className="rounded-xl border border-edge bg-bg px-4 py-2.5 text-sm text-txt outline-none focus:border-accent" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">Year
                <input type="number" value={year} onChange={(e) => setYear(+e.target.value)} className="rounded-xl border border-edge bg-bg px-4 py-2.5 text-sm text-txt outline-none focus:border-accent" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">Track number
                <input type="number" value={trackNo || ''} onChange={(e) => setTrackNo(+e.target.value)} placeholder="1" className="rounded-xl border border-edge bg-bg px-4 py-2.5 text-sm text-txt outline-none focus:border-accent" />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Cover art <span className="text-[10px] text-muted/50">jpg / png / webp — becomes the album & song artwork (optional)</span>
              <input type="file" accept="image/*" onChange={(e) => setArtwork(e.target.files?.[0] || null)} className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface2 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-txt" />
            </label>
            {err && <p className="text-xs text-red-400">{err}</p>}
            {msg && <p className="text-xs text-green-500">{msg}</p>}
            <button type="submit" disabled={pubBusy} className="flex w-fit items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-50">
              {pubBusy && <Loader2 className="h-4 w-4 animate-spin" />} Publish to library
            </button>
          </form>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">Library <span className="text-xs font-normal text-muted">({songs ? songs.length : '…'} songs)</span></h2>
        {!songs ? (
          <div className="flex justify-center py-12"><Spinner className="h-6 w-6 text-accent" /></div>
        ) : songs.length === 0 ? (
          <EmptyState title="The library is empty" hint="Upload your first track above." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-edge">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-surface2 text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Artist</th>
                  <th className="px-4 py-3 font-medium">Album</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 font-medium">Played</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {songs.map((s) => (
                  <tr key={s.id} className="bg-surface hover:bg-surface2">
                    <td className="max-w-[220px] truncate px-4 py-3">{s.title}</td>
                    <td className="px-4 py-3 text-muted">{s.artist?.name}</td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-muted">{s.album?.title ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{(s.audioSize / 1024 / 1024).toFixed(1)} MB</td>
                    <td className="px-4 py-3 text-muted">{s.playCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(s)} className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-surface2">
                          Edit
                        </button>
                        <button onClick={() => delSong(s)} className="rounded-lg px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/40">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-sm">
          <form onSubmit={saveEdit} className="w-full max-w-md animate-card rounded-2xl border border-edge bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Edit song</h3>
              <button type="button" onClick={() => setEditing(null)} className="rounded-full p-1.5 text-muted hover:bg-edge">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3">
              <label className="flex flex-col gap-1 text-xs text-muted">Title*
                <input required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="rounded-xl border border-edge bg-bg px-4 py-2.5 text-sm text-txt outline-none focus:border-accent" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">Artist
                <input value={editArtist} onChange={(e) => setEditArtist(e.target.value)} className="rounded-xl border border-edge bg-bg px-4 py-2.5 text-sm text-txt outline-none focus:border-accent" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">Album
                <input value={editAlbum} onChange={(e) => setEditAlbum(e.target.value)} className="rounded-xl border border-edge bg-bg px-4 py-2.5 text-sm text-txt outline-none focus:border-accent" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">Genre
                <input value={editGenre} onChange={(e) => setEditGenre(e.target.value)} className="rounded-xl border border-edge bg-bg px-4 py-2.5 text-sm text-txt outline-none focus:border-accent" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Cover art (optional — replaces existing)
                <input type="file" accept="image/*" onChange={(e) => setEditArtwork(e.target.files?.[0] || null)} className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface2 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-txt" />
              </label>
              {err && <p className="text-xs text-red-400">{err}</p>}
              <button type="submit" disabled={pubBusy} className="mt-1 rounded-xl bg-accent py-3 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-50">
                {pubBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}