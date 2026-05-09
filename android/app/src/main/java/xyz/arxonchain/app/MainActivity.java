package xyz.arxonchain.app;

import android.os.Bundle;
import android.webkit.WebView;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    // Enable Chrome remote debugging for WebView
    WebView.setWebContentsDebuggingEnabled(true);

    super.onCreate(savedInstanceState);

    // Prove native launched (you should briefly see this toast)
    Toast.makeText(this, "Arxon native started", Toast.LENGTH_SHORT).show();
  }
}
