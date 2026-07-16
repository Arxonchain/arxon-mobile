import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  ChevronLeft, LogOut, User, Menu, X,
  LayoutDashboard, Users, Settings2, Trophy, BookOpen,
  Scale,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ADMIN_NAV_SECTIONS, AdminNavItem } from "@/lib/adminNav";

const SECTION_META: Record<string, { icon: typeof LayoutDashboard; accent: string; bg: string }> = {
  Overview: { icon: LayoutDashboard, accent: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  "Users & Points": { icon: Users, accent: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  Platform: { icon: Settings2, accent: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  Arena: { icon: Trophy, accent: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  Resources: { icon: BookOpen, accent: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" },
};

function NavTile({
  item,
  onNavigate,
  compact,
}: {
  item: AdminNavItem;
  onNavigate: () => void;
  compact?: boolean;
}) {
  const tileClass = cn(
    "flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all active:scale-[0.98]",
    "bg-muted/30 border-border/60 hover:bg-muted/50 hover:border-primary/30",
    compact ? "min-h-[72px]" : "min-h-[88px]"
  );

  if (item.external) {
    return (
      <a
        href={item.path}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className={tileClass}
      >
        <item.icon className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground leading-tight">{item.label}</span>
      </a>
    );
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === "/admin"}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          tileClass,
          isActive && "border-primary/50 bg-primary/10 shadow-[0_0_16px_hsl(var(--primary)/0.15)]"
        )
      }
    >
      <item.icon className="h-5 w-5 text-primary" />
      <span className="text-sm font-semibold text-foreground leading-tight">{item.label}</span>
    </NavLink>
  );
}

function AdminMobileMenuPanel({
  onClose,
  userEmail,
}: {
  onClose: () => void;
  userEmail?: string | null;
}) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const section = ADMIN_NAV_SECTIONS.find((s) => s.title === activeSection);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
    navigate("/admin/login");
  };

  return (
    <>
      <div className="shrink-0 flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border/50">
        {activeSection ? (
          <button
            type="button"
            onClick={() => setActiveSection(null)}
            className="p-2 -ml-1 rounded-lg hover:bg-muted/50"
            aria-label="Back to categories"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">A</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground truncate">{activeSection ?? "Admin Hub"}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {activeSection ? `${section?.items.length ?? 0} tools` : "Pick a category"}
          </p>
        </div>
        <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-muted/50" aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 touch-pan-y">
        {!activeSection ? (
          <div className="grid grid-cols-2 gap-3">
            {ADMIN_NAV_SECTIONS.map((sec) => {
              const meta = SECTION_META[sec.title] ?? SECTION_META.Overview;
              const Icon = meta.icon;
              return (
                <button
                  key={sec.title}
                  type="button"
                  onClick={() => setActiveSection(sec.title)}
                  className={cn("rounded-2xl border p-4 text-left transition-all active:scale-[0.98]", meta.bg)}
                >
                  <Icon className={cn("h-6 w-6 mb-3", meta.accent)} />
                  <p className="text-sm font-bold text-foreground leading-snug">{sec.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {sec.items.length} {sec.items.length === 1 ? "tool" : "tools"}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {section?.items.map((item) => (
              <NavTile key={item.path} item={item} onNavigate={onClose} compact />
            ))}
          </div>
        )}

        {!activeSection && (
          <div className="mt-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2 px-1">
              Quick access
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <NavTile item={{ icon: LayoutDashboard, label: "Dashboard", path: "/admin" }} onNavigate={onClose} compact />
              <NavTile item={{ icon: Users, label: "Users", path: "/admin/users" }} onNavigate={onClose} compact />
              <NavTile item={{ icon: Trophy, label: "Arena", path: "/admin/arena" }} onNavigate={onClose} compact />
              <NavTile item={{ icon: Scale, label: "Reconcile", path: "/admin/reconciliation" }} onNavigate={onClose} compact />
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border/50 px-4 py-3 space-y-2 bg-sidebar/95 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2 px-1">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">Admin</p>
            <p className="text-[10px] text-muted-foreground truncate">{userEmail || "Signed in"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="h-10" onClick={() => { onClose(); navigate("/"); }}>
            Back to App
          </Button>
          <Button variant="outline" size="sm" className="h-10 text-destructive hover:text-destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" />
            Logout
          </Button>
        </div>
      </div>
    </>
  );
}

export function AdminMobileHeader({
  pageTitle,
  userEmail,
}: {
  pageTitle: string;
  userEmail?: string | null;
}) {
  const [open, setOpen] = useState(false);

  const close = () => {
    setOpen(false);
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-14 bg-sidebar/95 backdrop-blur-md border-b border-border/50 flex items-center px-3 z-50 pt-[env(safe-area-inset-top)]">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2 shrink-0" aria-label="Open admin menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-full max-w-none sm:max-w-md p-0 flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden border-r bg-sidebar [&>button:last-child]:hidden"
          >
            <AdminMobileMenuPanel onClose={close} userEmail={userEmail} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-xs">A</span>
          </div>
          <span className="font-semibold text-foreground text-sm truncate">{pageTitle}</span>
        </div>
      </div>
      <div className="h-14 shrink-0 pt-[env(safe-area-inset-top)]" aria-hidden />
    </>
  );
}
