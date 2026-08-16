import { create } from 'zustand';
import type { Song } from './types';
import { songApi } from './api';

export type RepMode = 'off' | 'all' | 'one';

interface PlayerState {
  queue: Song[];
  queuePos: number;
  current: Song | null;
  status: 'idle' | 'loading' | 'playing' | 'paused';
  time: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepMode;
  queueOpen: boolean;
  overlayOpen: boolean;

  play: (songs: Song[], startIndex?: number) => void;
  playNext: (song: Song) => void;
  toggle: () => void;
  next: (auto?: boolean) => void;
  prev: () => void;
  seek: (sec: number) => void;
  setTime: (t: number) => void;
  setDuration: (d: number) => void;
  setStatus: (s: PlayerState['status']) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  removeAt: (i: number) => void;
  move: (from: number, to: number) => void;
  clearQueue: () => void;
  setQueueOpen: (open: boolean) => void;
  setOverlayOpen: (open: boolean) => void;
  bumpPlayCount: (id: string) => void;
}

function shuffledOrder(n: number, start: number): number[] {
  const rest = Array.from({ length: n }, (_, i) => i).filter((i) => i !== start);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [start, ...rest];
}

export const usePlayer = create<PlayerState>()((set, get) => ({
  queue: [],
  queuePos: 0,
  current: null,
  status: 'idle',
  time: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: 'off',
  queueOpen: false,
  overlayOpen: false,

  play: (songs, startIndex = 0) => {
    if (!songs.length) return;
    const start = Math.min(Math.max(0, startIndex), songs.length - 1);
    const orderIdx = get().shuffle ? start : start;
    set({ queue: [...songs], queuePos: orderIdx, current: songs[orderIdx], status: 'loading', time: 0, duration: 0 });
    void songApi.play(songs[orderIdx].id).catch(() => {});
  },

  playNext: (song) => {
    const { queue, queuePos } = get();
    const idx = queuePos + 1;
    set({ queue: [...queue.slice(0, idx), song, ...queue.slice(idx)] });
  },

  toggle: () => {
    const s = get();
    if (!s.current) return;
    set({ status: s.status === 'playing' ? 'paused' : 'loading' });
  },

  next: (auto = false) => {
    const { queue, queuePos, shuffle, repeat } = get();
    if (!queue.length) return;
    if (repeat === 'one' && auto) {
      set({ time: 0, status: 'loading' });
      return;
    }
    const isLast = queuePos >= queue.length - 1;
    if (isLast && !auto) {
      if (shuffle) {
        let nextIdx = Math.floor(Math.random() * queue.length);
        if (nextIdx === queuePos) nextIdx = 0;
        set({ queuePos: nextIdx, current: queue[nextIdx], status: 'loading', time: 0, duration: 0 });
        void songApi.play(queue[nextIdx].id).catch(() => {});
        return;
      }
      if (repeat === 'all') {
        set({ queuePos: 0, current: queue[0], status: 'loading', time: 0, duration: 0 });
        void songApi.play(queue[0].id).catch(() => {});
        return;
      }
      set({ status: 'paused' });
      return;
    }
    if (isLast) {
      if (repeat === 'all') {
        set({ queuePos: 0, current: queue[0], status: 'loading', time: 0, duration: 0 });
        void songApi.play(queue[0].id).catch(() => {});
        return;
      }
      set({ status: 'paused' });
      return;
    }
    const nextIdx = queuePos + 1;
    set({ queuePos: nextIdx, current: queue[nextIdx], status: 'loading', time: 0, duration: 0 });
    void songApi.play(queue[nextIdx].id).catch(() => {});
  },

  prev: () => {
    const { queue, queuePos, time } = get();
    if (!queue.length) return;
    if (time > 4) {
      set({ time: 0 });
      return;
    }
    if (queuePos > 0) {
      const prevIdx = queuePos - 1;
      set({ queuePos: prevIdx, current: queue[prevIdx], status: 'loading', time: 0, duration: 0 });
      void songApi.play(queue[prevIdx].id).catch(() => {});
    } else {
      set({ time: 0 });
    }
  },

  seek: (sec) => {
    set({ time: Math.max(0, Math.min(sec, get().duration || sec)) });
  },

  setTime: (t) => set({ time: t }),
  setDuration: (d) => set({ duration: d }),
  setStatus: (s) => set({ status: s }),
  setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)), muted: false }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  cycleRepeat: () => set((s) => ({ repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off' })),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  removeAt: (i) => {
    const { queue, queuePos } = get();
    if (i < 0 || i >= queue.length) return;
    const newQueue = queue.filter((_, idx) => idx !== i);
    if (!newQueue.length) {
      set({ queue: [], current: null, status: 'idle', queuePos: 0 });
      return;
    }
    let pos = queuePos;
    let current = queue[queuePos];
    if (i < queuePos) pos -= 1;
    else if (i === queuePos) {
      pos = Math.min(pos, newQueue.length - 1);
      current = newQueue[pos];
    }
    set({ queue: newQueue, queuePos: pos, current });
  },
  move: (from, to) => {
    const { queue, queuePos } = get();
    if (from < 0 || from >= queue.length || to < 0 || to >= queue.length || from === to) return;
    const q = [...queue];
    const [m] = q.splice(from, 1);
    q.splice(to, 0, m);
    let pos = queuePos;
    if (queuePos === from) pos = to;
    else if (from < queuePos && to >= queuePos) pos -= 1;
    else if (from > queuePos && to <= queuePos) pos += 1;
    set({ queue: q, queuePos: pos });
  },
  clearQueue: () => set({ queue: [], current: null, status: 'idle', queuePos: 0 }),
  setQueueOpen: (open) => set({ queueOpen: open }),
  setOverlayOpen: (open) => set({ overlayOpen: open }),
  bumpPlayCount: (id) => {
    void songApi.play(id).catch(() => {});
  },
}));

/** Singleton audio element — one instance drives the whole app. */
export function getAudio(): HTMLAudioElement {
  const existing = (window as any).__sonoraAudio as HTMLAudioElement | undefined;
  if (existing) return existing;
  const el = new Audio();
  el.preload = 'auto';
  (window as any).__sonoraAudio = el;
  return el;
}