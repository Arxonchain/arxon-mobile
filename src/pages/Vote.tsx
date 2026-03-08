import WelcomeCard from "@/components/dashboard/WelcomeCard";
import { useMiningStatus } from "@/hooks/useMiningStatus";


const Vote = () => {
  const { isMining } = useMiningStatus();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Vote</h1>

      <WelcomeCard
        title="ARXON Governance"
        description="Participate in community decisions and vote on proposals to shape the future of ARXON."
        isActive={isMining}
      />

      <div className="glass-card p-12 text-center">
        <p className="text-muted-foreground text-lg">No active proposals at the moment.</p>
        <p className="text-muted-foreground mt-2">Check back soon for voting opportunities!</p>
      </div>
    </div>
  );
};

export default Vote;
