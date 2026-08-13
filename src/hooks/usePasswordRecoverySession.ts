import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  isPasswordRecoveryPending,
  markPasswordRecovery,
} from "@/lib/auth/passwordRecoveryGate";

/**
 * Detect a valid password-recovery session (email link only).
 * Ordinary signed-in sessions are NOT treated as recovery.
 */
export function usePasswordRecoverySession() {
  const [checking, setChecking] = useState(true);
  const [isValidSession, setIsValidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const acceptRecovery = () => {
      if (cancelled) return;
      markPasswordRecovery();
      setIsValidSession(true);
      setChecking(false);
      window.history.replaceState(null, "", "/reset-password");
    };

    const reject = (message: string) => {
      if (cancelled) return;
      setError(message);
      setIsValidSession(false);
      setChecking(false);
    };

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session && isPasswordRecoveryPending()) {
          acceptRecovery();
          return;
        }

        const hasRecoveryParams =
          window.location.hash.includes("type=recovery") ||
          window.location.search.includes("type=recovery") ||
          window.location.hash.includes("access_token") ||
          window.location.search.includes("token_hash") ||
          window.location.search.includes("code=") ||
          window.location.search.includes("token=");

        if (!session && hasRecoveryParams) {
          await new Promise((r) => setTimeout(r, 1500));
          const { data: { session: retry } } = await supabase.auth.getSession();
          if (retry && (isPasswordRecoveryPending() || hasRecoveryParams)) {
            acceptRecovery();
            return;
          }
          reject("This reset link has expired or is invalid. Please request a new one.");
          return;
        }

        if (session && !isPasswordRecoveryPending()) {
          reject("Open the password reset link from your email to continue.");
          return;
        }

        reject("No reset link detected. Please use the link from your email.");
      } catch (e) {
        reject(e instanceof Error ? e.message : "Failed to verify reset link");
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;

      if (event === "PASSWORD_RECOVERY" && session) {
        acceptRecovery();
        return;
      }

      if (event === "SIGNED_IN" && session) {
        const isRecoveryFlow =
          isPasswordRecoveryPending() ||
          window.location.hash.includes("type=recovery") ||
          window.location.search.includes("type=recovery");
        if (isRecoveryFlow) {
          acceptRecovery();
        }
      }
    });

    checkSession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { checking, isValidSession, error };
}
