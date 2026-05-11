package xyz.arxonchain.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private static final String TAG = "ArxonWebView";
  private boolean showedFatalOnce = false;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    // Required for Theme.SplashScreen on Android 12+
    SplashScreen.installSplashScreen(this);

    // Enables chrome://inspect WebView debugging
    WebView.setWebContentsDebuggingEnabled(true);

    super.onCreate(savedInstanceState);

    // Proof native launched
    Toast.makeText(this, "Arxon native started", Toast.LENGTH_SHORT).show();

    tryAttachWebViewDiagnostics();
  }

  private void tryAttachWebViewDiagnostics() {
    try {
      final WebView webView = getBridge() != null ? getBridge().getWebView() : null;
      if (webView == null) {
        Log.w(TAG, "Bridge WebView not available");
        return;
      }

      webView.setWebChromeClient(new WebChromeClient() {
        @Override
        public boolean onConsoleMessage(ConsoleMessage cm) {
          final String msg =
              cm.message() + " (" + cm.sourceId() + ":" + cm.lineNumber() + ")";

          Log.d(TAG, "[console] " + msg);

          if (!showedFatalOnce && cm.messageLevel() == ConsoleMessage.MessageLevel.ERROR) {
            showedFatalOnce = true;
            Toast.makeText(MainActivity.this, "Web error: " + cm.message(), Toast.LENGTH_LONG).show();
          }
          return super.onConsoleMessage(cm);
        }
      });

      webView.setWebViewClient(new WebViewClient() {
        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
          super.onReceivedError(view, request, error);

          final String url =
              request != null && request.getUrl() != null ? request.getUrl().toString() : "(unknown)";
          final String desc = error != null ? String.valueOf(error.getDescription()) : "(no description)";
          final String msg = "Load error: " + desc + " @ " + url;

          Log.e(TAG, msg);

          if (!showedFatalOnce) {
            showedFatalOnce = true;
            Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show();
          }
        }
      });
    } catch (Throwable t) {
      Log.e(TAG, "Failed to attach diagnostics", t);
    }
  }
}
