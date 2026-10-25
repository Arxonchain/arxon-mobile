package xyz.arxonchain.app;

import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Message;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.inputmethod.EditorInfo;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;

import com.getcapacitor.Bridge;

/**
 * In-app WebView — same pattern MetaMask and Phantom use (not Chrome Custom Tabs).
 * Top: back, forward, address, reload. Bottom: Done returns to Explore.
 */
final class InAppBrowserOverlay {

  private static final int BG = Color.parseColor("#050505");
  private static final int BAR = Color.parseColor("#11161f");
  private static final int LINE = Color.parseColor("#2a3447");
  private static final int FIELD = Color.parseColor("#1c2025");
  private static final int ACCENT = Color.parseColor("#accafe");
  private static final int INK = Color.parseColor("#0c1018");
  private static final int MUTED = Color.parseColor("#8c8f99");

  private final MainActivity activity;
  private FrameLayout root;
  private WebView web;
  private EditText urlField;
  private ProgressBar progress;
  private OnBackPressedCallback backCallback;
  private boolean open;

  InAppBrowserOverlay(MainActivity activity) {
    this.activity = activity;
  }

  void open(String url) {
    if (url == null || url.trim().isEmpty()) {
      return;
    }
    String href = url.trim();
    if (!allowedBrowseUrl(href)) {
      return;
    }
    if (root == null) {
      build();
    }
    urlField.setText(href);
    web.loadUrl(href);
    root.setVisibility(View.VISIBLE);
    root.bringToFront();
    open = true;
    if (backCallback != null) {
      backCallback.setEnabled(true);
    }
  }

  boolean isOpen() {
    return open;
  }

  void close() {
    boolean wasOpen = open;
    open = false;
    if (backCallback != null) {
      backCallback.setEnabled(false);
    }
    if (web != null) {
      web.stopLoading();
      web.loadUrl("about:blank");
    }
    if (root != null) {
      root.setVisibility(View.GONE);
    }
    if (wasOpen) {
      notifyJs("window.__arxonBrowseClosed&&window.__arxonBrowseClosed()");
    }
  }

  void goBack() {
    if (web != null && web.canGoBack()) {
      web.goBack();
      return;
    }
    close();
  }

  void goForward() {
    if (web != null && web.canGoForward()) {
      web.goForward();
    }
  }

  void reload() {
    if (web != null) {
      web.reload();
    }
  }

