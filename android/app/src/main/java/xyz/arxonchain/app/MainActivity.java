package xyz.arxonchain.app;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
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
      bridge.setWebViewClient(new DiagnosticBridgeWebViewClient(bridge, this));
    } else {
      Log.w(TAG, "Bridge was null after onCreate; skipping WebViewClient wrapper");
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
