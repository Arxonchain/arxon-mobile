import { memo, useState, useCallback } from "react";
import { LayoutDashboard, Trophy, Settings, LogOut, Menu, Swords, Send, Pickaxe, Target, Users, User } from "lucide-react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";

// Main navigation items
const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Trophy, label: "Leaderboard", path: "/leaderboard" },
  { icon: Swords, label: "Arena", path: "/arena" },
  { icon: Send, label: "Nexus", path: "/nexus" },
  { icon: Pickaxe, label: "Mining", path: "/mining" },
];

// Secondary navigation (grouped below)
const secondaryItems = [
  { icon: Target, label: "Tasks", path: "/tasks" },
  { icon: Users, label: "Referrals", path: "/referrals" },
  { icon: User, label: "Profile", path: "/profile" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const MobileNav = memo(() => {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleLogout = useCallback(async () => {
    await signOut();
    setOpen(false);
  }, [signOut]);

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors lg:hidden">
          <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-56 sm:w-64 bg-sidebar border-r border-border/50 p-0">
        <div className="flex flex-col h-full py-4">
          <div className="px-3 mb-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Navigate</p>
          </div>
          <nav className="space-y-1 px-3 flex-1">
            {navItems.map((item) => (
              <RouterNavLink
                key={item.path}
                to={item.path}
                onClick={handleClose}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "nav-item-active" : ""}`
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </RouterNavLink>
            ))}
            
            {/* Divider */}
            <div className="my-3 border-t border-border/30" />
            
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">More</p>
            
            {secondaryItems.map((item) => (
              <RouterNavLink
                key={item.path}
                to={item.path}
                onClick={handleClose}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "nav-item-active" : ""}`
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </RouterNavLink>
            ))}
          </nav>

          {user && (
            <div className="px-3 mt-auto">
              <button
                onClick={handleLogout}
                className="nav-item w-full text-left hover:text-destructive"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
});

MobileNav.displayName = "MobileNav";

export default MobileNav;
