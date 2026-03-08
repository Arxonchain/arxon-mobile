import { Bell, ChevronDown, Zap, LogIn, Megaphone } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import arxonLogo from "@/assets/arxon-logo-header.jpeg";
import MobileNav from "./MobileNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { usePoints } from "@/hooks/usePoints";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import AuthDialog from "@/components/auth/AuthDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

const Header = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { points } = usePoints();
  const { profile } = useProfile();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
    }
  }, [user]);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, message, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setAnnouncements(data);
    }
    setIsLoading(false);
  };

  return (
    <>
      <header className="h-14 lg:h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl flex items-center justify-between px-3 md:px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <MobileNav />
          <img src={arxonLogo} alt="ARXON" className="h-7 md:h-8 lg:h-10 object-contain" />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4">
          {/* Points Display */}
          {user && (
            <div className="flex items-center gap-1.5 lg:gap-2 bg-secondary/50 px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg">
              <Zap className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-accent" />
              <span className="text-xs lg:text-sm font-medium text-foreground">
                {points?.total_points?.toLocaleString() || 0} ARX-P
              </span>
            </div>
          )}

          {/* Auth Button / User Menu */}
          {user ? (
            <>
              {/* Notifications */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="relative p-1 sm:p-1.5 lg:p-2 text-muted-foreground hover:text-foreground transition-colors">
                    <Bell className="h-4 w-4 lg:h-5 lg:w-5" />
                    {announcements.length > 0 && (
                      <span className="absolute top-0 right-0 sm:top-0.5 sm:right-0.5 lg:top-1 lg:right-1 w-1.5 h-1.5 lg:w-2 lg:h-2 bg-primary rounded-full" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0 bg-card border-border">
                  <div className="p-3 border-b border-border">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-accent" />
                      Announcements
                    </h4>
                  </div>
                  <ScrollArea className="max-h-80">
                    {isLoading ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        Loading...
                      </div>
                    ) : announcements.length === 0 ? (
                      <div className="p-6 text-center">
                        <Bell className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {announcements.map((announcement) => (
                          <div key={announcement.id} className="p-3 hover:bg-secondary/30 transition-colors">
                            <h5 className="font-medium text-foreground text-sm">{announcement.title}</h5>
                            <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{announcement.message}</p>
                            <span className="text-muted-foreground/70 text-[10px] mt-1 block">
                              {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 lg:gap-2 cursor-pointer">
                    <Avatar className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 border border-border/50">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-[10px] sm:text-xs lg:text-sm font-medium">
                        {profile?.username?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="hidden md:block h-3.5 w-3.5 lg:h-4 lg:w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <button 
              onClick={() => setShowAuthDialog(true)}
              className="btn-glow btn-mining text-[10px] sm:text-xs lg:text-sm px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2"
            >
              <LogIn className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </header>

      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </>
  );
};

export default Header;
