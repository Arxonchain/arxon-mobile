/**
 * AdminReferralRecovery.tsx — Mobile-responsive bulk recovery tool.
 * Card-based candidate list instead of table, stacked layout, touch targets ≥40px.
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
  const [code,         setCode]         = useState('');
  const [referrerInfo, setReferrerInfo] = useState<{ user_id: string; username: string } | null>(null);
  const [candidates,   setCandidates]   = useState<Candidate[]>([]);
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [loading,      setLoading]      = useState(false);
  const [crediting,    setCrediting]    = useState(false);

  const search = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setCandidates([]);
    setSelected(new Set());
    setReferrerInfo(null);

    try {
      const cleanCode = code.trim().toUpperCase();
      const { data: referrer } = await supabase
        .from('profiles').select('user_id, username').eq('referral_code', cleanCode).maybeSingle();

      if (!referrer) {
        toast({ title: 'Referral code not found', variant: 'destructive' });
        setLoading(false);
        return;
      }
      setReferrerInfo(referrer);

      const { data, error } = await supabase.rpc('get_referral_candidates' as any, { p_referral_code: cleanCode });
      if (error) throw error;
      setCandidates(data || []);
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
      toast({ title: 'Select at least one user', variant: 'destructive' });
      return;
    }
    if (!confirm(`Credit ${referrerInfo?.username} with ${selected.size} referrals (+${selected.size * 100} ARX-P)?`)) return;

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

      setCandidates([]); setSelected(new Set()); setCode(''); setReferrerInfo(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setCrediting(false);
  };

  const suspiciousGaps = candidates.filter((c, i) => {
    if (i === 0) return false;
    const prevTime = new Date(candidates[i-1].signup_time).getTime();
    const curTime  = new Date(c.signup_time).getTime();
    return (curTime - prevTime) < 5000;
  });

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Referral Recovery</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Search a code, review timing-matched candidates, select who to credit.
        </p>
      </div>

      {/* Search — stacked on mobile */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="ARX-XXXXXX"
              className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-lg outline-none focus:border-primary font-mono text-sm"
            />
          </div>
          <button onClick={search} disabled={loading}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm disabled:opacity-50 w-full sm:w-auto">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Referrer found */}
      {referrerInfo && (
        <div className="bg-card border border-border rounded-xl p-3.5 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">Referrer</p>
            <p className="font-bold text-base truncate">{referrerInfo.username}</p>
          </div>
          <div className="text-right flex-shrink-0 ml-3">
            <p className="text-[11px] text-muted-foreground">Candidates</p>
            <p className="font-bold text-base text-primary">{candidates.length}</p>
          </div>
        </div>
      )}

      {/* Suspicious warning */}
      {suspiciousGaps.length > 2 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3.5 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-yellow-500 mt-0.5 flex-shrink-0"/>
          <div className="min-w-0">
            <p className="font-medium text-yellow-200 text-sm">Possible bot cluster</p>
            <p className="text-xs text-yellow-200/70 mt-1 leading-relaxed">
              {suspiciousGaps.length} signups within 5 seconds of each other. Review before crediting.
            </p>
          </div>
        </div>
      )}

      {/* Candidates — card list, sticky action bar */}
      {candidates.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-3 border-b border-border flex items-center justify-between gap-2 sticky top-0 bg-card z-10">
            <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs font-medium flex-shrink-0">
              {selected.size === candidates.length
                ? <CheckSquare size={15} className="text-primary"/>
                : <Square size={15} className="text-muted-foreground"/>}
              {selected.size}/{candidates.length}
            </button>
            <button onClick={handleCredit} disabled={crediting || selected.size === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium disabled:opacity-50 flex-1 justify-center sm:flex-none">
              <Gift size={13}/> {crediting ? 'Crediting...' : `Credit (+${selected.size * 100} ARX-P)`}
            </button>
          </div>

          <div className="divide-y divide-border max-h-[55vh] overflow-y-auto">
            {candidates.map((c, i) => {
              const isFast = i > 0 &&
                (new Date(c.signup_time).getTime() - new Date(candidates[i-1].signup_time).getTime()) < 5000;
              return (
                <button key={c.referred_user_id} onClick={() => toggle(c.referred_user_id)}
                  className={`w-full flex items-center gap-2.5 p-3 text-left active:bg-muted/30 ${isFast ? 'bg-yellow-500/5' : ''}`}>
                  {selected.has(c.referred_user_id)
                    ? <CheckSquare size={16} className="text-primary flex-shrink-0"/>
                    : <Square size={16} className="text-muted-foreground flex-shrink-0"/>}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.username || 'No username'}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                      <Clock size={9}/> {c.minutes_after_referrer.toFixed(1)}m
                    </p>
                    {isFast && <p className="text-[10px] text-yellow-500 mt-0.5">⚠ fast</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!loading && code && candidates.length === 0 && referrerInfo && (
        <div className="text-center py-12 text-sm text-muted-foreground px-4">
          No unlinked candidates found near this referrer's signup time.
        </div>
      )}
    </div>
  );
}