  private void build() {
    FrameLayout content = activity.findViewById(android.R.id.content);
    root = new FrameLayout(activity);
    root.setClickable(true);
    root.setBackgroundColor(BG);
    root.setVisibility(View.GONE);

    LinearLayout column = new LinearLayout(activity);
    column.setOrientation(LinearLayout.VERTICAL);
    column.setLayoutParams(new FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

    int pad = dp(10);
    LinearLayout bar = new LinearLayout(activity);
    bar.setOrientation(LinearLayout.HORIZONTAL);
    bar.setGravity(Gravity.CENTER_VERTICAL);
    bar.setPadding(pad, statusPad() + dp(6), pad, dp(6));
    bar.setBackgroundColor(BAR);
    bar.setLayoutParams(new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

    bar.addView(roundBtn("‹", this::goBack));
    bar.addView(roundBtn("›", this::goForward));

    urlField = new EditText(activity);
    urlField.setTextColor(Color.WHITE);
    urlField.setHintTextColor(MUTED);
    urlField.setHint("Search or enter a site");
    urlField.setSingleLine(true);
    urlField.setImeOptions(EditorInfo.IME_ACTION_GO);
    urlField.setInputType(InputType.TYPE_TEXT_VARIATION_URI);
    urlField.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
    urlField.setPadding(dp(10), dp(8), dp(10), dp(8));
    urlField.setBackground(roundRect(FIELD, dp(10)));
    LinearLayout.LayoutParams urlLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
    urlLp.setMargins(dp(6), 0, dp(6), 0);
    urlField.setLayoutParams(urlLp);
    urlField.setOnEditorActionListener((v, actionId, event) -> {
      if (actionId == EditorInfo.IME_ACTION_GO
          || actionId == EditorInfo.IME_ACTION_DONE
          || (event != null && event.getKeyCode() == KeyEvent.KEYCODE_ENTER)) {
        loadTyped();
        return true;
      }
      return false;
    });
    bar.addView(urlField);
    bar.addView(roundBtn("↻", this::reload));

    progress = new ProgressBar(activity, null, android.R.attr.progressBarStyleHorizontal);
    progress.setMax(100);
    progress.setProgress(0);
    LinearLayout.LayoutParams progressLp = new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, dp(3));
    progress.setLayoutParams(progressLp);

    web = new WebView(activity);
    web.setBackgroundColor(Color.WHITE);
    WebSettings settings = web.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setDatabaseEnabled(true);
    settings.setLoadWithOverviewMode(true);
    settings.setUseWideViewPort(true);
    settings.setSupportZoom(true);
    settings.setBuiltInZoomControls(true);
    settings.setDisplayZoomControls(false);
    settings.setSupportMultipleWindows(true);
    settings.setJavaScriptCanOpenWindowsAutomatically(true);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
    String ua = settings.getUserAgentString();
    if (ua != null && !ua.contains("ArxonWallet")) {
      settings.setUserAgentString(ua + " ArxonWallet/1.0");
    }
    CookieManager cookies = CookieManager.getInstance();
    cookies.setAcceptCookie(true);
    cookies.setAcceptThirdPartyCookies(web, true);

    web.setWebViewClient(new WebViewClient() {
      @Override
      public boolean shouldOverrideUrlLoading(@NonNull WebView view, @NonNull WebResourceRequest request) {
        Uri uri = request.getUrl();
        if (uri == null) {
          return false;
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme();
        if ("http".equals(scheme) || "https".equals(scheme)) {
          return walletOrigin(uri.getHost());
        }
        return true;
      }

      @Override
      public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
        urlField.setText(url == null ? "" : url);
        progress.setProgress(8);
        notifyJs("window.__arxonBrowseUrl&&window.__arxonBrowseUrl(" + jsString(url) + ")");
      }

      @Override
      public void onPageFinished(WebView view, String url) {
        urlField.setText(url == null ? "" : url);
        progress.setProgress(100);
      }
    });
    web.setWebChromeClient(new WebChromeClient() {
      @Override
      public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
        WebView.HitTestResult hit = view.getHitTestResult();
        String extra = hit != null ? hit.getExtra() : null;
        if (extra != null && (extra.startsWith("http://") || extra.startsWith("https://"))) {
          view.loadUrl(extra);
        }
        return false;
      }

      @Override
      public void onProgressChanged(WebView view, int newProgress) {
        progress.setProgress(newProgress);
      }
    });
    LinearLayout.LayoutParams webLp = new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f);
    web.setLayoutParams(webLp);

    LinearLayout dock = new LinearLayout(activity);
    dock.setOrientation(LinearLayout.HORIZONTAL);
    dock.setGravity(Gravity.CENTER_VERTICAL);
    dock.setBackgroundColor(BAR);
    dock.setPadding(dp(12), dp(10), dp(12), dp(10) + navPad());
    dock.setLayoutParams(new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

    TextView done = new TextView(activity);
    done.setText("Done");
    done.setTextColor(INK);
    done.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
    done.setGravity(Gravity.CENTER);
    done.setTypeface(done.getTypeface(), android.graphics.Typeface.BOLD);
    LinearLayout.LayoutParams doneLp = new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, dp(48));
    done.setLayoutParams(doneLp);
    done.setBackground(roundRect(ACCENT, dp(12)));
    done.setOnClickListener((v) -> close());
    dock.addView(done);

