import { Capacitor, registerPlugin } from '@capacitor/core';
import { usePlayer } from './store';
import { artworkUrl } from './types';

interface NativeAction {
  action: string;
  value?: number;
}

interface SonoraMediaSession {
  init(): Promise<void>;
  setMetadata(options: { title: string; artist: string; artUrl: string; duration: number }): Promise<void>;
  setPlayback(options: { playing: boolean }): Promise<void>;
  reportProgress(options: { position: number; duration: number }): Promise<void>;
  stop(): Promise<void>;
  requestPermissions(): Promise<{ notifications: 'granted' | 'denied' | 'prompt' }>;
  addListener(
    eventName: 'action',
    handler: (data: NativeAction) => void,
  ): Promise<{ remove: () => void }>;
}

const mediaSession = registerPlugin<SonoraMediaSession>('MediaSession');

function native(): boolean {
  return Capacitor.isNativePlatform();
}

function send<T extends keyof SonoraMediaSession>(
  method: T,
  ...args: unknown[]
): void {
  if (!native()) return;
  void (mediaSession[method] as (...a: unknown[]) => Promise<unknown>)(...args)
    .catch((err: unknown) => console.error('[sonora] media session call failed:', method, err));
}

/**
 * Mirrors the player into Android's MediaSession (lockscreen controls +
 * media notification) and forwards native button presses back into the store.
 * No-op in the browser. Call once at app start.
 */
export function initMediaSession(): void {
  if (!native()) return;

  send('init');

  void mediaSession.addListener('action', (d) => {
    if (navigator.vibrate) navigator.vibrate(8);
    const s = usePlayer.getState();
    switch (d.action) {
      case 'toggle':
        s.toggle();
        break;
      case 'play':
        if (s.status !== 'playing' && s.current) s.toggle();
        break;
      case 'pause':
        if (s.status === 'playing') s.toggle();
        break;
      case 'next':
        s.next();
        break;
      case 'prev':
        s.prev();
        break;
      case 'seek':
        (window as unknown as { __sonoraSeek?: (sec: number) => void }).__sonoraSeek?.(Number(d.value) || 0);
        break;
      default:
        break;
    }
  });

  let metaKey = '';
  let lastProgress = 0;
  usePlayer.subscribe((s) => {
    if (!s.current) {
      if (s.status === 'idle') {
        send('stop');
        metaKey = '';
      }
      return;
    }

    const playing = s.status === 'playing';
    const dur = Math.round(s.duration || s.current.duration || 0);
    const key = `${s.current.id}|${playing}|${dur}`;
    if (key !== metaKey) {
      metaKey = key;
      send('setPlayback', { playing });
      send('setMetadata', {
        title: s.current.title,
        artist: s.current.artist?.name ?? 'Unknown artist',
        artUrl: artworkUrl(s.current.artworkPath ?? s.current.artist?.artworkPath) ?? '',
        duration: dur,
      });
    }

    const now = performance.now();
    if (now - lastProgress > 1000 && Math.abs(s.time - lastProgress) > 0.75) {
      lastProgress = s.time;
      send('reportProgress', { position: Math.round(s.time), duration: dur });
    }
  });

  void mediaSession.requestPermissions().catch(() => {});
}