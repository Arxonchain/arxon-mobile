import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import OtpEmailPrompt from "@/components/auth/OtpEmailPrompt";

/**
 * Handles all auth callbacks from email links (confirmation, recovery, magic links).
 * This page processes the tokens and redirects appropriately.
 */
const AuthConfirm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "needs_email">("loading");
  const [message, setMessage] = useState("Processing...");
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [otpType, setOtpType] = useState<string | null>(null);
  const [otpNext, setOtpNext] = useState<string>("/");
  const [otpError, setOtpError] = useState<string | null>(null);

  useEffect(() => {
    const processAuthCallback = async () => {
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const code = searchParams.get("code");
      const token = searchParams.get("token"); // legacy OTP-style links
      const email = searchParams.get("email");
      const explicitNext = searchParams.get("next");

      // Handle hash fragment tokens (implicit flow)
      const hash = window.location.hash.slice(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashType = hashParams.get("type");

      const flowType = (type || hashType || "").toLowerCase();
      const next =
        explicitNext ||
        (flowType === "recovery"
          ? "/reset-password"
          : flowType === "magiclink"
            ? "/change-password"
            : "/");

       console.log("AuthConfirm: Processing callback", { 
        hasTokenHash: !!token_hash, 
        type, 
        hasCode: !!code, 
        hasAccessToken: !!accessToken,
        hashType,
         flowType,
         next,
        hasToken: !!token,
        hasEmail: !!email,
      });

      // Fail-safe: don't hang forever
      const hangTimer = window.setTimeout(() => {
        setStatus("error");
        setMessage("This link is taking too long to process. Please request a new one and try again.");
      }, 12_000);

      try {
        // 0. Handle legacy OTP links: ?token=...&type=recovery[&email=...]
         if (token && (type || hashType || "recovery")) {
           const t = (type || hashType || "recovery").toLowerCase();

          // If the template didn't include email, we must ask for it.
          if (!email) {
            setOtpToken(token);
            setOtpType(t);
            setOtpNext(next);
            setStatus("needs_email");
            setMessage("Enter your email to verify this link.");
            return;
          }

          setMessage("Verifying link...");
          const { error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: t as any,
          });

          if (error) {
            console.error("AuthConfirm: verifyOtp(token) error:", error);
            setStatus("error");
            setMessage(error.message || "Failed to verify. Please try again.");
            return;
          }

           if (t === "recovery") {
            setStatus("success");
            setMessage("Verified! Redirecting to password reset...");
            setTimeout(() => navigate("/reset-password"), 800);
            return;
          }

           if (t === "magiclink") {
             setStatus("success");
             setMessage("Verified! Redirecting...");
             setTimeout(() => navigate("/change-password"), 800);
             return;
           }

           setStatus("success");
           setMessage("Verified! Redirecting...");
           setTimeout(() => navigate(next), 1000);
          return;
        }

        // 1. Handle hash-based tokens (access_token + refresh_token in hash)
        if (accessToken && refreshToken) {
          setMessage("Verifying your credentials...");

          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("AuthConfirm: setSession error:", error);
            setStatus("error");
            setMessage(error.message || "Failed to verify. Please try again.");
            return;
          }

           if (flowType === "recovery") {
             setStatus("success");
             setMessage("Verified! Redirecting to password reset...");
             setTimeout(() => navigate("/reset-password"), 800);
             return;
           }

           if (flowType === "magiclink") {
             setStatus("success");
             setMessage("Verified! Redirecting...");
             setTimeout(() => navigate("/change-password"), 800);
             return;
           }

           setStatus("success");
           setMessage("Verified! Redirecting...");
           setTimeout(() => navigate(next), 1000);
          return;
        }

        // 2. Handle PKCE code exchange
        if (code) {
          setMessage("Exchanging code...");

          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("AuthConfirm: Code exchange error:", error);
            setStatus("error");
            setMessage(error.message || "Failed to verify. Please try again.");
            return;
          }

           if (flowType === "recovery") {
             setStatus("success");
             setMessage("Verified! Redirecting to password reset...");
             setTimeout(() => navigate("/reset-password"), 800);
             return;
           }

           if (flowType === "magiclink") {
             setStatus("success");
             setMessage("Verified! Redirecting...");
             setTimeout(() => navigate("/change-password"), 800);
             return;
           }

           setStatus("success");
           setMessage("Verified! Redirecting...");
           setTimeout(() => navigate(next), 1000);
          return;
        }

        // 3. Handle token_hash verification
        if (token_hash && type) {
          setMessage("Verifying link...");

          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
          });

          if (error) {
            console.error("AuthConfirm: verifyOtp(token_hash) error:", error);
            setStatus("error");
            setMessage(error.message || "Failed to verify. Please try again.");
            return;
          }

           if (flowType === "recovery") {
             setStatus("success");
             setMessage("Verified! Redirecting to password reset...");
             setTimeout(() => navigate("/reset-password"), 800);
             return;
           }

           if (flowType === "magiclink") {
             setStatus("success");
             setMessage("Verified! Redirecting...");
             setTimeout(() => navigate("/change-password"), 800);
             return;
           }

           setStatus("success");
           setMessage("Email confirmed! Redirecting...");
           setTimeout(() => navigate(next), 1500);
          return;
        }

        // 4. No valid params found - check if we have an existing session
        const {
          data: { session },
        } = await supabase.auth.getSession();

         if (session) {
           if (flowType === "recovery") {
             setStatus("success");
             setMessage("Session found! Redirecting to password reset...");
             setTimeout(() => navigate("/reset-password"), 500);
             return;
           }

           if (flowType === "magiclink") {
             setStatus("success");
             setMessage("Session found! Redirecting...");
             setTimeout(() => navigate("/change-password"), 500);
             return;
           }

           setStatus("success");
           setMessage("Already signed in! Redirecting...");
           setTimeout(() => navigate(next), 500);
           return;
         }

        // No valid parameters and no session
        setStatus("error");
        setMessage("Invalid or expired link. Please request a new one.");
      } finally {
        window.clearTimeout(hangTimer);
      }
    };

    processAuthCallback();
  }, [searchParams, navigate]);

  const handleOtpEmailSubmit = async (email: string) => {
    if (!otpToken || !otpType) return;
    setOtpError(null);
    setStatus("loading");
    setMessage("Verifying link...");

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpToken,
      type: otpType as any,
    });

    if (error) {
      console.error("AuthConfirm: verifyOtp(email+token) error:", error);
      setOtpError(error.message || "Failed to verify. Please try again.");
      setStatus("needs_email");
      setMessage("Enter your email to verify this link.");
      return;
    }

    if (otpType === "recovery") {
      setStatus("success");
      setMessage("Verified! Redirecting to password reset...");
      setTimeout(() => navigate("/reset-password"), 800);
      return;
    }

    if (otpType === "magiclink") {
      setStatus("success");
      setMessage("Verified! Redirecting...");
      setTimeout(() => navigate("/change-password"), 800);
      return;
    }

    setStatus("success");
    setMessage("Verified! Redirecting...");
    setTimeout(() => navigate(otpNext || "/"), 1000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">{message}</h1>
          </>
        )}
        {status === "needs_email" && (
          <OtpEmailPrompt
            title="Verify reset link"
            description={message}
            errorText={otpError}
            onSubmit={handleOtpEmailSubmit}
            onCancel={() => navigate("/auth?mode=forgot")}
          />
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">{message}</h1>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">{message}</h1>
            <button
              onClick={() => navigate("/auth?mode=forgot")}
              className="text-primary hover:underline"
            >
              Request a new link
            </button>
            <br />
            <button
              onClick={() => navigate("/auth")}
              className="text-muted-foreground hover:underline text-sm"
            >
              Back to login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthConfirm;
