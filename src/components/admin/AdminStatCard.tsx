import React from "react";
import { Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AdminStatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
  tooltip?: string;
}

export const AdminStatCard = ({
  icon: Icon,
  label,
  value,
  subtext,
  trend,
  loading,
  tooltip,
}: AdminStatCardProps) => {
  const content = (
    <div className="glass-card p-3 md:p-5 space-y-2 md:space-y-3 cursor-default">
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
        </div>
        {trend && (
          <span
            className={`text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded-full ${
              trend === "up"
                ? "bg-green-500/10 text-green-500"
                : trend === "down"
                ? "bg-red-500/10 text-red-500"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "—"}
          </span>
        )}
      </div>
      <div>
        {loading ? (
          <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin text-primary" />
        ) : (
          <p className="text-lg md:text-2xl font-bold text-foreground">{value}</p>
        )}
        <p className="text-xs md:text-sm text-muted-foreground">{label}</p>
        {subtext && (
          <p className="text-xs text-muted-foreground mt-0.5 md:mt-1 hidden sm:block">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px] text-center">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};

// Compact version for the Users page with icon on the left
export const AdminStatCardCompact = ({
  icon: Icon,
  label,
  value,
  tooltip,
  loading,
  iconColor = "text-primary",
  iconBgColor = "bg-primary/10",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tooltip?: string;
  loading?: boolean;
  iconColor?: string;
  iconBgColor?: string;
}) => {
  const content = (
    <div className="glass-card p-3 md:p-4 flex flex-col sm:flex-row items-center gap-2 md:gap-4 cursor-default">
      <div className={`h-10 w-10 md:h-12 md:w-12 rounded-xl ${iconBgColor} flex items-center justify-center shrink-0`}>
        <Icon className={`h-5 w-5 md:h-6 md:w-6 ${iconColor}`} />
      </div>
      <div className="text-center sm:text-left">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto sm:mx-0" />
        ) : (
          <p className="text-lg md:text-2xl font-bold text-foreground">{value}</p>
        )}
        <p className="text-xs md:text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px] text-center">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};
