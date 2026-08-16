package com.sonora.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;

/** Shared mutable state between the plugin, the foreground service and the receiver. */
public final class MediaSessionState {

    interface ActionHandler {
        void onAction(String action, long value);
    }

    static final String RECEIVER_ACTION = "com.sonora.app.MEDIA_ACTION";
    static final String CHANNEL_ID = "sonora_playback";

    static Context app;
    static MediaSession session;
    static volatile String title = "";
    static volatile String artist = "";
    static volatile Bitmap art;
    static volatile boolean playing;
    static volatile long position;
    static volatile long duration;
    static volatile ActionHandler handler;

    private MediaSessionState() {}

    static void dispatch(String action, long value) {
        ActionHandler h = handler;
        if (h != null) {
            h.onAction(action, value);
        }
    }

    static void ensureChannel(Context c) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Media playback", NotificationManager.IMPORTANCE_LOW);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
    }

    static PendingIntent actionPi(Context c, String action) {
        Intent i = new Intent(c, MediaActionReceiver.class);
        i.setAction(RECEIVER_ACTION);
        i.putExtra("action", action);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(c, Math.abs(action.hashCode() % 100000), i, flags);
    }

    static Notification buildNotification(Context c) {
        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(c, CHANNEL_ID)
                : new Notification.Builder(c);

        Intent content = new Intent(c, MainActivity.class);
        content.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentPi = PendingIntent.getActivity(
                c, 0, content, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String displayTitle = title == null || title.isEmpty() ? "Sonora" : title;

        b.setContentTitle(displayTitle)
                .setContentText(artist == null ? "" : artist)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(contentPi)
                .setOngoing(true)
                .setShowWhen(false)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setCategory(Notification.CATEGORY_TRANSPORT);

        Notification.MediaStyle style = new Notification.MediaStyle();
        style.setShowActionsInCompactView(0, 1, 2);
        if (session != null && session.getSessionToken() != null) {
            style.setMediaSession(session.getSessionToken());
        }

        b.setStyle(style)
                .addAction(new Notification.Action(android.R.drawable.ic_media_previous, "Previous", actionPi(c, "prev")))
                .addAction(new Notification.Action(
                        playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                        playing ? "Pause" : "Play",
                        actionPi(c, "toggle")))
                .addAction(new Notification.Action(android.R.drawable.ic_media_next, "Next", actionPi(c, "next")))
                .addAction(new Notification.Action(android.R.drawable.ic_menu_close_clear_cancel, "Close", actionPi(c, "close")));

        return b.build();
    }

    static void notifyNow(Context c) {
        try {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            nm.notify(MediaSessionService.NOTIF_ID, buildNotification(c));
        } catch (Exception ignore) {
        }
    }

    static PlaybackState buildPlaybackState() {
        long posMs = position * 1000;
        long durMs = duration * 1000;
        if (durMs > 0 && posMs > durMs) {
            posMs = durMs;
        }
        return new PlaybackState.Builder()
                .setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE
                        | PlaybackState.ACTION_PLAY_PAUSE | PlaybackState.ACTION_SKIP_TO_NEXT
                        | PlaybackState.ACTION_SKIP_TO_PREVIOUS | PlaybackState.ACTION_SEEK_TO)
                .setState(playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                        posMs, playing ? 1f : 0f)
                .build();
    }
}