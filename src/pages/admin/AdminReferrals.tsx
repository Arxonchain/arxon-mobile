/**
 * AdminReferrals.tsx — Manual Referral Management
 * Allows admin to:
 * 1. Search users and manually add missing referral links
 * 2. See all current referrals with referrer/referred details
 * 3. Award points manually for referrals
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Users, Gift, Trash2, RefreshCw } from 'lucide-react';

interface Profile {
  user_id: string;
  username: string;
  referral_code: string;
  email?: string;
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
  referrer_email?: string;
  referred_email?: string;
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
      // Get referrals with user details
      const { data: refs } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!refs) { setLoading(false); return; }

      // Get all unique user IDs
      const userIds = [...new Set([
        ...refs.map(r => r.referrer_id),
        ...refs.map(r => r.referred_id),
      ])];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, referral_code')
        .in('user_id', userIds);

      // Fetch emails from auth (via admin view if available)
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
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadReferrals(); }, [loadReferrals]);

  // Search profiles by username or email
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
        .limit(8);

      if (type === 'referrer') setReferrerResults(data || []);
      else setReferredResults(data || []);
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
      // Check if already exists
      const { data: existing } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_id', selectedReferred.user_id)
        .maybeSingle();

      if (existing) {
        toast({ title: 'Referral already exists for this user', variant: 'destructive' });
        setSaving(false);
        return;
      }

      // Insert referral — trigger awards 100 ARX-P automatically
      const { error } = await supabase.from('referrals').insert({
        referrer_id:        selectedReferrer.user_id,
        referred_id:        selectedReferred.user_id,
        referral_code_used: selectedReferrer.referral_code,
        points_awarded:     0, // trigger sets to 100
      });

      if (error) throw error;

      // Also update referred user's profile.referred_by
      await supabase
        .from('profiles')
        .update({ referred_by: selectedReferrer.referral_code } as any)
        .eq('user_id', selectedReferred.user_id);

      toast({
        title: '✅ Referral added!',
        description: `${selectedReferrer.username} → ${selectedReferred.username} · 100 ARX-P awarded`,
      });

      setSelectedReferrer(null);
      setSelectedReferred(null);
      setReferrerQuery('');
      setReferredQuery('');
      setShowForm(false);
      loadReferrals();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this referral? Points will NOT be reversed automatically.')) return;
    await supabase.from('referrals').delete().eq('id', id);
    toast({ title: 'Referral deleted' });
    loadReferrals();
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Referral Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manually add missing referrals. The trigger auto-awards 100 ARX-P on insert.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadReferrals}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-sm">
            <RefreshCw size={14}/> Refresh
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            <Plus size={14}/> Add Referral
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Referrals',   value: stats.total,           col: 'text-foreground'   },
          { label: 'Unique Referrers',  value: stats.uniqueReferrers, col: 'text-blue-400'     },
          { label: 'Total ARX-P Given', value: `${stats.totalPoints.toLocaleString()}`, col: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.col}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add Referral Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Gift size={18}/> Add Missing Referral
          </h2>
          <p className="text-sm text-muted-foreground">
            Search for the referrer (person who shared their code) and the referred user
            (person who signed up using that code).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Referrer */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Referrer (shared their code)
              </label>
              {selectedReferrer ? (
                <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{selectedReferrer.username}</p>
                    <p className="text-xs text-muted-foreground">Code: {selectedReferrer.referral_code}</p>
                  </div>
                  <button onClick={() => { setSelectedReferrer(null); setReferrerQuery(''); }}
                    className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                    <input value={referrerQuery}
                      onChange={e => { setReferrerQuery(e.target.value); searchProfiles(e.target.value, 'referrer'); }}
                      placeholder="Search by username..."
                      className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary"/>
                  </div>
                  {referrerResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                      {referrerResults.map(p => (
                        <button key={p.user_id} onClick={() => { setSelectedReferrer(p); setReferrerResults([]); }}
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm">
                          <span className="font-medium">{p.username}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{p.referral_code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Referred */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Referred User (signed up using referral)
              </label>
              {selectedReferred ? (
                <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{selectedReferred.username}</p>
                    <p className="text-xs text-muted-foreground">{selectedReferred.user_id.slice(0, 8)}...</p>
                  </div>
                  <button onClick={() => { setSelectedReferred(null); setReferredQuery(''); }}
                    className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                    <input value={referredQuery}
                      onChange={e => { setReferredQuery(e.target.value); searchProfiles(e.target.value, 'referred'); }}
                      placeholder="Search by username..."
                      className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary"/>
                  </div>
                  {referredResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                      {referredResults.map(p => (
                        <button key={p.user_id} onClick={() => { setSelectedReferred(p); setReferredResults([]); }}
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm">
                          <span className="font-medium">{p.username}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{p.user_id.slice(0,8)}...</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {selectedReferrer && selectedReferred && (
            <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg text-sm">
              <strong>{selectedReferrer.username}</strong> referred <strong>{selectedReferred.username}</strong>
              {' '}→ <span className="text-green-400 font-medium">100 ARX-P</span> will be awarded to {selectedReferrer.username}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleAddReferral} disabled={saving || !selectedReferrer || !selectedReferred}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? 'Adding...' : '✓ Add Referral & Award Points'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Referrals Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Users size={16} className="text-muted-foreground"/>
          <h2 className="font-medium text-foreground">All Referrals ({referrals.length})</h2>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse"/>)}
          </div>
        ) : referrals.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={32} className="mx-auto mb-3 text-muted-foreground/30"/>
            <p className="text-muted-foreground">No referrals yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-muted-foreground font-medium">Referrer</th>
                  <th className="px-4 py-3 text-muted-foreground font-medium">Referred User</th>
                  <th className="px-4 py-3 text-muted-foreground font-medium">Code Used</th>
                  <th className="px-4 py-3 text-muted-foreground font-medium">Points</th>
                  <th className="px-4 py-3 text-muted-foreground font-medium">Date</th>
                  <th className="px-4 py-3 text-muted-foreground font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r, i) => (
                  <tr key={r.id} className={`border-b border-border/50 hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {r.referrer_username}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.referred_username}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-mono">
                        {r.referral_code_used}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-green-400 font-medium">
                        +{r.points_awarded}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {fmt(r.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(r.id)}
                        className="text-destructive/50 hover:text-destructive">
                        <Trash2 size={14}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
