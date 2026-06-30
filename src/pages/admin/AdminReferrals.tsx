/**
 * AdminReferrals.tsx — Mobile-responsive Manual Referral Management
 * All elements stack on small screens, no fixed-width tables, touch-friendly.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Users, Gift, Trash2, RefreshCw, X } from 'lucide-react';

interface Profile {
  user_id: string;
  username: string;
  referral_code: string;
}

interface ReferralRow {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code_used: string;
  points_awarded: number;
  created_at: string;
  referrer_username?: string;
  referred_username?: string;
}

export default function AdminReferrals() {
  const { toast } = useToast();
  const [referrals,     setReferrals]     = useState<ReferralRow[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [showForm,      setShowForm]      = useState(false);
  const [referrerQuery, setReferrerQuery] = useState('');
  const [referredQuery, setReferredQuery] = useState('');
  const [referrerResults, setReferrerResults] = useState<Profile[]>([]);
  const [referredResults, setReferredResults] = useState<Profile[]>([]);
  const [selectedReferrer, setSelectedReferrer] = useState<Profile | null>(null);
  const [selectedReferred, setSelectedReferred] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ total: 0, uniqueReferrers: 0, totalPoints: 0 });

  const loadReferrals = useCallback(async () => {
    setLoading(true);
    try {
      const { data: refs } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!refs) { setLoading(false); return; }

      const userIds = [...new Set([...refs.map(r => r.referrer_id), ...refs.map(r => r.referred_id)])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, referral_code')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const enriched: ReferralRow[] = refs.map(r => ({
        ...r,
        referrer_username: profileMap.get(r.referrer_id)?.username || '?',
        referred_username: profileMap.get(r.referred_id)?.username || '?',
      }));

      setReferrals(enriched);
      setStats({
        total: refs.length,
        uniqueReferrers: new Set(refs.map(r => r.referrer_id)).size,
        totalPoints: refs.reduce((s, r) => s + (r.points_awarded || 0), 0),
      });
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadReferrals(); }, [loadReferrals]);

  const searchProfiles = async (query: string, type: 'referrer' | 'referred') => {
    if (!query.trim()) {
      type === 'referrer' ? setReferrerResults([]) : setReferredResults([]);
      return;
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, referral_code')
        .ilike('username', `%${query}%`)
        .limit(6);
      type === 'referrer' ? setReferrerResults(data || []) : setReferredResults(data || []);
    } catch {}
  };

  const handleAddReferral = async () => {
    if (!selectedReferrer || !selectedReferred) {
      toast({ title: 'Select both users', variant: 'destructive' });
      return;
    }
    if (selectedReferrer.user_id === selectedReferred.user_id) {
      toast({ title: 'Users cannot refer themselves', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('referrals').select('id').eq('referred_id', selectedReferred.user_id).maybeSingle();

      if (existing) {
        toast({ title: 'Referral already exists for this user', variant: 'destructive' });
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('referrals').insert({
        referrer_id: selectedReferrer.user_id,
        referred_id: selectedReferred.user_id,
        referral_code_used: selectedReferrer.referral_code,
        points_awarded: 0,
      });
      if (error) throw error;

      await supabase.from('profiles')
        .update({ referred_by: selectedReferrer.referral_code } as any)
        .eq('user_id', selectedReferred.user_id);

      toast({ title: '✅ Referral added!', description: `100 ARX-P awarded to ${selectedReferrer.username}` });
      setSelectedReferrer(null); setSelectedReferred(null);
      setReferrerQuery(''); setReferredQuery('');
      setShowForm(false);
      loadReferrals();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this referral?')) return;
    await supabase.from('referrals').delete().eq('id', id);
    toast({ title: 'Referral deleted' });
    loadReferrals();
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Referral Manager</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Manually link missing referrals. 100 ARX-P is auto-awarded on insert.
        </p>
      </div>

      {/* Actions row — stacks on mobile */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={loadReferrals}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-muted text-muted-foreground text-sm w-full sm:w-auto">
          <RefreshCw size={14}/> Refresh
        </button>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium w-full sm:w-auto">
          <Plus size={14}/> Add Referral
        </button>
      </div>

      {/* Stats — 3-col on all sizes, compact on mobile */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total',     value: stats.total,           col: 'text-foreground' },
          { label: 'Referrers', value: stats.uniqueReferrers, col: 'text-blue-400'   },
          { label: 'ARX-P',     value: stats.totalPoints.toLocaleString(), col: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-2.5 sm:p-4 text-center">
            <p className={`text-base sm:text-2xl font-bold ${s.col} truncate`}>{s.value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add Referral Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Gift size={16}/> Add Missing Referral
            </h2>
            <button onClick={() => setShowForm(false)}><X size={16} className="text-muted-foreground"/></button>
          </div>

          {/* Referrer + Referred — always stacked, never side-by-side (mobile-first) */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Referrer (shared code)</label>
              {selectedReferrer ? (
                <div className="flex items-center justify-between p-2.5 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{selectedReferrer.username}</p>
                    <p className="text-[11px] text-muted-foreground">{selectedReferrer.referral_code}</p>
                  </div>
                  <button onClick={() => { setSelectedReferrer(null); setReferrerQuery(''); }}
                    className="text-xs text-muted-foreground px-2 flex-shrink-0">✕</button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                  <input value={referrerQuery}
                    onChange={e => { setReferrerQuery(e.target.value); searchProfiles(e.target.value, 'referrer'); }}
                    placeholder="Search username..."
                    className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary"/>
                  {referrerResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-20 overflow-hidden max-h-48 overflow-y-auto">
                      {referrerResults.map(p => (
                        <button key={p.user_id} onClick={() => { setSelectedReferrer(p); setReferrerResults([]); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted text-sm flex items-center justify-between">
                          <span className="font-medium truncate">{p.username}</span>
                          <span className="text-muted-foreground text-xs flex-shrink-0 ml-2">{p.referral_code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Referred User (used the code)</label>
              {selectedReferred ? (
                <div className="flex items-center justify-between p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{selectedReferred.username}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{selectedReferred.user_id.slice(0,8)}...</p>
                  </div>
                  <button onClick={() => { setSelectedReferred(null); setReferredQuery(''); }}
                    className="text-xs text-muted-foreground px-2 flex-shrink-0">✕</button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                  <input value={referredQuery}
                    onChange={e => { setReferredQuery(e.target.value); searchProfiles(e.target.value, 'referred'); }}
                    placeholder="Search username..."
                    className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary"/>
                  {referredResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-20 overflow-hidden max-h-48 overflow-y-auto">
                      {referredResults.map(p => (
                        <button key={p.user_id} onClick={() => { setSelectedReferred(p); setReferredResults([]); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted text-sm flex items-center justify-between">
                          <span className="font-medium truncate">{p.username}</span>
                          <span className="text-muted-foreground text-xs flex-shrink-0 ml-2">{p.user_id.slice(0,8)}...</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {selectedReferrer && selectedReferred && (
            <div className="p-2.5 bg-accent/5 border border-accent/20 rounded-lg text-xs leading-relaxed">
              <strong>{selectedReferrer.username}</strong> referred <strong>{selectedReferred.username}</strong>
              {' '}→ <span className="text-green-400 font-medium">100 ARX-P</span> awarded
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={handleAddReferral} disabled={saving || !selectedReferrer || !selectedReferred}
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 w-full sm:w-auto">
              {saving ? 'Adding...' : '✓ Add & Award Points'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm w-full sm:w-auto">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Referrals list — CARD layout on mobile, NOT a table (tables break on small screens) */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-border flex items-center gap-2">
          <Users size={15} className="text-muted-foreground"/>
          <h2 className="font-medium text-sm">All Referrals ({referrals.length})</h2>
        </div>

        {loading ? (
          <div className="space-y-2 p-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse"/>)}
          </div>
        ) : referrals.length === 0 ? (
          <div className="p-10 text-center">
            <Users size={28} className="mx-auto mb-3 text-muted-foreground/30"/>
            <p className="text-sm text-muted-foreground">No referrals yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
            {referrals.map(r => (
              <div key={r.id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {r.referrer_username} <span className="text-muted-foreground font-normal">→</span> {r.referred_username}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-mono">
                      {r.referral_code_used}
                    </span>
                    <span className="text-green-400 text-xs font-medium">+{r.points_awarded}</span>
                    <span className="text-muted-foreground text-[10px]">{fmt(r.created_at)}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(r.id)}
                  className="p-2 text-destructive/50 active:text-destructive flex-shrink-0">
                  <Trash2 size={15}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
