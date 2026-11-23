import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, RefreshCw, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { toast } from "sonner";
import { format } from "date-fns";

type Row = {
  id: string;
  user_id: string;
  email: string | null;
  username: string | null;
  status: string;
  requested_at: string;
  scheduled_for: string;
  admin_note: string | null;
};

export default function AdminDeletions() {
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-deletions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_deletion_requests")
        .select("id, user_id, email, username, status, requested_at, scheduled_for, admin_note")
        .order("requested_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as Row[];
    },
    refetchInterval: 30_000,
  });

  const act = useMutation({
    mutationFn: async ({ action, requestId }: { action: string; requestId: string }) => {
      const { data, error } = await supabase.functions.invoke("account-deletion", {
        body: { action, requestId, note },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      setNote("");
      void qc.invalidateQueries({ queryKey: ["admin-deletions"] });
      toast.success("Updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Deletion requests"
        description="30-day cooling-off. Approve during review, complete only after the scheduled date. Team is emailed at team@arxonchain.org."
      />
      <div className="flex gap-2">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional admin note for approve/deny"
          className="max-w-md"
        />
        <Button variant="outline" onClick={() => void refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deletion requests yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const due = new Date(row.scheduled_for).getTime() <= Date.now();
            return (
              <div key={row.id} className="rounded-lg border border-border/60 bg-card p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{row.username || "—"} · {row.email || row.user_id}</p>
                    <p className="text-xs text-muted-foreground">
                      Requested {format(new Date(row.requested_at), "PP")} · scheduled {format(new Date(row.scheduled_for), "PP")}
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                {row.admin_note ? <p className="text-xs text-muted-foreground">Note: {row.admin_note}</p> : null}
                {(row.status === "pending" || row.status === "approved") && (
                  <div className="flex flex-wrap gap-2">
                    {row.status === "pending" && (
                      <Button size="sm" onClick={() => act.mutate({ action: "approve", requestId: row.id })} disabled={act.isPending}>
                        Approve
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => act.mutate({ action: "deny", requestId: row.id })} disabled={act.isPending}>
                      Deny
                    </Button>
                    {row.status === "approved" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={!due || act.isPending}
                        onClick={() => act.mutate({ action: "complete", requestId: row.id })}
                      >
                        {due ? "Complete deletion" : "Waiting period"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: typeof Clock; className: string }> = {
    pending: { icon: Clock, className: "bg-yellow-500/10 text-yellow-600" },
    approved: { icon: CheckCircle2, className: "bg-blue-500/10 text-blue-600" },
    denied: { icon: XCircle, className: "bg-muted text-muted-foreground" },
    cancelled: { icon: XCircle, className: "bg-muted text-muted-foreground" },
    completed: { icon: Trash2, className: "bg-red-500/10 text-red-600" },
  };
  const cfg = map[status] || map.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${cfg.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}
