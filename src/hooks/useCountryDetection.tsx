import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Silently detects user country on login and stores it in their profile.
 * Runs once per session, skips if already set.
 */
export const useCountryDetection = () => {
  useEffect(() => {
    const detect = async () => {
      const sessionKey = "arxon_country_detected";
      if (sessionStorage.getItem(sessionKey)) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      sessionStorage.setItem(sessionKey, "1");

      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/detect-country`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          }
        );
      } catch {
        // Silent fail - country detection is non-critical
      }
    };

    detect();
  }, []);
};
