package com.sonora.app;

import android.Manifest;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Bridges the WebView player to Android's MediaSession:
 * lockscreen controls, media notification, audio focus and a foreground service.
 *
 * The web layer is the source of truth for audio; native buttons are forwarded
 * to the web as "action" events and the web reports state back through
 * setMetadata / setPlayback / reportProgress.
 */
@CapacitorPlugin(
        name = "MediaSession",
        permissions = @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
)
public class MediaSessionPlugin extends Plugin {

    private static final String TAG = "SonoraMedia";

    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private final ExecutorService artLoader = Executors.newSingleThreadExecutor();
    private volatile String artLoadingKey = "";

    private final AudioManager.OnAudioFocusChangeListener focusListener = focus -> {
        if (focus == AudioManager.AUDIOFOCUS_LOSS || focus == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
            MediaSessionState.dispatch("pause", -1);
        }
    };

    @Override
    public void load() {
        super.load();
        MediaSessionState.app = getContext().getApplicationContext();
        audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
    }

    @Override
    protected void handleOnDestroy() {
        teardown();
        super.handleOnDestroy();
    }

    @PluginMethod
    public void init(PluginCall call) {
        Context c = getContext();
        MediaSessionState.ensureChannel(c);
        if (MediaSessionState.session == null) {
            MediaSession session = new MediaSession(c, "SonoraPlayback");
            session.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
            session.setCallback(new MediaSession.Callback() {
                @Override
                public void onPlay() {
                    MediaSessionState.dispatch("play", -1);
                }

                @Override
                public void onPause() {
                    MediaSessionState.dispatch("pause", -1);
                }

                @Override
                public void onSkipToNext() {
                    MediaSessionState.dispatch("next", -1);
                }

                @Override
                public void onSkipToPrevious() {
                    MediaSessionState.dispatch("prev", -1);
                }

                @Override
                public void onSeekTo(long posMs) {
                    MediaSessionState.dispatch("seek", posMs / 1000);
                }
            });
            MediaSessionState.session = session;
        }
        MediaSessionState.handler = (action, value) -> {
            if ("close".equals(action)) {
                stopMedia();
                return;
            }
            JSObject data = new JSObject();
            data.put("action", action);
            if (value >= 0) {
                data.put("value", value);
            }
            notifyListeners("action", data);
        };
        call.resolve();
    }

    @PluginMethod
    public void setMetadata(PluginCall call) {
        String title = call.getString("title", "");
        String artist = call.getString("artist", "");
        String artUrl = call.getString("artUrl", "");
        long duration = Math.max(0, call.getLong("duration", 0L));

        MediaSessionState.title = title;
        MediaSessionState.artist = artist;
        MediaSessionState.duration = duration;

        loadArtwork(artUrl, () -> {
            applyArtwork();
            MediaSessionState.notifyNow(getContext());
        });
        applyArtwork();
        updatePlaybackState();
        MediaSessionState.notifyNow(getContext());
        call.resolve();
    }

    @PluginMethod
    public void setPlayback(PluginCall call) {
        boolean playing = Boolean.TRUE.equals(call.getBoolean("playing"));
        MediaSessionState.playing = playing;
        if (playing && !MediaSessionState.title.isEmpty()) {
            startServiceIfNeeded();
        }
        updatePlaybackState();
        if (playing) {
            acquireFocus();
            if (MediaSessionState.session != null) {
                MediaSessionState.session.setActive(true);
            }
        } else {
            releaseFocus();
            if (MediaSessionState.session != null) {
                MediaSessionState.session.setActive(false);
            }
        }
        MediaSessionState.notifyNow(getContext());
        call.resolve();
    }

    @PluginMethod
    public void reportProgress(PluginCall call) {
        Long pos = call.getLong("position");
        Long dur = call.getLong("duration");
        if (pos != null && pos >= 0) {
            MediaSessionState.position = pos;
        }
        if (dur != null && dur > 0) {
            MediaSessionState.duration = dur;
        }
        updatePlaybackState();
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopMedia();
        call.resolve();
    }

    private void applyArtwork() {
        MediaSession session = MediaSessionState.session;
        if (session == null) {
            return;
        }
        MediaMetadata.Builder mb = new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, MediaSessionState.title)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, MediaSessionState.artist)
                .putLong(MediaMetadata.METADATA_KEY_DURATION, MediaSessionState.duration * 1000);
        if (MediaSessionState.art != null) {
            mb.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, MediaSessionState.art);
        }
        session.setMetadata(mb.build());
    }

    private void loadArtwork(String artUrl, Runnable done) {
        if (artUrl == null || artUrl.isEmpty()) {
            MediaSessionState.art = null;
            done.run();
            return;
        }
        if (artUrl.equals(artLoadingKey)) {
            return;
        }
        artLoadingKey = artUrl;
        final String key = artUrl;
        artLoader.execute(() -> {
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(key).openConnection();
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                conn.setRequestProperty("User-Agent", "Sonora/1.0 (Android)");
                InputStream is = conn.getInputStream();
                Bitmap bmp = BitmapFactory.decodeStream(is);
                is.close();
                conn.disconnect();
                if (bmp != null && key.equals(artLoadingKey)) {
                    MediaSessionState.art = bmp;
                    done.run();
                }
            } catch (Exception e) {
                Log.w(TAG, "artwork load failed: " + e.getMessage());
            }
        });
    }

    private void updatePlaybackState() {
        MediaSession session = MediaSessionState.session;
        if (session != null) {
            session.setPlaybackState(MediaSessionState.buildPlaybackState());
        }
    }

    private void startServiceIfNeeded() {
        Context c = getContext();
        Intent i = new Intent(c, MediaSessionService.class);
        if (Build.VERSION.SDK_INT >= 26) {
            c.startForegroundService(i);
        } else {
            c.startService(i);
        }
    }

    private void acquireFocus() {
        if (audioManager == null) {
            return;
        }
        try {
            if (Build.VERSION.SDK_INT >= 26) {
                if (focusRequest == null) {
                    focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                            .setAudioAttributes(new AudioAttributes.Builder()
                                    .setUsage(AudioAttributes.USAGE_MEDIA)
                                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                                    .build())
                            .setOnAudioFocusChangeListener(focusListener)
                            .build();
                }
                audioManager.requestAudioFocus(focusRequest);
            } else {
                audioManager.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
            }
        } catch (Exception e) {
            Log.w(TAG, "audio focus request failed: " + e.getMessage());
        }
    }

    private void releaseFocus() {
        if (audioManager == null) {
            return;
        }
        try {
            if (Build.VERSION.SDK_INT >= 26 && focusRequest != null) {
                audioManager.abandonAudioFocusRequest(focusRequest);
            } else {
                audioManager.abandonAudioFocus(focusListener);
            }
        } catch (Exception ignore) {
        }
    }

    private void stopMedia() {
        MediaSessionState.playing = false;
        if (MediaSessionState.session != null) {
            MediaSessionState.session.setActive(false);
        }
        releaseFocus();
        try {
            NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            nm.cancel(MediaSessionService.NOTIF_ID);
            getContext().stopService(new Intent(getContext(), MediaSessionService.class));
        } catch (Exception e) {
            Log.w(TAG, "stop failed: " + e.getMessage());
        }
    }

    private void teardown() {
        stopMedia();
        artLoader.shutdownNow();
        MediaSessionState.handler = null;
        if (MediaSessionState.session != null) {
            MediaSessionState.session.release();
            MediaSessionState.session = null;
        }
    }
}