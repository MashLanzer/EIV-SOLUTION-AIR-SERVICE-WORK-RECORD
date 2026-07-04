package com.eivsolutionair.workrecord;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String SITE = "https://eiv-solution-air-service-work-recor.vercel.app";
    private static final String SCHEME = "eivsolutionair";

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLink(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        // Covers a deep link that cold-started the app; onNewIntent only
        // fires when the activity was already running.
        handleDeepLink(getIntent());
    }

    private void handleDeepLink(Intent intent) {
        if (intent == null) return;
        Uri data = intent.getData();
        if (data == null || !SCHEME.equals(data.getScheme())) return;
        intent.setData(null); // each link is handled exactly once

        if ("open-login".equals(data.getHost())) {
            // Google blocks OAuth inside WebViews, so sign-in runs in the
            // real system browser. The web login page (?native=1) finishes
            // at /native-handoff, which links back here via auth-callback.
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(SITE + "/login?native=1")));
            } catch (ActivityNotFoundException ignored) {
                // No browser on the device; nothing we can do.
            }
        } else if ("auth-callback".equals(data.getHost())) {
            String token = data.getQueryParameter("token");
            String cookieName = data.getQueryParameter("cookieName");
            if (token == null || cookieName == null) return;

            // Install the session in the WebView's cookie jar and reload:
            // the app is now signed in without OAuth ever running inside it.
            CookieManager cookieManager = CookieManager.getInstance();
            String cookie = cookieName + "=" + token + "; Path=/; Max-Age=2592000; Secure";
            cookieManager.setCookie(SITE, cookie, ok -> {
                cookieManager.flush();
                runOnUiThread(() -> bridge.getWebView().loadUrl(SITE + "/"));
            });
        }
    }
}
