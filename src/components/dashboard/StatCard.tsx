import { ReactNode, memo } from "react";

interface StatCardProps {
  label: string;
  value: string;
  suffix?: string;
  icon?: ReactNode;
}

const StatCard = memo(({ label, value, suffix, icon }: StatCardProps) => {
  return (
    <div className="stat-card p-3 sm:p-4 md:p-5 lg:p-6">
      <div className="flex items-center justify-between mb-1 sm:mb-2">
        <p className="text-muted-foreground text-[10px] sm:text-xs lg:text-sm">{label}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
        {value}
        {suffix && <span className="text-xs sm:text-sm lg:text-lg font-normal text-muted-foreground ml-0.5 sm:ml-1">{suffix}</span>}
      </p>
    </div>
  );
});

StatCard.displayName = "StatCard";

export default StatCard;
