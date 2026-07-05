package com.eivsolutionair.workrecord;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.webkit.CookieManager;
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
            // Google blocks OAuth inside WebViews, so sign-in runs in the
            // real system browser. The web login page (?native=1) finishes
            // at /native-handoff, which links back here via auth-callback.
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(SITE + "/login?native=1")));
            } catch (ActivityNotFoundException ignored) {
                // No browser on the device; nothing we can do.
            }
        } else if ("auth-callback".equals(data.getHost())) {
            String code = data.getQueryParameter("code");
            if (code == null) return;
            exchangeCodeForSession(code);
        }
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
                if (status != 200) return;

                JSONObject json = new JSONObject(responseBody);
                String token = json.getString("token");
                String cookieName = json.getString("cookieName");
                installSessionCookie(cookieName, token);
            } catch (Exception ignored) {
                // Network hiccup or an already-expired/used code - the user
                // just lands on the login screen and can sign in again.
            }
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
