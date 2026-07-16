import { useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, User, LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAdmin } from "@/hooks/useAdmin";
import { ADMIN_NAV_SECTIONS, getAdminPageTitle } from "@/lib/adminNav";
import { AdminMobileHeader } from "./AdminMobileMenu";

const SidebarContent = ({
  collapsed,
  onCollapse,
  onNavigate,
  userEmail,
}: {
  collapsed: boolean;
  onCollapse?: () => void;
  onNavigate?: () => void;
  userEmail?: string | null;
}) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  return (
    <>
      <div className="px-4 mb-4 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-foreground truncate">ARXON Admin</span>
          </div>
        )}
        {onCollapse && (
          <button onClick={onCollapse} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            {collapsed
              ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
              : <ChevronLeft className="h-4 w-4 text-muted-foreground" />}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-4 pb-4">
        {ADMIN_NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) =>
                item.external ? (
                  <a
                    key={item.path}
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onNavigate}
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
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-muted/50",
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
              )}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 space-y-1 mt-auto border-t border-border/50 pt-4">
        <button
          onClick={() => navigate("/")}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-colors mb-1",
            "text-muted-foreground hover:text-primary hover:bg-primary/10",
            collapsed && "justify-center"
          )}
        >
          <ChevronLeft className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium text-sm">← Back to App</span>}
        </button>

        <div className={cn("flex items-center gap-3 px-3 py-2.5 text-muted-foreground", collapsed && "justify-center")}>
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            <User className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Admin</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail || "Signed in"}</p>
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
  const isMobile = useIsMobile();
  const { user } = useAdmin();
  const location = useLocation();
  const pageTitle = getAdminPageTitle(location.pathname);

  if (isMobile) {
    return <AdminMobileHeader pageTitle={pageTitle} userEmail={user?.email} />;
  }

  return (
    <aside
      className={cn(
        "min-h-screen bg-sidebar border-r border-border/50 py-6 flex flex-col transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarContent
        collapsed={collapsed}
        onCollapse={() => setCollapsed(!collapsed)}
        userEmail={user?.email}
      />
    </aside>
  );
};

export default AdminSidebar;
