import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Settings2, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Menu,
  CalendarDays,
  Scale,
  Trophy,
  FileDown,
  Upload,
  History,
  Globe,
  Presentation,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  external?: boolean;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Users, label: "Users & Miners", path: "/admin/users" },
  { icon: CalendarDays, label: "Daily Signups", path: "/admin/signups" },
  { icon: Settings2, label: "Mining Controls", path: "/admin/controls" },
  { icon: Trophy, label: "Arena Markets", path: "/admin/arena" },
  { icon: History, label: "Battle History", path: "/admin/battle-history" },
  { icon: Scale, label: "Reconciliation", path: "/admin/reconciliation" },
  { icon: FileDown, label: "Export Filter", path: "/admin/export-filter" },
  { icon: Upload, label: "Import Users", path: "/admin/import-users" },
  { icon: Globe, label: "Global Map", path: "/admin/global-map" },
  { icon: Presentation, label: "Pitch Deck", path: "/admin/pitch-deck" },
  { icon: FileDown, label: "Litepaper ↗", path: "/litepaper", external: true },
];

const SidebarContent = ({ collapsed, onCollapse, onNavigate }: { collapsed: boolean; onCollapse?: () => void; onNavigate?: () => void }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const handleNavClick = () => {
    onNavigate?.();
  };

  return (
    <>
      {/* Header */}
      <div className="px-4 mb-6 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-foreground">ARXON Admin</span>
          </div>
        )}
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="space-y-1 px-3 flex-1">
        {navItems.map((item) => (
          item.external ? (
            <a
              key={item.path}
              href={item.path}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                collapsed && "justify-center"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
            </a>
          ) : (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin"}
              onClick={handleNavClick}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  "hover:bg-muted/50",
                  isActive && "bg-primary/10 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)]",
                  !isActive && "text-muted-foreground hover:text-foreground",
                  collapsed && "justify-center"
                )
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
            </NavLink>
          )
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 space-y-1 mt-auto border-t border-border/50 pt-4">
        <div className={cn(
          "flex items-center gap-3 px-3 py-2.5 text-muted-foreground",
          collapsed && "justify-center"
        )}>
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Admin</p>
              <p className="text-xs text-muted-foreground truncate">admin@arxon.io</p>
            </div>
          )}
        </div>
        
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-colors",
            "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="font-medium text-sm">Logout</span>}
        </button>
      </div>
    </>
  );
};

const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  // Mobile: Use Sheet drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile Header Bar */}
        <div className="fixed top-0 left-0 right-0 h-14 bg-sidebar border-b border-border/50 flex items-center px-4 z-50">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-3">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar">
              <div className="min-h-screen py-6 flex flex-col">
                <SidebarContent 
                  collapsed={false} 
                  onNavigate={() => setMobileOpen(false)} 
                />
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-foreground">ARXON Admin</span>
          </div>
        </div>
        {/* Spacer for fixed header */}
        <div className="h-14" />
      </>
    );
  }

  // Desktop: Regular sidebar
  return (
    <aside 
      className={cn(
        "min-h-screen bg-sidebar border-r border-border/50 py-6 flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarContent 
        collapsed={collapsed} 
        onCollapse={() => setCollapsed(!collapsed)} 
      />
    </aside>
  );
};

export default AdminSidebar;
