package com.eivsolutionair.workrecord;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.util.Log;
import android.webkit.CookieManager;
import android.widget.Toast;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsIntent;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "NativeHandoff";
    private static final String SITE = "https://eiv-solution-air-service-work-recor.vercel.app";
    private static final String SCHEME = "eivsolutionair";
    private final ExecutorService networkExecutor = Executors.newSingleThreadExecutor();

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
            // Google blocks OAuth inside WebViews, so sign-in runs in a
            // browser tab instead. A plain ACTION_VIEW intent to our own
            // domain is an *implicit* intent, so Android's Digital Asset
            // Links verification can hand it straight back to this same
            // app instead of a real browser (this app's package is the
            // verified owner of this domain per assetlinks.json) - which
            // looks like "the browser flashes open and instantly bounces
            // back without ever showing Google's sign-in page." Explicitly
            // targeting a resolved browser package makes this an *explicit*
            // intent, which skips that verified-link resolution entirely.
            try {
                openInBrowserTab(SITE + "/login?native=1");
            } catch (ActivityNotFoundException ignored) {
                // No browser on the device; nothing we can do.
            }
        } else if ("auth-callback".equals(data.getHost())) {
            String code = data.getQueryParameter("code");
            if (code == null) return;
            exchangeCodeForSession(code);
        }
    }

    // Resolves an installed browser package up front and pins the launch
    // intent to it (an explicit intent), instead of leaving resolution up
    // to the OS - which is what lets a verified App Link claim the URL
    // right back into this app instead of a real browser.
    private void openInBrowserTab(String url) {
        Uri uri = Uri.parse(url);
        String browserPackage = resolveBrowserPackage();
        CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder().build();
        if (browserPackage != null) {
            customTabsIntent.intent.setPackage(browserPackage);
        }
        customTabsIntent.launchUrl(this, uri);
    }

    // Prefers a browser that supports Custom Tabs (nicer transition, no
    // full app-switch); falls back to any other installed app that
    // handles http(s) links, explicitly excluding this app itself so we
    // can never resolve straight back to our own verified App Link.
    private String resolveBrowserPackage() {
        String customTabsPackage = CustomTabsClient.getPackageName(this, null, false);
        if (customTabsPackage != null) return customTabsPackage;

        Intent probe = new Intent(Intent.ACTION_VIEW, Uri.parse("https://example.com"));
        for (ResolveInfo info : getPackageManager().queryIntentActivities(probe, 0)) {
            String pkg = info.activityInfo.packageName;
            if (!pkg.equals(getPackageName())) return pkg;
        }
        return null;
    }

    // The deep link only carries a short-lived, single-use code (not the
    // session token itself), so we trade it in over HTTPS before installing
    // anything in the WebView's cookie jar. Runs off the main thread since
    // this is a blocking network call.
    private void exchangeCodeForSession(String code) {
        networkExecutor.execute(() -> {
            try {
                URL url = new URL(SITE + "/api/native-handoff/exchange");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(10_000);
                conn.setReadTimeout(10_000);

                JSONObject body = new JSONObject();
                body.put("code", code);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                }

                int status = conn.getResponseCode();
                InputStream stream = status == 200 ? conn.getInputStream() : conn.getErrorStream();
                String responseBody = readAll(stream);
                if (status != 200) {
                    handleExchangeFailure("Sign-in exchange failed (HTTP " + status + "): " + responseBody);
                    return;
                }

                JSONObject json = new JSONObject(responseBody);
                String token = json.getString("token");
                String cookieName = json.getString("cookieName");
                installSessionCookie(cookieName, token);
            } catch (Exception e) {
                // Network hiccup or an already-expired/used code - surface it
                // instead of leaving the WebView stuck on a stale page with
                // no explanation, and send the user back to a clean retry.
                handleExchangeFailure(e.toString());
            }
        });
    }

    private void handleExchangeFailure(String reason) {
        Log.w(TAG, "Native sign-in handoff failed: " + reason);
        runOnUiThread(() -> {
            // Surfaces the actual reason on-device (truncated) so this is
            // diagnosable without adb/logcat access.
            String shown = reason.length() > 140 ? reason.substring(0, 140) + "..." : reason;
            Toast.makeText(this, "Sign-in didn't finish: " + shown, Toast.LENGTH_LONG).show();
            bridge.getWebView().loadUrl(SITE + "/login");
        });
    }

    private static String readAll(InputStream stream) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[1024];
        int read;
        while ((read = stream.read(buffer)) != -1) {
            out.write(buffer, 0, read);
        }
        return out.toString(StandardCharsets.UTF_8.name());
    }

    private void installSessionCookie(String cookieName, String token) {
        // Install the session in the WebView's cookie jar and reload: the
        // app is now signed in without OAuth ever running inside it.
        CookieManager cookieManager = CookieManager.getInstance();
        String cookie = cookieName + "=" + token + "; Path=/; Max-Age=2592000; Secure";
        cookieManager.setCookie(SITE, cookie, ok -> {
            cookieManager.flush();
            runOnUiThread(() -> bridge.getWebView().loadUrl(SITE + "/"));
        });
    }
}
