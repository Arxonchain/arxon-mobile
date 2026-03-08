import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  title?: string;
  description?: string;
  loading?: boolean;
  errorText?: string | null;
  initialEmail?: string;
  onSubmit: (email: string) => void;
  onCancel?: () => void;
};

/**
 * Some auth email templates send `?token=...` without the user's email.
 * Supabase requires email+token to verify OTP, so we ask for email as a fallback.
 */
export default function OtpEmailPrompt({
  title = "Confirm your email",
  description = "Enter the email address you used to request this link.",
  loading,
  errorText,
  initialEmail = "",
  onSubmit,
  onCancel,
}: Props) {
  const [email, setEmail] = useState(initialEmail);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(email.trim());
        }}
        className="space-y-3"
      >
        <div className="space-y-2 text-left">
          <Label htmlFor="otp-email">Email</Label>
          <Input
            id="otp-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
            required
          />
        </div>

        {errorText && (
          <div className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-sm text-foreground">
            <p className="font-medium">Error</p>
            <p className="text-muted-foreground break-words">{errorText}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={loading}>
            Continue
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" className="w-full" onClick={onCancel} disabled={loading}>
              Back
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
