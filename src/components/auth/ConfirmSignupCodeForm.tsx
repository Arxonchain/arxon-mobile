import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";

type Props = {
  email: string;
  code: string;
  loading?: boolean;
  errorText?: string | null;
  onEmailChange: (email: string) => void;
  onCodeChange: (code: string) => void;
  onSubmit: () => void;
  onBack?: () => void;
};

export default function ConfirmSignupCodeForm({
  email,
  code,
  loading,
  errorText,
  onEmailChange,
  onCodeChange,
  onSubmit,
  onBack,
}: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="confirm-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="confirm-email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="pl-10 bg-black/20 border-cyan-400/20"
            required
            autoComplete="email"
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-code">Confirmation code</Label>
        <Input
          id="confirm-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="8-digit code from the email"
          value={code}
          onChange={(e) => onCodeChange(e.target.value.replace(/\s/g, ""))}
          className="tracking-[0.3em] text-center text-lg bg-black/20 border-cyan-400/20"
          maxLength={8}
          required
          disabled={loading}
        />
      </div>

      {errorText ? (
        <p className="text-sm text-destructive">{errorText}</p>
      ) : null}

      <Button type="submit" className="w-full btn-mining btn-glow" disabled={loading || !email.trim() || !code.trim()}>
        {loading ? "Please wait..." : "Confirm email"}
      </Button>

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="w-full text-sm text-muted-foreground hover:text-foreground"
          disabled={loading}
        >
          Back to sign in
        </button>
      ) : null}
    </form>
  );
}
