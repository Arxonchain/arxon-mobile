import { useState } from "react";
import { Shield, Lock, Eye, EyeOff, Loader2, KeyRound, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SecuritySettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const handlePasswordChange = async () => {
    if (passwords.newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please ensure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully",
      });

      setPasswords({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Password Change Section */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Lock className="h-4 w-4 text-accent" />
            Change Password
          </h3>
          <p className="text-xs text-muted-foreground">
            Update your password to keep your account secure
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm text-foreground">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={passwords.newPassword}
                onChange={(e) =>
                  setPasswords({ ...passwords, newPassword: e.target.value })
                }
                className="pr-10 bg-secondary/50 border-border/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm text-foreground">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={passwords.confirmPassword}
                onChange={(e) =>
                  setPasswords({ ...passwords, confirmPassword: e.target.value })
                }
                className="pr-10 bg-secondary/50 border-border/50"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            onClick={handlePasswordChange}
            disabled={loading || !passwords.newPassword || !passwords.confirmPassword}
            className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Update Password
          </Button>
        </div>
      </div>

      {/* Security Features Info */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            Security Features
          </h3>
          <p className="text-xs text-muted-foreground">
            Active security measures protecting your account
          </p>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-secondary/30 border border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20 text-primary">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Encrypted Storage</p>
                <p className="text-xs text-muted-foreground">All data is encrypted at rest</p>
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">Active</span>
          </div>

          <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-secondary/30 border border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Two-Factor Auth (2FA)</p>
                <p className="text-xs text-muted-foreground">Add extra security layer</p>
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
