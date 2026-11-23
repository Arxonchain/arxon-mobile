import { useState } from 'react';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GlassSheet, PrimaryBtn, TokenRow } from '@/features/arxon-v2/design/ProfileChrome';

export default function PrivacyDataSettings() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

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

  return (
    <GlassSheet title="Your data">
      <TokenRow
        wrap
        icon={<Download size={14} />}
        title="Download my data"
        sub="Profile, points, mining, and arena activity (GDPR / CCPA)."
      />
      <div style={{ padding: '4px 0 10px' }}>
        <PrimaryBtn
          label={exporting ? 'Preparing…' : 'Download JSON'}
          onClick={() => void handleExport()}
          disabled={exporting}
        />
      </div>
    </GlassSheet>
  );
}
