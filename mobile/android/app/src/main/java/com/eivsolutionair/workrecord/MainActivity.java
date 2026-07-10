package com.eivsolutionair.workrecord;

import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Environment;
import android.util.Base64;
import android.util.Log;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.content.ContextCompat;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import com.getcapacitor.BridgeActivity;
import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "NativeHandoff";
    private static final String SITE = "https://eiv-solution-air-service-work-recor.vercel.app";
    private static final String SCHEME = "eivsolutionair";
    // Public OAuth client identifier (not a secret - safe to embed), used as
    // Credential Manager's serverClientId so the ID token it returns is
    // audience-scoped to this app's backend, which verifies it against the
    // same value (AUTH_GOOGLE_ID).
    private static final String WEB_CLIENT_ID =
        "337399331790-174ml85osblhorb88tm6e2jhhl8ee2l2.apps.googleusercontent.com";
    private final ExecutorService networkExecutor = Executors.newSingleThreadExecutor();

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // A WebView does nothing with a `Content-Disposition: attachment`
        // response on its own, so tapping "Download PDF"/"Export to Excel"
        // silently did nothing inside the app. Hand those off to the system
        // DownloadManager, forwarding the session cookie (the PDF/Excel routes
        // require auth) so the file actually downloads and opens.
        setupDownloadListener();
    }

    private void setupDownloadListener() {
        WebView webView = bridge.getWebView();
        if (webView == null) return;
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                String cookie = CookieManager.getInstance().getCookie(url);
                if (cookie != null) request.addRequestHeader("Cookie", cookie);
                if (userAgent != null) request.addRequestHeader("User-Agent", userAgent);
                request.setMimeType(mimeType);
                request.setTitle(fileName);
                request.setNotificationVisibility(
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(
                    Environment.DIRECTORY_DOWNLOADS, fileName);
                DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                if (dm != null) {
                    dm.enqueue(request);
                    Toast.makeText(this, "Downloading " + fileName, Toast.LENGTH_SHORT).show();
                }
            } catch (Exception e) {
                Log.w(TAG, "Download failed: " + e);
                Toast.makeText(this, "Couldn't start the download: " + e.getMessage(),
                    Toast.LENGTH_LONG).show();
            }
        });
    }

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

        if ("native-google-signin".equals(data.getHost())) {
            signInWithGoogleNatively();
        } else if ("open-login".equals(data.getHost())) {
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

    // Shows the OS-level "choose a Google account" picker (every account on
    // the device, not just whichever one Chrome happens to be signed into),
    // then hands the resulting ID token to the backend directly over HTTPS -
    // no browser hop needed at all for this path.
    private void signInWithGoogleNatively() {
        // A fresh random nonce per attempt forces Google to mint a NEW ID
        // token bound to the account the user actually taps. Without it,
        // Google Play Services can hand back a cached ID token from a prior
        // sign-in (keyed only by serverClientId) - which is how choosing the
        // worker account could silently return the admin's token, logging the
        // user into the wrong account. autoSelect stays off so the picker is
        // always shown rather than a remembered account being reused.
        GetGoogleIdOption googleIdOption = new GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setAutoSelectEnabled(false)
            .setServerClientId(WEB_CLIENT_ID)
            .setNonce(newNonce())
            .build();

        GetCredentialRequest request = new GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build();

        CredentialManager.create(this).getCredentialAsync(
            this,
            request,
            new CancellationSignal(),
            ContextCompat.getMainExecutor(this),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse result) {
                    handleGoogleCredential(result.getCredential());
                }

                @Override
                public void onError(GetCredentialException e) {
                    // No Google Play services, no saved account, or the
                    // user backed out of the picker - fall back to the
                    // browser-based flow rather than dead-ending here.
                    Log.w(TAG, "Credential Manager sign-in unavailable: " + e);
                    runOnUiThread(() -> Toast.makeText(
                        MainActivity.this,
                        "Using browser sign-in (native picker unavailable)",
                        Toast.LENGTH_SHORT).show());
                    try {
                        openInBrowserTab(SITE + "/login?native=1");
                    } catch (ActivityNotFoundException ignored) {
                    }
                }
            }
        );
    }

    // A cryptographically random, URL-safe nonce. Its only job here is to be
    // unpredictable and unique per sign-in so Google can't reuse a cached
    // token; the backend doesn't need to echo/verify it for that guarantee.
    private static String newNonce() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.encodeToString(bytes, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
    }

    private void handleGoogleCredential(Credential credential) {
        if (!(credential instanceof CustomCredential)
            || !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
            handleExchangeFailure("Unexpected credential type from account picker");
            return;
        }
        try {
            GoogleIdTokenCredential googleIdTokenCredential =
                GoogleIdTokenCredential.createFrom(((CustomCredential) credential).getData());
            exchangeGoogleIdToken(googleIdTokenCredential.getIdToken());
        } catch (Exception e) {
            handleExchangeFailure("Could not read Google credential: " + e);
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
                JSONObject body = new JSONObject();
                body.put("code", code);
                JSONObject json = new JSONObject(postJson(SITE + "/api/native-handoff/exchange", body));
                installSessionCookie(json.getString("cookieName"), json.getString("token"), json.optString("email", ""));
            } catch (Exception e) {
                // Network hiccup or an already-expired/used code - surface it
                // instead of leaving the WebView stuck on a stale page with
                // no explanation, and send the user back to a clean retry.
                handleExchangeFailure(e.toString());
            }
        });
    }

    // Counterpart to exchangeCodeForSession for the Credential Manager path:
    // the ID token itself is the proof of sign-in, so it goes straight to
    // the backend instead of through a single-use code + deep link.
    private void exchangeGoogleIdToken(String idToken) {
        networkExecutor.execute(() -> {
            try {
                JSONObject body = new JSONObject();
                body.put("idToken", idToken);
                JSONObject json = new JSONObject(postJson(SITE + "/api/native-handoff/google-token", body));
                installSessionCookie(json.getString("cookieName"), json.getString("token"), json.optString("email", ""));
            } catch (Exception e) {
                handleExchangeFailure(e.toString());
            }
        });
    }

    private static String postJson(String urlStr, JSONObject body) throws IOException {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);
        conn.setConnectTimeout(10_000);
        conn.setReadTimeout(10_000);
        try (OutputStream os = conn.getOutputStream()) {
            os.write(body.toString().getBytes(StandardCharsets.UTF_8));
        }

        int status = conn.getResponseCode();
        InputStream stream = status == 200 ? conn.getInputStream() : conn.getErrorStream();
        String responseBody = readAll(stream);
        if (status != 200) {
            throw new IOException("Sign-in exchange failed (HTTP " + status + "): " + responseBody);
        }
        return responseBody;
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

    private void installSessionCookie(String cookieName, String token, String email) {
        // Install the session in the WebView's cookie jar and reload: the
        // app is now signed in without OAuth ever running inside it.
        // CookieManager requires a thread with a Looper (the UI thread) -
        // this method runs from the background network executor, so every
        // call here has to be posted over, not just the final WebView load.
        runOnUiThread(() -> {
            CookieManager cookieManager = CookieManager.getInstance();
            // Wipe the jar first so a still-valid session from a previously
            // signed-in account (e.g. an admin) can't linger alongside and
            // win over the account the user is switching to now.
            cookieManager.removeAllCookies(removed -> {
                String cookie = cookieName + "=" + token + "; Path=/; Max-Age=2592000; Secure";
                cookieManager.setCookie(SITE, cookie, ok -> {
                    cookieManager.flush();
                    // Confirm on-device which account actually got signed in,
                    // so a wrong-account mix-up is visible immediately instead
                    // of only after landing inside the app.
                    if (email != null && !email.isEmpty()) {
                        Toast.makeText(this, "Signed in as " + email, Toast.LENGTH_LONG).show();
                    }
                    bridge.getWebView().loadUrl(SITE + "/");
                });
            });
        });
    }
}
