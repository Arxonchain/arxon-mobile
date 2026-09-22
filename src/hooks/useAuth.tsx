import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/utils';
import { signUpWithFallback } from '@/lib/auth/signUpWithFallback';
import { getPasswordResetRedirectUrl } from '@/lib/auth/getRedirectUrl';
import { markPasswordRecovery } from '@/lib/auth/passwordRecoveryGate';
import { mapAuthError } from '@/lib/auth/authErrors';
import {
  backupAuthSession,
  clearAuthSessionBackup,
  readBestLocalSession,
  sessionStillValid,
} from '@/lib/auth/sessionBackup';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, referralCode?: string, captchaToken?: string) => Promise<{ error: Error | null; user: User | null }>;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, captchaToken?: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastAutoXSyncUserId = useRef<string | null>(null);
  const userInitiatedSignOut = useRef(false);

  const applySession = (next: Session | null) => {
    if (next && sessionStillValid(next)) {
      backupAuthSession(next);
    }
    setSession(next);
    setUser(next?.user ?? null);
  };

  const hydrateFromLocal = (local: Session) => {
    applySession(local);
    void supabase.auth
      .setSession({
        access_token: local.access_token,
        refresh_token: local.refresh_token,
      })
      .catch(() => {});
  };

  useEffect(() => {
    let mounted = true;

    // IMPORTANT: Avoid hard page reloads during auth callbacks.
    // A full reload can break custom-domain deployments if the host doesn't serve SPA routes
    // (e.g., /reset-password). We instead update history and dispatch popstate.
    const softNavigate = (path: string) => {
      try {
        window.history.replaceState(null, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch {
        // Fallback: last resort hard navigation
        window.location.assign(path);
      }
    };

    // Fail-safe: never block the whole app on a hung network request.
    // Reduced to 2.5s for faster fallback to landing page when backend is down.
    const failSafe = window.setTimeout(() => {
      if (!mounted) return;
      const local = readBestLocalSession();
      if (local) hydrateFromLocal(local);
      setLoading(false);
    }, 2500);

    // Set up auth state listener BEFORE getSession() to avoid missing the initial session
    // on slower devices / flaky storage environments.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        if (!userInitiatedSignOut.current) {
          const local = readBestLocalSession();
          if (local) {
            hydrateFromLocal(local);
            setLoading(false);
            window.clearTimeout(failSafe);
            return;
          }
        }
        userInitiatedSignOut.current = false;
        clearAuthSessionBackup();
        applySession(null);
        setLoading(false);
        window.clearTimeout(failSafe);
        return;
      }

      // Recovery session: only after email link — gate full app until password update.
      if (event === 'PASSWORD_RECOVERY' && session) {
        console.log('useAuth: PASSWORD_RECOVERY event received');
        markPasswordRecovery();
        applySession(session);
        setLoading(false);
        window.clearTimeout(failSafe);

        if (
          window.location.pathname !== '/reset-password' &&
          !window.location.pathname.startsWith('/auth/confirm')
        ) {
          softNavigate('/reset-password');
        }
        return;
      }

      if (event === 'SIGNED_IN' && session) {
        const recoveryInUrl =
          window.location.hash.includes('type=recovery') ||
          window.location.search.includes('type=recovery');
        if (recoveryInUrl) {
          markPasswordRecovery();
        }
        applySession(session);
        setLoading(false);
        window.clearTimeout(failSafe);
        return;
      }

      if (!session) {
        const local = readBestLocalSession();
        if (local) {
          hydrateFromLocal(local);
          setLoading(false);
          window.clearTimeout(failSafe);
          return;
        }
      }

      applySession(session);
      setLoading(false);
      window.clearTimeout(failSafe);
    });

    // Then fetch current session (fast path).
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        if (session) {
          applySession(session);
        } else {
          const local = readBestLocalSession();
          if (local) hydrateFromLocal(local);
        }
        setLoading(false);
        window.clearTimeout(failSafe);
      })
      .catch(() => {
        if (!mounted) return;
        const local = readBestLocalSession();
        if (local) hydrateFromLocal(local);
        setLoading(false);
        window.clearTimeout(failSafe);
      });

    return () => {
      mounted = false;
      window.clearTimeout(failSafe);
      subscription.unsubscribe();
    };
  }, []);

  // Auto-sync X rewards/boosts on login (non-blocking; skip under games maintenance / load shedding)
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    if (import.meta.env.VITE_GAMES_MAINTENANCE === 'true') return;
    if (lastAutoXSyncUserId.current === userId) return;
    lastAutoXSyncUserId.current = userId;

    // Fire-and-forget: don't await, don't block UI
    (async () => {
      try {
        const { data: xProfile } = await supabase
          .from('x_profiles')
          .select('username, profile_url, last_scanned_at, historical_scanned')
          .eq('user_id', userId)
          .maybeSingle();

        if (!xProfile?.username) return;

        const last = xProfile.last_scanned_at ? new Date(xProfile.last_scanned_at).getTime() : 0;
        const shouldRefresh = !last || Date.now() - last > 60 * 60 * 1000; // 1h throttle
        if (!shouldRefresh) return;

        // Don't await - let this run in background
        supabase.functions.invoke('scan-x-profile', {
          body: {
            username: xProfile.username,
            profileUrl: xProfile.profile_url,
            isInitialConnect: false,
            forceHistorical: !xProfile.historical_scanned,
          },
        }).catch(() => {}); // Silently ignore failures
      } catch (e) {
        // Silently fail - don't block the app
      }
    })();
  }, [session?.user?.id]);

  const signUp = async (email: string, password: string, referralCode?: string, captchaToken?: string) => {
    return signUpWithFallback(supabase, email, password, referralCode, captchaToken);
  };

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    const payload = {
      email: email.trim(),
      password,
      options: captchaToken ? { captchaToken } : undefined,
    };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword(payload),
          25_000,
          'Connection timed out. The server may be busy — please try again in a moment.',
        );

        if (error) {
          lastError = new Error(mapAuthError(error.message, 'signin'));
          const retryable = /timeout|fetch|network|503|502|504|busy|rate/i.test(error.message);
          if (!retryable || attempt === 2) return { error: lastError };
          await new Promise((r) => window.setTimeout(r, 800 * (attempt + 1)));
          continue;
        }

        if (data.session) applySession(data.session);
        return { error: null };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Sign in failed';
        lastError = new Error(mapAuthError(msg, 'signin'));
        if (attempt === 2) return { error: lastError };
        await new Promise((r) => window.setTimeout(r, 800 * (attempt + 1)));
      }
    }
    return { error: lastError ?? new Error('Sign in failed') };
  };

  const signOut = async () => {
    userInitiatedSignOut.current = true;
    clearAuthSessionBackup();
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string, captchaToken?: string) => {
    try {
      // Never carry an existing session into / through a reset request.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});

      const token = typeof captchaToken === 'string' ? captchaToken.trim() : '';
      const { data, error } = await withTimeout(
        supabase.functions.invoke('auth-recover', {
          body: {
            email: email.trim().toLowerCase(),
            captcha_token: token || undefined,
            redirect_to: getPasswordResetRedirectUrl(),
          },
        }),
        20_000,
        'Connection timed out. Please try again.'
      );

      // Ensure submit does not leave a session (recover must not auto-login).
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      setSession(null);
      setUser(null);

      if (error) {
        return { error: new Error(mapAuthError(error.message, 'reset')) };
      }
      if (data && (data as any).success === false) {
        return {
          error: new Error(
            mapAuthError(String((data as any).error || 'Password reset failed'), 'reset')
          ),
        };
      }
      return { error: null };
    } catch (e) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      setSession(null);
      setUser(null);
      const msg = e instanceof Error ? e.message : 'Password reset failed';
      return { error: new Error(mapAuthError(msg, 'reset')) };
    }
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
