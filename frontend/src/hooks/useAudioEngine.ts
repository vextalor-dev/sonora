import { useEffect, useRef } from 'react';
import { getAudio, usePlayer } from '../store';
import { songApi } from '../api';

/**
 * Binds the singleton <audio> element to the player store.
 * Mounted once at the app root; all other components just read the store.
 *
 * Rules:
 *  - el.src is assigned ONLY when the track id changes (one load per track)
 *  - status changes only pause()/play() the existing element
 *  - 'waiting' never mutates to 'loading' (that caused a reload loop)
 */
export function useAudioEngine() {
  const lastTime = useRef(0);

  // Track change → assign src exactly once.
  useEffect(() => {
    const unsub = usePlayer.subscribe((s, prev) => {
      if (s.current?.id === prev.current?.id || !s.current) return;
      const el = getAudio();
      el.pause();
      el.src = songApi.streamUrl(s.current.id);
      el.load();
      el.play().catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('[sonora] play() rejected:', err.name, err.message);
        }
      });
    });
    return unsub;
  }, []);

  // Status change → only resume/pause the element, never reload.
  useEffect(() => {
    const unsub = usePlayer.subscribe((s, prev) => {
      if (s.status === prev.status) return;
      const el = getAudio();
      if (s.status === 'loading' || s.status === 'playing') {
        if (el.paused && el.src) {
          el.play().catch((err) => {
            if (err.name !== 'AbortError') {
              console.error('[sonora] resume rejected:', err.name, err.message);
            }
          });
        }
      } else if (s.status === 'paused' || s.status === 'idle') {
        el.pause();
      }
    });
    return unsub;
  }, []);

  // Volume / mute
  useEffect(() => {
    const el = getAudio();
    const unsub = usePlayer.subscribe((s) => {
      el.volume = s.muted ? 0 : s.volume;
      el.muted = s.muted;
    });
    return unsub;
  }, []);

  // Native events → store
  useEffect(() => {
    const el = getAudio();
    const onTime = () => {
      const t = el.currentTime;
      if (t - lastTime.current >= 0.25 || t === 0) {
        lastTime.current = t;
        usePlayer.getState().setTime(t);
      }
    };
    const onMeta = () => usePlayer.getState().setDuration(el.duration || 0);
    const onPlay = () => usePlayer.getState().setStatus('playing');
    const onPause = () => {
      const s = usePlayer.getState();
      if (s.status === 'loading' || s.status === 'playing') s.setStatus('paused');
    };
    const onEnded = () => usePlayer.getState().next(true);
    const onSeeked = () => {
      if (getAudio().currentTime > 0) usePlayer.getState().setTime(getAudio().currentTime);
    };
    const onMediaError = () => {
      console.error('[sonora] media error:', {
        code: el.error?.code,
        message: el.error?.message ?? el.error?.code,
        src: el.currentSrc || el.src,
        readyState: el.readyState,
      });
    };
    el.muted = false;
    const watchdog = setInterval(() => {
      const a = getAudio();
      if (!a.paused && a.currentTime > 0) {
        usePlayer.getState().setTime(a.currentTime);
      }
      if (!a.paused && a.duration > 0) {
        usePlayer.getState().setDuration(a.duration);
      }
    }, 500);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    el.addEventListener('seeked', onSeeked);
    el.addEventListener('error', onMediaError);
    (window as any).__sonoraDiag = () => {
      const a = getAudio();
      return {
        src: a.currentSrc || a.src,
        readyState: a.readyState,
        paused: a.paused,
        muted: a.muted,
        volume: a.volume,
        error: a.error ? { code: a.error.code, message: a.error.message } : null,
        currentTime: a.currentTime,
        duration: a.duration,
      };
    };
    return () => {
      clearInterval(watchdog);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('seeked', onSeeked);
      el.removeEventListener('error', onMediaError);
    };
  }, []);

  // Expose seek helper via window for sliders.
  useEffect(() => {
    (window as any).__sonoraSeek = (sec: number) => {
      const el = getAudio();
      usePlayer.getState().setTime(sec);
      if (el.duration) el.currentTime = sec;
    };
  }, []);
}