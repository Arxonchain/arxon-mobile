package xyz.arxonchain.app;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;
import android.webkit.CookieManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;

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
  /** Matches V2 neon deep background — avoids white flash before OTA paints. */
  private static final int WEBVIEW_BG = Color.parseColor("#02060e");

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
      webView.setBackgroundColor(WEBVIEW_BG);
      WebSettings settings = webView.getSettings();
      settings.setJavaScriptEnabled(true);
      settings.setDomStorageEnabled(true);
      settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

      CookieManager cookieManager = CookieManager.getInstance();
      cookieManager.setAcceptCookie(true);
      cookieManager.setAcceptThirdPartyCookies(webView, true);
    } catch (Exception e) {
      Log.w(TAG, "Failed to configure WebView for Turnstile", e);
    }
  }

  static String brandedLoadErrorHtml(String detail) {
    String safe = detail == null ? "" : detail.replace("&", "&amp;").replace("<", "&lt;");
    return "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"/>"
        + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/>"
        + "<title>Arxon</title><style>"
        + "html,body{margin:0;min-height:100%;background:#02060e;color:#e8fcff;"
        + "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;"
        + "display:flex;align-items:center;justify-content:center;padding:32px 24px;}"
        + ".card{max-width:340px;text-align:center;}"
        + ".logo{width:72px;height:72px;border-radius:18px;border:1px solid rgba(79,216,235,.35);"
        + "box-shadow:0 0 40px rgba(79,216,235,.25);margin:0 auto 24px;}"
        + "h1{margin:0 0 10px;font-size:22px;font-weight:800;letter-spacing:.04em;}"
        + "p{margin:0 0 8px;font-size:14px;line-height:1.55;color:rgba(232,252,255,.55);}"
        + ".detail{margin:0 0 24px;font-size:11px;color:rgba(232,252,255,.35);word-break:break-word;}"
        + "button{width:100%;padding:16px 20px;border-radius:16px;border:none;"
        + "background:linear-gradient(135deg,#4FD8EB,#7FE7C4);color:#02060e;"
        + "font-size:15px;font-weight:800;cursor:pointer;}"
        + "</style></head><body><div class=\"card\">"
        + "<div class=\"logo\"></div>"
        + "<h1>Can't reach Arxon</h1>"
        + "<p>The app update server could not be loaded. Check your internet connection and try again.</p>"
        + (safe.isEmpty() ? "" : "<p class=\"detail\">" + safe + "</p>")
        + "<button type=\"button\" onclick=\"location.reload()\">Retry</button>"
        + "</div></body></html>";
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
          () -> {
            view.setBackgroundColor(WEBVIEW_BG);
            view.loadDataWithBaseURL(
                url,
                brandedLoadErrorHtml(desc + " @ " + url),
                "text/html",
                "UTF-8",
                null);
          });
    }
  }
}
