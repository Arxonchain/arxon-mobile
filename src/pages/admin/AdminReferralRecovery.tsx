/**
 * AdminReferralRecovery.tsx — Mobile-responsive bulk recovery tool.
 *
 * UPDATED: get_referral_candidates now searches ALL TIME after the referrer's
 * signup (no 15-min cap), so this can return many results for old/active
 * referrers. To keep it usable:
 *  - Results are sorted by closeness to referrer's signup time (most likely first)
 *  - A "Close matches only" filter toggle limits to candidates within 24h
 *  - "No username" (incomplete signups) are visually flagged as low-confidence
 *  - Search/filter box to narrow by username or email
 */
import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, CheckSquare, Square, Gift, AlertTriangle, Clock, Filter } from 'lucide-react';

interface Candidate {
  referred_user_id: string;
  username: string;
  email: string;
  signup_time: string;
  minutes_after_referrer: number;
}

const CLOSE_MATCH_MINUTES = 24 * 60; // 24 hours

export default function AdminReferralRecovery() {
  const { toast } = useToast();
  const [code,         setCode]         = useState('');
  const [referrerInfo, setReferrerInfo] = useState<{ user_id: string; username: string } | null>(null);
  const [candidates,   setCandidates]   = useState<Candidate[]>([]);
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [loading,      setLoading]      = useState(false);
  const [crediting,    setCrediting]    = useState(false);
  const [closeOnly,    setCloseOnly]    = useState(true); // default: show only plausible matches
  const [filterText,   setFilterText]   = useState('');

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
      // Do NOT pre-select everything anymore — with no time cap this could be
      // hundreds of unrelated users. Admin must deliberately select.
      setSelected(new Set());
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  // Apply filters: close-match toggle + text search
  const visibleCandidates = useMemo(() => {
    let list = candidates;
    if (closeOnly) {
      list = list.filter(c => c.minutes_after_referrer <= CLOSE_MATCH_MINUTES);
    }
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      list = list.filter(c =>
        (c.username || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [candidates, closeOnly, filterText]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    const visibleIds = visibleCandidates.map(c => c.referred_user_id);
    const allSelected = visibleIds.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) visibleIds.forEach(id => next.delete(id));
      else visibleIds.forEach(id => next.add(id));
      return next;
    });
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

      setCandidates(prev => prev.filter(c => !selected.has(c.referred_user_id)));
      setSelected(new Set());
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

  const formatGap = (mins: number) => {
    if (mins < 60) return `${mins.toFixed(0)}m`;
    if (mins < 1440) return `${(mins / 60).toFixed(1)}h`;
    return `${(mins / 1440).toFixed(1)}d`;
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Referral Recovery</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Search a code to find unlinked users who signed up after the referrer.
          Review carefully — this is a suggestion list, not proof.
        </p>
      </div>

      {/* Search */}
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
            <p className="text-[11px] text-muted-foreground">Total found</p>
            <p className="font-bold text-base text-primary">{candidates.length}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {candidates.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => setCloseOnly(!closeOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium flex-1 justify-center
                ${closeOnly ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-muted text-muted-foreground border border-transparent'}`}>
              <Filter size={13}/> {closeOnly ? 'Close matches only (≤24h)' : 'Showing all-time matches'}
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
            <input
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Filter by username or email..."
              className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary text-xs"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Showing {visibleCandidates.length} of {candidates.length} candidates
            {closeOnly && candidates.length > visibleCandidates.length && ' (older ones hidden — toggle filter to see all)'}
          </p>
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

      {/* Candidates */}
      {visibleCandidates.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-3 border-b border-border flex items-center justify-between gap-2 sticky top-0 bg-card z-10">
            <button onClick={toggleAllVisible} className="flex items-center gap-1.5 text-xs font-medium flex-shrink-0">
              {visibleCandidates.every(c => selected.has(c.referred_user_id)) && visibleCandidates.length > 0
                ? <CheckSquare size={15} className="text-primary"/>
                : <Square size={15} className="text-muted-foreground"/>}
              {selected.size} selected
            </button>
            <button onClick={handleCredit} disabled={crediting || selected.size === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium disabled:opacity-50 flex-1 justify-center sm:flex-none">
              <Gift size={13}/> {crediting ? 'Crediting...' : `Credit (+${selected.size * 100} ARX-P)`}
            </button>
          </div>

          <div className="divide-y divide-border max-h-[55vh] overflow-y-auto">
            {visibleCandidates.map((c) => {
              const isFast = candidates.findIndex(x => x.referred_user_id === c.referred_user_id) > 0 &&
                suspiciousGaps.some(s => s.referred_user_id === c.referred_user_id);
              const noUsername = !c.username;
              const veryClose = c.minutes_after_referrer <= 10;

              return (
                <button key={c.referred_user_id} onClick={() => toggle(c.referred_user_id)}
                  className={`w-full flex items-center gap-2.5 p-3 text-left active:bg-muted/30 ${isFast ? 'bg-yellow-500/5' : ''} ${noUsername ? 'opacity-70' : ''}`}>
                  {selected.has(c.referred_user_id)
                    ? <CheckSquare size={16} className="text-primary flex-shrink-0"/>
                    : <Square size={16} className="text-muted-foreground flex-shrink-0"/>}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {c.username || <span className="italic text-muted-foreground">No username</span>}
                      {noUsername && <span className="text-[10px] text-yellow-500 ml-1.5">⚠ incomplete signup</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-[10px] flex items-center gap-1 whitespace-nowrap ${veryClose ? 'text-green-400' : 'text-muted-foreground'}`}>
                      <Clock size={9}/> {formatGap(c.minutes_after_referrer)}
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
          No unlinked candidates found after this referrer's signup time.
        </div>
      )}

      {!loading && candidates.length > 0 && visibleCandidates.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground px-4">
          No matches with current filter. Try "Showing all-time matches" or clear the search text.
        </div>
      )}
    </div>
  );
}
