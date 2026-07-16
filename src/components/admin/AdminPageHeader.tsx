import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/** Consistent mobile-first admin page header. */
export function AdminPageHeader({ title, description, actions, className }: AdminPageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}

/** Wrap wide tables so they scroll horizontally on mobile without breaking layout. */
export function AdminTableScroll({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto -mx-1 px-1", className)}>
      {children}
    </div>
  );
}
