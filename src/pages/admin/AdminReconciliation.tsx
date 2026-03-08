import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  MinusCircle,
  Download,
  Play,
  History
} from "lucide-react";

interface ReconciliationResult {
  userId: string;
  username: string | null;
  stored: { mining: number; task: number; social: number; referral: number; total: number };
  computed: { mining: number; task: number; social: number; referral: number; checkin: number; total: number };
  diff: { mining: number; task: number; social: number; referral: number; total: number };
  action: 'restored' | 'none' | 'flagged';
  pointsRestored: number;
}

export default function AdminReconciliation() {
  const [searchUserId, setSearchUserId] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [batchOffset, setBatchOffset] = useState(0);
  const [results, setResults] = useState<ReconciliationResult[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch recent audit logs
  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['points-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Reconciliation mutation
  const reconcileMutation = useMutation({
    mutationFn: async ({ userId, dryRun, batchSize, offset }: { 
      userId?: string; 
      dryRun: boolean; 
      batchSize?: number;
      offset?: number;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('reconcile-user-points', {
        body: { userId, dryRun, batchSize: batchSize || 50, offset: offset || 0 },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      setResults(data.results || []);
      setSummary(data.summary);
      
      if (data.dryRun) {
        toast.info(`Dry run complete: ${data.processed} users analyzed`);
      } else {
        toast.success(`Reconciliation complete: ${data.summary?.totalPointsRestored || 0} points restored`);
      }
      
      queryClient.invalidateQueries({ queryKey: ['points-audit-logs'] });
    },
    onError: (error: any) => {
      toast.error(`Reconciliation failed: ${error.message}`);
    },
  });

  const handleSingleUserReconcile = () => {
    if (!searchUserId.trim()) {
      toast.error('Please enter a user ID');
      return;
    }
    reconcileMutation.mutate({ userId: searchUserId.trim(), dryRun });
  };

  const handleBatchReconcile = () => {
    reconcileMutation.mutate({ dryRun, batchSize: 50, offset: batchOffset });
  };

  const handleNextBatch = () => {
    const newOffset = batchOffset + 50;
    setBatchOffset(newOffset);
    reconcileMutation.mutate({ dryRun, batchSize: 50, offset: newOffset });
  };

  const exportResults = () => {
    if (results.length === 0) return;
    
    const csv = [
      ['User ID', 'Username', 'Stored Total', 'Computed Total', 'Difference', 'Action', 'Points Restored'].join(','),
      ...results.map(r => [
        r.userId,
        r.username || 'N/A',
        r.stored.total,
        r.computed.total,
        r.diff.total,
        r.action,
        r.pointsRestored,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliation-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'restored':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Restored</Badge>;
      case 'flagged':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertTriangle className="w-3 h-3 mr-1" /> Flagged</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground"><MinusCircle className="w-3 h-3 mr-1" /> No Change</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Points Reconciliation</h1>
          <p className="text-muted-foreground">Compute provable points from source tables and restore missing points</p>
        </div>

        {/* Controls */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Single User Reconciliation</CardTitle>
              <CardDescription>Check and restore points for a specific user</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter User ID..."
                  value={searchUserId}
                  onChange={(e) => setSearchUserId(e.target.value)}
                  className="bg-background"
                />
                <Button 
                  onClick={handleSingleUserReconcile}
                  disabled={reconcileMutation.isPending}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Check
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Batch Reconciliation</CardTitle>
              <CardDescription>Process multiple users at once</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="dry-run"
                    checked={dryRun}
                    onCheckedChange={setDryRun}
                  />
                  <Label htmlFor="dry-run" className="text-sm">
                    Dry Run (analyze only, no changes)
                  </Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleBatchReconcile}
                  disabled={reconcileMutation.isPending}
                  variant={dryRun ? "outline" : "default"}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {dryRun ? 'Analyze Batch' : 'Run Reconciliation'}
                </Button>
                {summary?.hasMore && (
                  <Button 
                    onClick={handleNextBatch}
                    disabled={reconcileMutation.isPending}
                    variant="outline"
                  >
                    Next 50
                  </Button>
                )}
              </div>
              {summary && (
                <div className="text-xs text-muted-foreground">
                  Offset: {batchOffset} | Processed: {summary.restored + summary.flagged + summary.noChange}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        {summary && (
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Results Summary</CardTitle>
                <Button variant="outline" size="sm" onClick={exportResults}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="text-2xl font-bold text-green-400">{summary.restored}</div>
                  <div className="text-sm text-muted-foreground">Restored</div>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="text-2xl font-bold text-yellow-400">{summary.flagged}</div>
                  <div className="text-sm text-muted-foreground">Flagged</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="text-2xl font-bold text-foreground">{summary.noChange}</div>
                  <div className="text-sm text-muted-foreground">No Change</div>
                </div>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="text-2xl font-bold text-primary">{summary.totalPointsRestored.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Points Restored</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Detailed Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Stored</TableHead>
                      <TableHead className="text-right">Computed</TableHead>
                      <TableHead className="text-right">Diff</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.userId}>
                        <TableCell>
                          <div className="font-mono text-xs">{result.userId.slice(0, 8)}...</div>
                          <div className="text-sm text-muted-foreground">{result.username || 'No username'}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {result.stored.total.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {result.computed.total.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${
                          result.diff.total > 0 ? 'text-green-400' : 
                          result.diff.total < 0 ? 'text-red-400' : ''
                        }`}>
                          {result.diff.total > 0 ? '+' : ''}{result.diff.total.toLocaleString()}
                        </TableCell>
                        <TableCell>{getActionBadge(result.action)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Audit History */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-lg">Audit History</CardTitle>
            </div>
            <CardDescription>Recent reconciliation audit logs</CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Stored</TableHead>
                      <TableHead className="text-right">Computed</TableHead>
                      <TableHead className="text-right">Restored</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(auditLogs || []).map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.user_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.audit_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {Number(log.stored_total_points).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {Number(log.computed_total_points).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-green-400">
                          {Number(log.points_restored) > 0 ? `+${Number(log.points_restored).toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>{getActionBadge(log.action_taken)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
