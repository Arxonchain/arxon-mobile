/**
 * AdminReferralRecovery.tsx
 *
 * Bulk recovery tool for historical referrals lost before the permanent fix.
 * Uses signup-timing proximity to SUGGEST candidates — admin reviews and
 * approves per referral code before crediting. Every action is logged.
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, CheckSquare, Square, Gift, AlertTriangle, Clock } from 'lucide-react';

interface Candidate {
  referred_user_id: string;
  username: string;
  email: string;
  signup_time: string;
  minutes_after_referrer: number;
}

export default function AdminReferralRecovery() {
  const { toast } = useToast();
  const [code,       setCode]       = useState('');
  const [referrerInfo, setReferrerInfo] = useState<{ user_id: string; username: string } | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [loading,    setLoading]    = useState(false);
  const [crediting,  setCrediting]  = useState(false);

  const search = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setCandidates([]);
    setSelected(new Set());
    setReferrerInfo(null);

    try {
      const cleanCode = code.trim().toUpperCase();

      // Get referrer info
      const { data: referrer } = await supabase
        .from('profiles')
        .select('user_id, username')
        .eq('referral_code', cleanCode)
        .maybeSingle();

      if (!referrer) {
        toast({ title: 'Referral code not found', variant: 'destructive' });
        setLoading(false);
        return;
      }
      setReferrerInfo(referrer);

      // Get candidates via RPC
      const { data, error } = await supabase.rpc('get_referral_candidates' as any, {
        p_referral_code: cleanCode,
      });

      if (error) throw error;
      setCandidates(data || []);
      // Pre-select all by default — admin can deselect suspicious ones
      setSelected(new Set((data || []).map((c: Candidate) => c.referred_user_id)));
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === candidates.length) setSelected(new Set());
    else setSelected(new Set(candidates.map(c => c.referred_user_id)));
  };

  const handleCredit = async () => {
    if (selected.size === 0) {
      toast({ title: 'Select at least one user to credit', variant: 'destructive' });
      return;
    }
    if (!confirm(`Credit ${referrerInfo?.username} with ${selected.size} referrals? This awards ${selected.size * 100} ARX-P and cannot be easily undone.`)) {
      return;
    }

    setCrediting(true);
    try {
      const { data, error } = await supabase.rpc('bulk_approve_referrals' as any, {
        p_referral_code: code.trim().toUpperCase(),
        p_user_ids: Array.from(selected),
      });

      if (error) throw error;
      const result = data as any;

      toast({
        title: `✅ ${result.credited_count} referrals credited!`,
        description: `${referrerInfo?.username} earned ${result.credited_count * 100} ARX-P`,
      });

      setCandidates([]);
      setSelected(new Set());
      setCode('');
      setReferrerInfo(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setCrediting(false);
  };

  // Flag suspicious clusters: many signups within seconds of each other
  const suspiciousGaps = candidates.filter((c, i) => {
    if (i === 0) return false;
    const prevTime = new Date(candidates[i-1].signup_time).getTime();
    const curTime = new Date(c.signup_time).getTime();
    return (curTime - prevTime) < 5000; // less than 5 seconds apart
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Referral Recovery Tool</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search a referral code to find likely referred users based on signup timing.
          Review and select who to credit — every action is logged for audit.
        </p>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="Enter referral code (e.g. ARX-UW943F)"
              className="w-full pl-9 pr-3 py-3 bg-background border border-border rounded-lg outline-none focus:border-primary font-mono"
            />
          </div>
          <button onClick={search} disabled={loading}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Referrer found */}
      {referrerInfo && (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Referrer</p>
            <p className="font-bold text-lg">{referrerInfo.username}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Candidates found</p>
            <p className="font-bold text-lg text-primary">{candidates.length}</p>
          </div>
        </div>
      )}

      {/* Suspicious warning */}
      {suspiciousGaps.length > 2 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-yellow-500 mt-0.5 flex-shrink-0"/>
          <div>
            <p className="font-medium text-yellow-200">Possible bot cluster detected</p>
            <p className="text-sm text-yellow-200/70 mt-1">
              {suspiciousGaps.length} of these signups happened within 5 seconds of each other.
              Review carefully before crediting — this pattern can indicate automated account creation
              rather than genuine referrals.
            </p>
          </div>
        </div>
      )}

      {/* Candidates list */}
      {candidates.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <button onClick={toggleAll} className="flex items-center gap-2 text-sm font-medium">
              {selected.size === candidates.length
                ? <CheckSquare size={16} className="text-primary"/>
                : <Square size={16} className="text-muted-foreground"/>}
              {selected.size} / {candidates.length} selected
            </button>
            <button onClick={handleCredit} disabled={crediting || selected.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              <Gift size={14}/> {crediting ? 'Crediting...' : `Credit ${selected.size} Referrals (+${selected.size * 100} ARX-P)`}
            </button>
          </div>

          <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
            {candidates.map((c, i) => {
              const isFast = i > 0 &&
                (new Date(c.signup_time).getTime() - new Date(candidates[i-1].signup_time).getTime()) < 5000;
              return (
                <button key={c.referred_user_id} onClick={() => toggle(c.referred_user_id)}
                  className={`w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 ${isFast ? 'bg-yellow-500/5' : ''}`}>
                  {selected.has(c.referred_user_id)
                    ? <CheckSquare size={16} className="text-primary flex-shrink-0"/>
                    : <Square size={16} className="text-muted-foreground flex-shrink-0"/>}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.username || 'No username'}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={10}/> {c.minutes_after_referrer.toFixed(2)}m after
                    </p>
                    {isFast && (
                      <p className="text-xs text-yellow-500 mt-0.5">⚠ fast signup</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!loading && code && candidates.length === 0 && referrerInfo && (
        <div className="text-center py-12 text-muted-foreground">
          No unlinked candidates found near this referrer's signup time.
        </div>
      )}
    </div>
  );
}
