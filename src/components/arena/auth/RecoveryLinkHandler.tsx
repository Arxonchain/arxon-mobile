import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function RecoveryLinkHandler() {
  useEffect(() => {
    // Optional: handle recovery link params if needed
    console.log("RecoveryLinkHandler mounted");
  }, []);

  return null; // invisible component
}
