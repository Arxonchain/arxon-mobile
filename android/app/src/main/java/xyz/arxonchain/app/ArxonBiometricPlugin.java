package xyz.arxonchain.app;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

/** BiometricPrompt without CryptoObject — Xiaomi hangs the Capgo plugin. */
@CapacitorPlugin(name = "ArxonBiometric")
public class ArxonBiometricPlugin extends Plugin {

  @PluginMethod
  public void verify(PluginCall call) {
    String title = call.getString("title", "Arxon");
    String subtitle = call.getString("subtitle", "");
    if (getActivity() == null) {
      call.reject("Fingerprint isn’t available right now.");
      return;
    }
    getActivity().runOnUiThread(() -> prompt(call, empty(title, "Arxon"), subtitle == null ? "" : subtitle));
  }

  private void prompt(PluginCall call, String title, String subtitle) {
    Executor executor = ContextCompat.getMainExecutor(getActivity());
    BiometricPrompt prompt = new BiometricPrompt(
        getActivity(),
        executor,
        new BiometricPrompt.AuthenticationCallback() {
          @Override
          public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
            call.reject(errString == null ? "Canceled." : errString.toString());
          }

          @Override
          public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
            JSObject ret = new JSObject();
            ret.put("ok", true);
            call.resolve(ret);
          }
        });
    BiometricPrompt.PromptInfo.Builder builder = new BiometricPrompt.PromptInfo.Builder()
        .setTitle(title)
        .setNegativeButtonText("Cancel")
        .setAllowedAuthenticators(
            BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK);
    if (!subtitle.trim().isEmpty()) {
      builder.setSubtitle(subtitle.trim());
    }
    try {
      prompt.authenticate(builder.build());
    } catch (Exception e) {
      call.reject(e.getMessage() == null ? "Could not open fingerprint." : e.getMessage());
    }
  }

  private static String empty(String value, String fallback) {
    return value == null || value.trim().isEmpty() ? fallback : value.trim();
  }
}
