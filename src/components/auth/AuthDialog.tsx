import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Mode = "signup" | "signin";

export interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional referral code to persist for the /auth page. */
  initialReferralCode?: string;
  /** Optional default mode (kept for backward/forward compatibility). */
  defaultMode?: Mode;
}

/**
 * Compatibility AuthDialog used across the app.
 *
 * The project now uses a dedicated /auth page; this dialog simply routes users there.
 * Keeping this component avoids broken imports in production builds (e.g. Vercel).
 */
export default function AuthDialog({
  open,
  onOpenChange,
  initialReferralCode = "",
  defaultMode = "signup",
}: AuthDialogProps) {
  const [mode, setMode] = useState<Mode>(defaultMode);

  useEffect(() => {
    if (open) setMode(defaultMode);
  }, [open, defaultMode]);

  // Persist referral code (if present) so /auth can pick it up.
  useEffect(() => {
    if (!open) return;
    const ref = initialReferralCode.trim().toUpperCase();
    if (!ref) return;
    try {
      localStorage.setItem("arxon_referral_code", ref);
      sessionStorage.setItem("arxon_referral_code", ref);
    } catch {
      // ignore storage errors
    }
  }, [open, initialReferralCode]);

  const href = useMemo(() => `/auth?mode=${mode}`, [mode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in required</DialogTitle>
          <DialogDescription>
            To continue, please {mode === "signup" ? "create an account" : "sign in"}. You’ll be taken to the
            dedicated authentication page.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={mode === "signup" ? "default" : "outline"}
            onClick={() => setMode("signup")}
            className="flex-1"
          >
            Sign up
          </Button>
          <Button
            type="button"
            variant={mode === "signin" ? "default" : "outline"}
            onClick={() => setMode("signin")}
            className="flex-1"
          >
            Sign in
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button asChild onClick={() => onOpenChange(false)}>
            <a href={href}>Continue</a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
