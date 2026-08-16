package com.sonora.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Forwards notification button presses to the web player through the action handler. */
public class MediaActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        MediaSessionState.dispatch(intent.getStringExtra("action"), intent.getLongExtra("value", -1));
    }
}