import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Emails with admin access when user_roles row is missing (legacy fallback). */
export const ADMIN_EMAIL_ALLOWLIST = ["gabemetax@gmail.com"];

export async function checkUserIsAdmin(user: User): Promise<boolean> {
  if (ADMIN_EMAIL_ALLOWLIST.includes(user.email || "")) {
    return true;
  }

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  return !error && !!data;
}
