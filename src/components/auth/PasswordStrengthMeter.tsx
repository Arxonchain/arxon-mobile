import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { validatePassword } from "@/lib/passwordValidation";

export default function PasswordStrengthMeter({ password }: { password: string }) {
  const info = useMemo(() => validatePassword(password), [password]);

  const width = Math.max(0, Math.min(100, info.score));
  const barClass =
    info.strength === "weak"
      ? "bg-destructive"
      : info.strength === "fair"
        ? "bg-primary/60"
        : info.strength === "good"
          ? "bg-primary/80"
          : "bg-primary";

  const checks = useMemo(
    () => [
      { label: "12+ characters", ok: password.length >= 12 },
      { label: "Uppercase", ok: /[A-Z]/.test(password) },
      { label: "Lowercase", ok: /[a-z]/.test(password) },
      { label: "Number", ok: /[0-9]/.test(password) },
      { label: "Special", ok: /[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\\/`~]/.test(password) },
    ],
    [password],
  );

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Password strength</span>
        <span className="text-xs font-medium text-foreground">{info.strength}</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full transition-all duration-300", barClass)} style={{ width: `${width}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-2 text-xs">
            <span className={cn("h-1.5 w-1.5 rounded-full", c.ok ? "bg-primary" : "bg-muted-foreground/40")} />
            <span className={cn(c.ok ? "text-foreground" : "text-muted-foreground")}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
