import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Download, RefreshCw, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface ClaimData {
  id: string;
  wallet: string;
  eligible: number;
  claimed: number;
  proofStatus: string;
  lastActive: string;
}

const AdminClaims = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: claims = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("*")
        .order("last_active", { ascending: false });

      if (error) throw error;

      return data.map((claim): ClaimData => ({
        id: claim.id,
        wallet: claim.wallet_address.length > 12 
          ? `${claim.wallet_address.slice(0, 6)}...${claim.wallet_address.slice(-4)}`
          : claim.wallet_address,
        eligible: Number(claim.eligible_amount),
        claimed: Number(claim.claimed_amount),
        proofStatus: claim.proof_status,
        lastActive: formatDistanceToNow(new Date(claim.last_active), { addSuffix: true }),
      }));
    },
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-claims-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("eligible_amount, claimed_amount");

      if (error) throw error;

      const totalEligible = data.reduce((sum, c) => sum + Number(c.eligible_amount), 0);
      const totalClaimed = data.reduce((sum, c) => sum + Number(c.claimed_amount), 0);
      const unclaimed = totalEligible - totalClaimed;
      const claimRate = totalEligible > 0 ? Math.round((totalClaimed / totalEligible) * 100) : 0;

      return { totalEligible, totalClaimed, unclaimed, claimRate };
    },
    refetchInterval: 30000,
  });

  const filteredClaims = claims.filter((claim) =>
    claim.wallet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProofBadge = (status: string) => {
    const config = {
      verified: { icon: CheckCircle, className: "bg-green-500/10 text-green-500" },
      pending: { icon: Clock, className: "bg-yellow-500/10 text-yellow-500" },
      invalid: { icon: XCircle, className: "bg-red-500/10 text-red-500" },
    };
    const configItem = config[status as keyof typeof config] || config.pending;
    const Icon = configItem.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${configItem.className}`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">$ARX Claim Manager</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage ARX-P to $ARX token claims</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Claim Info Banner */}
      <div className="glass-card p-3 md:p-4 border-accent/30 bg-accent/5">
        <p className="text-xs md:text-sm">
          <span className="font-medium text-foreground">Token Conversion:</span> ARX-P → $ARX at TGE. 
          <span className="text-muted-foreground ml-1 hidden sm:inline">Users need verified proofs to claim.</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4">
        <div className="glass-card p-3 md:p-4 text-center">
          <p className="text-lg md:text-2xl font-bold text-foreground">{formatNumber(stats?.totalEligible || 0)}</p>
          <p className="text-xs md:text-sm text-muted-foreground">$ARX Eligible</p>
        </div>
        <div className="glass-card p-3 md:p-4 text-center">
          <p className="text-lg md:text-2xl font-bold text-green-500">{formatNumber(stats?.totalClaimed || 0)}</p>
          <p className="text-xs md:text-sm text-muted-foreground">Claimed</p>
        </div>
        <div className="glass-card p-3 md:p-4 text-center">
          <p className="text-lg md:text-2xl font-bold text-yellow-500">{formatNumber(stats?.unclaimed || 0)}</p>
          <p className="text-xs md:text-sm text-muted-foreground">Unclaimed</p>
        </div>
        <div className="glass-card p-3 md:p-4 text-center">
          <p className="text-lg md:text-2xl font-bold text-primary">{stats?.claimRate || 0}%</p>
          <p className="text-xs md:text-sm text-muted-foreground">Claim Rate</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by wallet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" className="flex items-center gap-2 w-fit">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <table className="w-full min-w-[450px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-3 md:px-4 text-xs md:text-sm font-medium text-muted-foreground">Wallet</th>
                  <th className="text-left py-3 px-3 md:px-4 text-xs md:text-sm font-medium text-muted-foreground">Eligible</th>
                  <th className="text-left py-3 px-3 md:px-4 text-xs md:text-sm font-medium text-muted-foreground hidden sm:table-cell">Claimed</th>
                  <th className="text-left py-3 px-3 md:px-4 text-xs md:text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-3 md:px-4 text-xs md:text-sm font-medium text-muted-foreground hidden md:table-cell">Last Active</th>
                  <th className="text-left py-3 px-3 md:px-4 text-xs md:text-sm font-medium text-muted-foreground hidden lg:table-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                      No claims found
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((claim) => (
                    <tr key={claim.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-3 md:px-4 text-xs md:text-sm font-mono text-primary">{claim.wallet}</td>
                      <td className="py-3 px-3 md:px-4 text-xs md:text-sm text-foreground">{claim.eligible.toLocaleString()}</td>
                      <td className="py-3 px-3 md:px-4 text-xs md:text-sm text-accent font-medium hidden sm:table-cell">{claim.claimed.toLocaleString()}</td>
                      <td className="py-3 px-3 md:px-4">{getProofBadge(claim.proofStatus)}</td>
                      <td className="py-3 px-3 md:px-4 text-xs md:text-sm text-muted-foreground hidden md:table-cell">{claim.lastActive}</td>
                      <td className="py-3 px-3 md:px-4 hidden lg:table-cell">
                        <Button variant="ghost" size="sm">View</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminClaims;
