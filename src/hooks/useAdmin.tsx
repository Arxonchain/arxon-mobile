import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

// Emails with hardcoded admin access (fallback if user_roles table is empty)
const ADMIN_EMAILS = ["gabemetax@gmail.com"];

export const useAdmin = () => {
  const [user,    setUser]    = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdmin = async (u: User) => {
    // First: check by email (instant, no DB round-trip needed for the main admin)
    if (ADMIN_EMAILS.includes(u.email || "")) {
      setIsAdmin(true);
      setLoading(false);
      return;
    }
    // Fallback: check user_roles table
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!error && !!data);
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        checkAdmin(u);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    // Initial session check
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

  return { user, isAdmin, loading };
};
