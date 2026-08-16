package com.sonora.app;

import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // MUST be registered before the bridge is created (super.onCreate),
        // otherwise the native plugin never reaches the web layer.
        registerPlugin(MediaSessionPlugin.class);
        Log.i("SonoraMedia", "MediaSessionPlugin registered");
        super.onCreate(savedInstanceState);
    }
}