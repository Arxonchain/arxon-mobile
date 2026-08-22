import { useState } from 'react';
import { Download, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function PrivacyDataSettings() {
  const { toast } = useToast();
  const { signOut } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Not signed in');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-my-data`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `arxon-data-export-${new Date().toISOString().slice(0, 10)}.json`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      toast({
        title: 'Export ready',
        description: 'Your data download has started.',
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Export failed';
      toast({ title: 'Export failed', description: message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast({
        title: 'Confirmation required',
        description: 'Type DELETE to confirm permanent account deletion.',
        variant: 'destructive',
      });
      return;
    }

    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-my-account', {
        body: { confirmation: 'DELETE' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Account deleted',
        description: 'Your account and associated data have been removed.',
      });
      await signOut();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Deletion failed';
      toast({ title: 'Could not delete account', description: message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pt-2 border-t border-border/40">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Download className="h-4 w-4 text-accent" />
          Your Data
        </h3>
        <p className="text-xs text-muted-foreground">
          Download a copy of your profile, points, mining, and arena activity (GDPR/CCPA).
        </p>
      </div>

      <Button
        variant="outline"
        onClick={handleExport}
        disabled={exporting}
        className="w-full sm:w-auto"
      >
        {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
        Download my data
      </Button>

      <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Delete account
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Permanently removes your account and linked data. This cannot be undone. Unspent ARX-P points are forfeited.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="deleteConfirm" className="text-xs text-muted-foreground">
            Type <strong>DELETE</strong> to confirm
          </Label>
          <Input
            id="deleteConfirm"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
            className="bg-secondary/50 border-border/50 max-w-xs"
            autoComplete="off"
          />
        </div>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting || deleteConfirm !== 'DELETE'}
          className="w-full sm:w-auto"
        >
          {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Delete my account permanently
        </Button>
      </div>
    </div>
  );
}