    column.addView(bar);
    column.addView(progress);
    column.addView(web);
    column.addView(dock);
    root.addView(column);
    content.addView(root, new FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

    backCallback = new OnBackPressedCallback(false) {
      @Override
      public void handleOnBackPressed() {
        goBack();
      }
    };
    activity.getOnBackPressedDispatcher().addCallback(activity, backCallback);
  }

  private void loadTyped() {
    String next = urlField.getText() == null ? "" : urlField.getText().toString().trim();
    if (next.isEmpty()) {
      return;
    }
    if (!next.startsWith("http://") && !next.startsWith("https://")) {
      if (next.contains(".") && !next.contains(" ")) {
        next = "https://" + next;
      } else {
        next = "https://duckduckgo.com/?q=" + Uri.encode(next);
      }
    }
    if (!allowedBrowseUrl(next)) {
      return;
    }
    web.loadUrl(next);
  }

  private boolean allowedBrowseUrl(String raw) {
    if (raw == null) {
      return false;
    }
    String href = raw.trim();
    String lower = href.toLowerCase();
    if (href.isEmpty()
        || lower.startsWith("javascript:")
        || lower.startsWith("file:")
        || lower.startsWith("data:")
        || lower.startsWith("blob:")
        || lower.startsWith("content:")
        || lower.startsWith("intent:")) {
      return false;
    }
    Uri uri = Uri.parse(href);
    String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
    if (!"https".equals(scheme) && !"http".equals(scheme)) {
      return false;
    }
    return !walletOrigin(uri.getHost());
  }

  private boolean walletOrigin(String host) {
    if (host == null) {
      return true;
    }
    String name = host.toLowerCase();
    return "127.0.0.1".equals(name)
        || "localhost".equals(name)
        || "0.0.0.0".equals(name)
        || "arxon-mobile.pages.dev".equals(name);
  }

  private TextView roundBtn(String mark, Runnable action) {
    TextView btn = new TextView(activity);
    btn.setText(mark);
    btn.setTextColor(ACCENT);
    btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
    btn.setGravity(Gravity.CENTER);
    int size = dp(40);
    LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(size, size);
    lp.setMargins(dp(2), 0, dp(2), 0);
    btn.setLayoutParams(lp);
    btn.setBackground(roundRect(FIELD, size / 2f));
    btn.setOnClickListener((v) -> action.run());
    return btn;
  }

  private GradientDrawable roundRect(int color, float radius) {
    GradientDrawable bg = new GradientDrawable();
    bg.setColor(color);
    bg.setCornerRadius(radius);
    return bg;
  }

  private int statusPad() {
    int resId = activity.getResources().getIdentifier("status_bar_height", "dimen", "android");
    return resId > 0 ? activity.getResources().getDimensionPixelSize(resId) : dp(24);
  }

  private int navPad() {
    try {
      if (Build.VERSION.SDK_INT >= 30) {
        WindowInsets insets = activity.getWindow().getDecorView().getRootWindowInsets();
        if (insets != null) {
          return insets.getInsets(WindowInsets.Type.navigationBars()).bottom;
        }
      }
    } catch (Exception ignored) {
      /* default */
    }
    int resId = activity.getResources().getIdentifier("navigation_bar_height", "dimen", "android");
    return resId > 0 ? activity.getResources().getDimensionPixelSize(resId) : dp(16);
  }

  private int dp(int value) {
    return Math.round(value * activity.getResources().getDisplayMetrics().density);
  }

  private void notifyJs(String js) {
    try {
      Bridge bridge = activity.getBridge();
      WebView cap = bridge != null ? bridge.getWebView() : null;
      if (cap == null) {
        return;
      }
      cap.post(() -> cap.evaluateJavascript(js, null));
    } catch (Exception ignored) {
      /* wallet page may be reloading */
    }
  }

  private static String jsString(String raw) {
    if (raw == null) {
      return "''";
    }
    return "'" + raw.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ").replace("\r", "") + "'";
  }
}
