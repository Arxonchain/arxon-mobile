package xyz.arxonchain.app;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.webkit.CookieManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/**
 * Capacitor loads the bundled app via BridgeWebViewClient#shouldInterceptRequest (virtual
 * https://localhost). Replacing the WebViewClient with a plain WebViewClient breaks that and
 * causes net::ERR_CONNECTION_REFUSED.
 *
 * Cloudflare Turnstile (challenges.cloudflare.com iframe) needs third-party cookies + DOM
 * storage in the WebView. See:
 * https://developers.cloudflare.com/turnstile/get-started/mobile-implementation/
 */
public class MainActivity extends BridgeActivity {

  private static final String TAG = "ArxonCapacitor";

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    SplashScreen.installSplashScreen(this);
    WebView.setWebContentsDebuggingEnabled(true);
    super.onCreate(savedInstanceState);

    Bridge bridge = getBridge();
    if (bridge != null) {
      configureWebViewForTurnstile(bridge.getWebView());
      bridge.setWebViewClient(new DiagnosticBridgeWebViewClient(bridge, this));
    } else {
      Log.w(TAG, "Bridge was null after onCreate; skipping WebViewClient wrapper");
    }
  }

  /** Best-effort WebView settings so Turnstile iframes can load and persist challenge state. */
  private static void configureWebViewForTurnstile(WebView webView) {
    if (webView == null) {
      return;
    }
    try {
      WebSettings settings = webView.getSettings();
      settings.setJavaScriptEnabled(true);
      settings.setDomStorageEnabled(true);
      // Turnstile challenge resources are always HTTPS; keep compatibility mode for safety.
      settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

      CookieManager cookieManager = CookieManager.getInstance();
      cookieManager.setAcceptCookie(true);
      cookieManager.setAcceptThirdPartyCookies(webView, true);
    } catch (Exception e) {
      Log.w(TAG, "Failed to configure WebView for Turnstile", e);
    }
  }

  private static final class DiagnosticBridgeWebViewClient extends BridgeWebViewClient {

    private final Activity activity;
    private boolean showedMainFrameError;

    DiagnosticBridgeWebViewClient(Bridge bridge, Activity activity) {
      super(bridge);
      this.activity = activity;
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
      super.onReceivedError(view, request, error);

      if (request == null || !request.isForMainFrame() || showedMainFrameError) {
        return;
      }
      showedMainFrameError = true;

      final String url = request.getUrl() != null ? request.getUrl().toString() : "(unknown)";
      final String desc = error != null ? String.valueOf(error.getDescription()) : "(no description)";
      Log.e(TAG, "Main frame load error: " + desc + " @ " + url);

      activity.runOnUiThread(
          () ->
              Toast.makeText(activity, "Load error: " + desc + " @ " + url, Toast.LENGTH_LONG)
                  .show());
    }
  }
}
