import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { getAdminScope, type AdminScope } from "@/lib/adminAuth";

export const useAdmin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [adminScope, setAdminScope] = useState<AdminScope>(null);
  const [loading, setLoading] = useState(true);

  const checkAdmin = async (u: User) => {
    try {
      setAdminScope(await getAdminScope(u));
    } catch {
      setAdminScope(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setLoading(true);
        checkAdmin(u);
      } else {
        setAdminScope(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        checkAdmin(u);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = adminScope === "full";
  const isArenaAdmin = adminScope === "arena";
  const canAccessAdmin = adminScope === "full" || adminScope === "arena";

  return { user, isAdmin, isArenaAdmin, canAccessAdmin, adminScope, loading };
};
