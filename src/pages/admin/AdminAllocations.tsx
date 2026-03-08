import { useState } from "react";
import { Download, Plus, RefreshCw, Upload, Play, Pause, Eye, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FounderAllocation {
  id: string;
  name: string;
  wallet_address: string;
  allocation_percentage: number;
  total_allocation: number;
  claimed_amount: number;
  vesting_type: string;
  next_unlock_date: string | null;
  notes: string | null;
  cliff_months?: number;
  linear_months?: number;
  start_date?: string;
  end_date?: string;
  is_paused?: boolean;
}

const AdminAllocations = () => {
  const [selectedFounder, setSelectedFounder] = useState<FounderAllocation | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: allocations = [], isLoading, refetch } = useQuery({
    queryKey: ['founder-allocations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('founder_allocations')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as FounderAllocation[];
    }
  });

  const totalAllocated = allocations.reduce((sum, a) => sum + a.total_allocation, 0);
  const totalClaimed = allocations.reduce((sum, a) => sum + a.claimed_amount, 0);
  const totalPercentage = allocations.reduce((sum, a) => sum + a.allocation_percentage, 0);
  const remainingLocked = totalAllocated - totalClaimed;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toLocaleString()}`;
    if (num >= 1000) return `${(num / 1000).toLocaleString()}K`;
    return num.toLocaleString();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getVestingLabel = (type: string, months?: number) => {
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    if (months) return `${label} (${months} mo)`;
    return label;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleViewFounder = (founder: FounderAllocation) => {
    setSelectedFounder(founder);
    setAdminNote(founder.notes || "");
  };

  const handleSaveNotes = async () => {
    if (!selectedFounder) return;
    
    const { error } = await supabase
      .from('founder_allocations')
      .update({ notes: adminNote })
      .eq('id', selectedFounder.id);
    
    if (error) {
      toast.error("Failed to save notes");
    } else {
      toast.success("Notes saved successfully");
      refetch();
    }
  };

  const totalPages = Math.ceil(allocations.length / itemsPerPage);
  const paginatedAllocations = allocations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const nextUnlockDate = allocations
    .filter(a => a.next_unlock_date)
    .sort((a, b) => new Date(a.next_unlock_date!).getTime() - new Date(b.next_unlock_date!).getTime())[0]?.next_unlock_date;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-primary">Founder Allocation</h1>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <span>Network:</span>
            <span className="text-foreground">Mainnet</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Live
          </div>
        </div>
      </div>

      {/* Description Card */}
      <div className="glass-card p-3 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
        <p className="text-sm md:text-base text-muted-foreground">
          Manage Founder vesting, allocation %, release operations, and logs.
        </p>
        <Button size="sm" className="flex items-center gap-2 bg-primary hover:bg-primary/90 w-fit">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Export Vesting</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
        <div className="glass-card p-3 md:p-4 border-l-2 border-primary">
          <p className="text-xs text-muted-foreground mb-1">Total Allocation</p>
          <p className="text-sm md:text-lg font-bold text-foreground">{formatNumber(totalAllocated)} ARX</p>
        </div>
        <div className="glass-card p-3 md:p-4 border-l-2 border-primary">
          <p className="text-xs text-muted-foreground mb-1">Released</p>
          <p className="text-sm md:text-lg font-bold text-foreground">{formatNumber(totalClaimed)} ARX</p>
        </div>
        <div className="glass-card p-3 md:p-4 border-l-2 border-primary">
          <p className="text-xs text-muted-foreground mb-1">Locked</p>
          <p className="text-sm md:text-lg font-bold text-foreground">{formatNumber(remainingLocked)} ARX</p>
        </div>
        <div className="glass-card p-3 md:p-4 border-l-2 border-primary col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground mb-1">Next Unlock</p>
          <p className="text-sm md:text-lg font-bold text-foreground">
            {nextUnlockDate ? formatDate(nextUnlockDate) : "N/A"}
          </p>
        </div>
        <div className="glass-card p-3 md:p-4 border-l-2 border-primary hidden lg:block">
          <p className="text-xs text-muted-foreground mb-1">Active Founders</p>
          <p className="text-sm md:text-lg font-bold text-green-500">{allocations.length} founders</p>
        </div>
      </div>

      {/* Global Actions */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Global Actions</h3>
        <div className="glass-card divide-y divide-border">
          <div className="p-4 flex items-center justify-between">
            <span className="text-foreground">Release Tokens to All Eligible Founders</span>
            <Button className="bg-primary hover:bg-primary/90">Release</Button>
          </div>
          <div className="p-4 flex items-center justify-between">
            <span className="text-foreground">Pause All Vesting</span>
            <Button variant="outline">Pause</Button>
          </div>
        </div>
      </div>

      {/* Founder Allocation Table */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Founder Allocation Table</h3>
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">#</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Founder</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Wallet</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Allocation</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Total Allocation</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Vesting Type</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Claimed / Unclaimed</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Next Unlock Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : paginatedAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">No allocations found</td>
                  </tr>
                ) : (
                  paginatedAllocations.map((allocation, index) => (
                    <tr 
                      key={allocation.id} 
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => handleViewFounder(allocation)}
                    >
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-foreground">{allocation.name}</td>
                      <td className="py-4 px-4 text-sm font-mono text-primary">
                        {allocation.wallet_address.slice(0, 6)}...{allocation.wallet_address.slice(-4)}
                      </td>
                      <td className="py-4 px-4 text-sm text-foreground">{allocation.allocation_percentage}%</td>
                      <td className="py-4 px-4 text-sm text-foreground">{formatNumber(allocation.total_allocation)} ARX</td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {getVestingLabel(allocation.vesting_type, 36)}
                      </td>
                      <td className="py-4 px-4 text-sm text-foreground">
                        {formatNumber(allocation.claimed_amount)} / {formatNumber(allocation.total_allocation - allocation.claimed_amount)}
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">{formatDate(allocation.next_unlock_date)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Expanded Row View */}
          {paginatedAllocations.length > 0 && (
            <div className="border-t border-border bg-muted/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-foreground">{formatNumber(paginatedAllocations[0]?.total_allocation || 0)} ARX</span>
                  <span className="text-muted-foreground">{getVestingLabel(paginatedAllocations[0]?.vesting_type || 'linear', 36)}</span>
                  <span className="text-foreground">
                    {formatNumber(paginatedAllocations[0]?.claimed_amount || 0)} / {formatNumber((paginatedAllocations[0]?.total_allocation || 0) - (paginatedAllocations[0]?.claimed_amount || 0))}
                  </span>
                  <span className="text-muted-foreground">{formatDate(paginatedAllocations[0]?.next_unlock_date || null)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500">Active</span>
                  <Button variant="outline" size="sm" onClick={() => paginatedAllocations[0] && handleViewFounder(paginatedAllocations[0])}>
                    View
                  </Button>
                  <Button variant="outline" size="sm">Release</Button>
                  <Button variant="outline" size="sm">Pause</Button>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${((paginatedAllocations[0]?.claimed_amount || 0) / (paginatedAllocations[0]?.total_allocation || 1)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-border p-4 flex items-center justify-center gap-2">
              {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                    currentPage === page 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {page}
                </button>
              ))}
              {totalPages > 6 && (
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Next
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Founder Detail Modal */}
      <Dialog open={!!selectedFounder} onOpenChange={() => setSelectedFounder(null)}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader className="sr-only">
            <DialogTitle>Founder Details</DialogTitle>
          </DialogHeader>
          
          {selectedFounder && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/50 to-primary flex items-center justify-center text-xl font-bold text-primary-foreground">
                  {selectedFounder.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-primary">{selectedFounder.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono">
                      {selectedFounder.wallet_address.slice(0, 6)}...{selectedFounder.wallet_address.slice(-4)}
                    </span>
                    <button 
                      onClick={() => copyToClipboard(selectedFounder.wallet_address)}
                      className="hover:text-foreground transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Allocation Summary */}
              <div className="text-center">
                <p className="text-primary text-lg font-semibold">
                  Allocation Summary: {formatNumber(selectedFounder.total_allocation)} ARX ({selectedFounder.allocation_percentage}%)
                </p>
              </div>

              {/* Vesting Information */}
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                  Vesting Information
                </span>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vesting Type:</span>
                    <span className="text-foreground capitalize">{selectedFounder.vesting_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliff:</span>
                    <span className="text-foreground">12 months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Linear Release:</span>
                    <span className="text-foreground">36 months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start:</span>
                    <span className="text-foreground">Jan 2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End:</span>
                    <span className="text-foreground">Jan 2029</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Progress Bar:</span>
                    <span className="text-foreground">
                      {((selectedFounder.claimed_amount / selectedFounder.total_allocation) * 100).toFixed(0)}% released
                    </span>
                  </div>
                </div>
              </div>

              {/* Claim / Release Data */}
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
                  Claim / Release Data
                </span>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Allocated:</span>
                    <span className="text-foreground">{formatNumber(selectedFounder.total_allocation)} ARX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Claimed:</span>
                    <span className="text-foreground">{formatNumber(selectedFounder.claimed_amount)} ARX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unclaimed:</span>
                    <span className="text-foreground">{formatNumber(selectedFounder.total_allocation - selectedFounder.claimed_amount)} ARX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Unlock Amount:</span>
                    <span className="text-foreground">{formatNumber(Math.round(selectedFounder.total_allocation / 36))} ARX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Unlock Date:</span>
                    <span className="text-foreground">{formatDate(selectedFounder.next_unlock_date)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <Button className="bg-primary hover:bg-primary/90">Release</Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Pause</span>
                  <Switch />
                </div>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  Export Vesting
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground">
                  <Download className="h-4 w-4" />
                  Download Vesting
                </Button>
              </div>

              {/* Admin Note */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Admin Note (Off-Chain)</label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add notes about this founder..."
                  className="min-h-[80px] bg-muted/50 border-border"
                />
                <Button onClick={handleSaveNotes} className="bg-primary hover:bg-primary/90">
                  Save Notes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAllocations;
