import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getPasswordResetRedirectUrl, getMagicLinkRedirectUrl } from "@/lib/auth/getRedirectUrl";
import { applyPendingReferralCode } from "@/lib/referral/applyPendingReferral";
import arxonLogo from "@/assets/arxon-logo.jpg";

type Mode = "signin" | "signup" | "forgot";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();

  const initialMode = useMemo<Mode>(() => {
    const m = (searchParams.get("mode") || "signup").toLowerCase();
    if (m === "signin") return "signin";
    if (m === "forgot") return "forgot";
    return "signup";
  }, [searchParams]);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState(() => {
    try {
      return localStorage.getItem("arxon_referral_code") || sessionStorage.getItem("arxon_referral_code") || "";
    } catch {
      return "";
    }
  });
  const [loading, setLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const titles: Record<Mode, string> = {
      signup: "Create account | ARXON",
      signin: "Sign in | ARXON",
      forgot: "Reset password | ARXON",
    };
    document.title = titles[mode];
  }, [mode]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrorText(null);
    setResetSent(false);
    setMagicLinkSent(false);
    setSearchParams({ mode: next });
  };

  /**
   * Send a magic link (passwordless sign-in) for password change flow.
   * This is more reliable than the reset link on custom domains.
   */
  const handleMagicLink = async () => {
    if (!email.trim()) {
      setErrorText("Please enter your email first.");
      return;
    }

    setErrorText(null);
    setMagicLinkLoading(true);

    try {
      // Use edge function to send magic link for existing users only
      const { data, error } = await supabase.functions.invoke("send-magic-link", {
        body: {
          email: email.trim(),
          redirectTo: getMagicLinkRedirectUrl(),
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        // "Signups not allowed" means user doesn't exist
        if (data.error.toLowerCase().includes("not allowed") || data.error.toLowerCase().includes("not found")) {
          setErrorText("No account found with this email. Please check and try again.");
        } else {
          setErrorText(data.error);
        }
        return;
      }

      setMagicLinkSent(true);
      toast({
        title: "Magic link sent!",
        description: "Check your email for a sign-in link. After signing in, you can set a new password.",
      });
    } catch (err: any) {
      console.error("Magic link error:", err);
      setErrorText(err.message || "Failed to send magic link. Please try the standard reset.");
    } finally {
      setMagicLinkLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setLoading(true);

    try {
      // Use proper redirect URL for custom domain support
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getPasswordResetRedirectUrl(),
      });

      if (error) {
        setErrorText(error.message);
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }

      setResetSent(true);
      toast({ 
        title: "Check your email", 
        description: "We sent you a password reset link" 
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === "forgot") {
      return handleForgotPassword(e);
    }

    setErrorText(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        // Force clear any stale localStorage/sessionStorage auth remnants before attempting sign-in
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
        } catch (e) { /* ignore */ }

        const { error } = await signIn(email, password);
        if (error) {
          // If "Invalid login credentials", give clearer guidance
          const msg = error.message?.toLowerCase().includes('invalid')
            ? "Invalid email or password. Please check your credentials and try again."
            : (error.message || "Sign in failed");
          setErrorText(msg);
          toast({ title: "Sign In Failed", description: msg, variant: "destructive" });
          return;
        }
        navigate("/");
        return;
      }

      // signup
      const { error } = await signUp(email, password);
      if (error) {
        setErrorText(error.message || "Sign up failed");
        toast({ title: "Sign Up Failed", description: error.message, variant: "destructive" });
        return;
      }

      // Apply referral code immediately after signup (non-blocking)
      const ref = referralCode.trim().toUpperCase();
      if (ref) {
        try {
          localStorage.setItem("arxon_referral_code", ref);
          sessionStorage.setItem("arxon_referral_code", ref);
        } catch {
          // ignore
        }
        // Fire and forget — applyPendingReferralCode will retry on next login if it fails
        applyPendingReferralCode().catch(() => {});
      }

      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-12">
      <main className="w-full max-w-md">
        <header className="flex items-center justify-center gap-3 mb-6">
          <img src={arxonLogo} alt="ARXON" className="h-10 w-10 rounded-lg" />
          <span className="text-2xl font-black">ARXON</span>
        </header>

        <h1 className="sr-only">
          {mode === "signup" ? "Create an account" : mode === "signin" ? "Sign in" : "Reset password"}
        </h1>

        <Card className="border-border/50 bg-card/95 backdrop-blur-xl">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl font-bold">
              {mode === "signup" 
                ? "Create your account" 
                : mode === "signin" 
                  ? "Sign in to ARXON" 
                  : "Reset your password"}
            </CardTitle>

            {mode !== "forgot" && (
              <div className="flex bg-secondary/50 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    mode === "signin"
                      ? "bg-accent text-accent-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    mode === "signup"
                      ? "bg-accent text-accent-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {mode === "forgot" && (resetSent || magicLinkSent) ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-accent/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-muted-foreground">
                  {magicLinkSent 
                    ? "Check your email for a magic sign-in link. After signing in, you can set a new password."
                    : "Check your email for a password reset link"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => switchMode("signin")}
                >
                  Back to sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-email">Email</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={loading}
                    required
                  />
                </div>

                {mode !== "forgot" && (
                  <div className="space-y-2">
                    <Label htmlFor="auth-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === "signup" ? "Create a password" : "Your password"}
                        disabled={loading}
                        minLength={6}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}

                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="auth-ref">Referral code (optional)</Label>
                    <Input
                      id="auth-ref"
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      placeholder="ARX-XXXXXX"
                      disabled={loading}
                    />
                  </div>
                )}

                {errorText && (
                  <div className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-sm text-foreground">
                    <p className="font-medium">Error</p>
                    <p className="text-muted-foreground break-words">{errorText}</p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading 
                    ? "Working…" 
                    : mode === "signup" 
                      ? "Create account" 
                      : mode === "signin" 
                        ? "Sign in" 
                        : "Send reset link"}
                </Button>

                {mode === "forgot" && (
                  <>
                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border/60" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">or</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      onClick={handleMagicLink}
                      disabled={magicLinkLoading || loading}
                    >
                      {magicLinkLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending…
                        </>
                      ) : (
                        "Send magic sign-in link instead"
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      If the reset link doesn't work, try the magic link. You'll sign in automatically and can then set a new password.
                    </p>
                  </>
                )}

                {mode === "forgot" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => switchMode("signin")}
                    disabled={loading}
                  >
                    Back to sign in
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/")}
                    disabled={loading}
                  >
                    Back to home
                  </Button>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
