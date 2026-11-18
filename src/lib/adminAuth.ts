import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Full admin only. Never put arena operators here. */
export const ADMIN_EMAIL_ALLOWLIST = ["gabemetax@gmail.com"];

/** Arena Markets + Battle History only. Never grants other admin tabs. */
export const ARENA_ADMIN_EMAIL_ALLOWLIST = ["effiomemmanuel03@gmail.com"];

export const ARENA_ADMIN_PATHS = ["/admin/arena", "/admin/battle-history"] as const;

export type AdminScope = "full" | "arena" | null;

export function normalizeAdminEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}

export function isArenaAdminPath(pathname: string): boolean {
  return ARENA_ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function getAdminScope(user: User): Promise<AdminScope> {
  const email = normalizeAdminEmail(user.email);
  if (ADMIN_EMAIL_ALLOWLIST.includes(email)) return "full";

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles = (!error && data ? data.map((row) => row.role) : []) as string[];
  if (roles.includes("admin")) return "full";
  if (roles.includes("arena_admin") || ARENA_ADMIN_EMAIL_ALLOWLIST.includes(email)) {
    return "arena";
  }
  return null;
}

export async function checkUserIsAdmin(user: User): Promise<boolean> {
  return (await getAdminScope(user)) === "full";
}
