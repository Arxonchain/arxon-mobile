import { useState, useEffect, useRef } from "react";
import { User, Wallet, Save, Loader2, Upload, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  username: string;
  avatar_url: string;
  wallet_address: string;
}

const ProfileSettings = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    username: "",
    avatar_url: "",
    wallet_address: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: claimData } = await supabase
        .from("claims")
        .select("wallet_address")
        .eq("user_id", user.id)
        .maybeSingle();

      setProfile({
        username: profileData?.username || "",
        avatar_url: profileData?.avatar_url || "",
        wallet_address: claimData?.wallet_address || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Please sign in to upload an avatar",
          variant: "destructive",
        });
        return;
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile state
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));

      toast({
        title: "Avatar Uploaded",
        description: "Your profile picture has been uploaded. Click Save to apply.",
      });
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Please sign in to update your profile",
          variant: "destructive",
        });
        return;
      }

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingProfile) {
        await supabase
          .from("profiles")
          .update({
            username: profile.username,
            avatar_url: profile.avatar_url,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      } else {
        await supabase.from("profiles").insert({
          user_id: user.id,
          username: profile.username,
          avatar_url: profile.avatar_url,
        });
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Avatar Section */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative group">
          <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-accent/30">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="bg-accent/20 text-accent text-xl sm:text-2xl">
              {profile.username?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        <div className="flex-1 w-full text-center sm:text-left">
          <h3 className="font-medium text-foreground mb-1">Profile Picture</h3>
          <p className="text-xs text-muted-foreground mb-2">
            Click on the avatar to upload a new picture (max 2MB)
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs"
          >
            {uploading ? (
              <>
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-3 w-3 mr-1.5" />
                Upload Image
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Username */}
      <div className="space-y-2">
        <Label htmlFor="username" className="flex items-center gap-2 text-foreground">
          <User className="h-4 w-4 text-accent" />
          Username
        </Label>
        <Input
          id="username"
          placeholder="Enter your mining alias"
          value={profile.username}
          onChange={(e) => setProfile({ ...profile, username: e.target.value })}
          className="bg-secondary/50 border-border/50"
        />
        <p className="text-xs text-muted-foreground">
          This will be displayed on the leaderboard
        </p>
      </div>

      {/* Wallet Address - Read Only */}
      <div className="space-y-2">
        <Label htmlFor="wallet" className="flex items-center gap-2 text-foreground">
          <Wallet className="h-4 w-4 text-accent" />
          Wallet Address
        </Label>
        <Input
          id="wallet"
          value={profile.wallet_address || "Not connected"}
          readOnly
          className="bg-secondary/30 border-border/30 text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">
          Connect your wallet from the Claim page to receive ARX tokens
        </p>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Save Profile
      </Button>
    </div>
  );
};

export default ProfileSettings;
