import {
  LayoutDashboard, Users, Settings2, LogOut, CalendarDays, Scale, Trophy,
  FileDown, Upload, History, Globe, ListChecks, Link2,
  BarChart3, Megaphone, Coins, RotateCcw, BookOpen,
} from "lucide-react";

export interface AdminNavItem {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  external?: boolean;
}

export interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    title: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
      { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
      { icon: CalendarDays, label: "Daily Signups", path: "/admin/signups" },
      { icon: Globe, label: "Global Map", path: "/admin/global-map" },
    ],
  },
  {
    title: "Users & Points",
    items: [
      { icon: Users, label: "Users & Miners", path: "/admin/users" },
      { icon: Scale, label: "Reconciliation", path: "/admin/reconciliation" },
      { icon: FileDown, label: "Export Filter", path: "/admin/export-filter" },
      { icon: Upload, label: "Import Users", path: "/admin/import-users" },
      { icon: Coins, label: "$ARX Claims", path: "/admin/claims" },
    ],
  },
  {
    title: "Platform",
    items: [
      { icon: Settings2, label: "Mining Controls", path: "/admin/controls" },
      { icon: Megaphone, label: "Announcements", path: "/admin/announcements" },
      { icon: ListChecks, label: "Task Manager", path: "/admin/tasks" },
      { icon: Link2, label: "Referral Manager", path: "/admin/referrals" },
      { icon: RotateCcw, label: "Referral Recovery", path: "/admin/referral-recovery" },
    ],
  },
  {
    title: "Arena",
    items: [
      { icon: Trophy, label: "Arena Markets", path: "/admin/arena" },
      { icon: History, label: "Battle History", path: "/admin/battle-history" },
    ],
  },
  {
    title: "Resources",
    items: [
      { icon: BookOpen, label: "Litepaper ↗", path: "/litepaper", external: true },
    ],
  },
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_SECTIONS.flatMap((s) => s.items);

export function getAdminPageTitle(pathname: string): string {
  const item = ADMIN_NAV_ITEMS.find(
    (n) => n.path === pathname || (n.path !== "/admin" && pathname.startsWith(n.path))
  );
  return item?.label ?? "Admin";
}
