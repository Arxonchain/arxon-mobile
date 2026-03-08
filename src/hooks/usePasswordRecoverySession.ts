import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Simple hook to detect if a valid recovery session exists.
 * Uses Supabase's built-in session management instead of complex token parsing.
 */
export function usePasswordRecoverySession() {
  const [checking, setChecking] = useState(true);
  const [isValidSession, setIsValidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        // First, check if we have an existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log("Recovery: Found existing session");
          if (!cancelled) {
            setIsValidSession(true);
            setChecking(false);
            // Clean up URL
            window.history.replaceState(null, "", "/reset-password");
          }
          return;
        }

        // No session yet - wait a bit for auth state to settle
        // (Supabase may still be processing the recovery link)
        await new Promise(r => setTimeout(r, 500));
        
        // Check again
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        
        if (retrySession) {
          console.log("Recovery: Found session on retry");
          if (!cancelled) {
            setIsValidSession(true);
            setChecking(false);
            window.history.replaceState(null, "", "/reset-password");
          }
          return;
        }

        // Still no session - check if URL has recovery params
        const hasRecoveryParams = 
          window.location.hash.includes("access_token") ||
          window.location.search.includes("token_hash") ||
          window.location.search.includes("code=") ||
          window.location.search.includes("token=");

        if (hasRecoveryParams) {
          console.log("Recovery: Has recovery params but no session, waiting for auth state...");
          // Give more time for the auth state to update
          await new Promise(r => setTimeout(r, 2000));
          
          const { data: { session: finalSession } } = await supabase.auth.getSession();
          if (finalSession) {
            if (!cancelled) {
              setIsValidSession(true);
              setChecking(false);
              window.history.replaceState(null, "", "/reset-password");
            }
            return;
          }
          
          // If still no session, the link is likely expired or invalid
          if (!cancelled) {
            setError("This reset link has expired or is invalid. Please request a new one.");
            setChecking(false);
          }
        } else {
          // No recovery params at all
          if (!cancelled) {
            setError("No reset link detected. Please use the link from your email.");
            setChecking(false);
          }
        }
      } catch (e) {
        console.error("Recovery session check error:", e);
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to verify reset link");
          setChecking(false);
        }
      }
    };

    // Listen for PASSWORD_RECOVERY event - this is the most reliable way
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      
      console.log("Recovery: Auth state changed:", event);
      
      if (event === "PASSWORD_RECOVERY" && session) {
        console.log("Recovery: PASSWORD_RECOVERY event received");
        setIsValidSession(true);
        setChecking(false);
        window.history.replaceState(null, "", "/reset-password");
      } else if (event === "SIGNED_IN" && session) {
        // Some recovery flows emit SIGNED_IN instead
        const isRecoveryFlow = 
          window.location.pathname === "/reset-password" ||
          window.location.hash.includes("type=recovery") ||
          window.location.search.includes("type=recovery");
        
        if (isRecoveryFlow) {
          console.log("Recovery: SIGNED_IN event in recovery context");
          setIsValidSession(true);
          setChecking(false);
          window.history.replaceState(null, "", "/reset-password");
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
