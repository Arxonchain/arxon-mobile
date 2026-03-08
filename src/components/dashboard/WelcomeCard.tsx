import { memo } from "react";
import arxonLogo from "@/assets/arxon-logo.jpg";

interface WelcomeCardProps {
  title: string;
  description: string;
  isActive?: boolean;
}

const WelcomeCard = memo(({ title, description, isActive = false }: WelcomeCardProps) => {
  return (
    <div className="glass-card p-3 sm:p-4 md:p-5 lg:p-6 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
        <div className="flex-1">
          <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground mb-1.5 sm:mb-2">{title}</h3>
          <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">{description}</p>
        </div>
        <div className="relative flex items-center justify-center self-end sm:self-start">
          <img src={arxonLogo} alt="Arxon" className="h-12 w-12 sm:h-16 sm:w-16 lg:h-24 lg:w-24 object-contain opacity-30 mix-blend-lighten" loading="lazy" />
          <span className={`absolute -bottom-1 sm:-bottom-2 whitespace-nowrap ${isActive ? "status-connected" : "status-not-active"} text-[10px] sm:text-xs lg:text-sm px-2 sm:px-3 lg:px-4 py-0.5 sm:py-1 lg:py-1.5`}>
            <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 lg:w-2 lg:h-2 rounded-full ${isActive ? "bg-foreground" : "bg-destructive"}`} />
            {isActive ? "Active" : "Not Active"}
          </span>
        </div>
      </div>
    </div>
  );
});

WelcomeCard.displayName = "WelcomeCard";

export default WelcomeCard;
