import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, Plus, Calendar, Zap, Target, Clock, Gift, 
  Trash2, Play, Pause, CheckCircle, XCircle, RefreshCw,
  TrendingUp, Users, DollarSign, Pencil
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ArenaBattle {
  id: string;
  title: string;
  description: string | null;
  side_a_name: string;
  side_a_color: string;
  side_b_name: string;
  side_b_color: string;
  side_a_power: number;
  side_b_power: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  winner_side: string | null;
  prize_pool: number;
  bonus_percentage: number;
  category: string;
  total_participants: number;
  duration_hours: number;
  total_rewards_distributed: number;
}

const CATEGORIES = [
  { value: 'crypto', label: '🪙 Crypto' },
  { value: 'sports', label: '⚽ Sports' },
  { value: 'politics', label: '🏛️ Politics' },
  { value: 'entertainment', label: '🎬 Entertainment' },
  { value: 'tech', label: '💻 Tech' },
  { value: 'other', label: '🎯 Other' },
];

const HOUR_OPTIONS = [0, 1, 2, 3, 4, 6, 12, 24, 48, 72, 168];
const MINUTE_OPTIONS = [0, 5, 10, 15, 30, 45];

const AdminArena = () => {
  const [battles, setBattles] = useState<ArenaBattle[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBattle, setEditingBattle] = useState<ArenaBattle | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    side_a_name: '',
    side_a_color: '#4ade80',
    side_b_name: '',
    side_b_color: '#f87171',
    category: 'crypto',
    duration_hours: '24',
    duration_minutes: '0',
    prize_pool: '0',
    bonus_percentage: '200',
    schedule_type: 'now' as 'now' | 'scheduled',
    scheduled_date: '',
    scheduled_hour: '12',
    scheduled_minute: '00',
    scheduled_period: 'PM' as 'AM' | 'PM',
  });

  // Edit form state (separate from create form)
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    side_a_name: '',
    side_a_color: '#4ade80',
    side_b_name: '',
    side_b_color: '#f87171',
    category: 'crypto',
    prize_pool: '0',
    bonus_percentage: '200',
    ends_at_date: '',
    ends_at_hour: '12',
    ends_at_minute: '00',
    ends_at_period: 'PM' as 'AM' | 'PM',
  });

  const fetchBattles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('arena_battles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setBattles(data || []);
    } catch (error) {
      console.error('Error fetching battles:', error);
      toast.error('Failed to load battles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBattles();
  }, []);

  const handleCreate = async () => {
    if (!formData.title || !formData.side_a_name || !formData.side_b_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate scheduled time if scheduling for later
    if (formData.schedule_type === 'scheduled') {
      if (!formData.scheduled_date) {
        toast.error('Please set a start date for the scheduled market');
        return;
      }
      
      // Convert 12-hour to 24-hour format for UTC
      let hour24 = parseInt(formData.scheduled_hour);
      if (formData.scheduled_period === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (formData.scheduled_period === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      const timeString = `${hour24.toString().padStart(2, '0')}:${formData.scheduled_minute}:00`;
      
      // Create UTC date
      const scheduledStart = new Date(`${formData.scheduled_date}T${timeString}Z`);
      if (scheduledStart <= new Date()) {
        toast.error('Scheduled start time must be in the future (UTC)');
        return;
      }
    }

    setCreating(true);
    try {
      let startsAt: Date;
      
      if (formData.schedule_type === 'scheduled') {
        // Convert 12-hour to 24-hour format and use UTC
        let hour24 = parseInt(formData.scheduled_hour);
        if (formData.scheduled_period === 'PM' && hour24 !== 12) {
          hour24 += 12;
        } else if (formData.scheduled_period === 'AM' && hour24 === 12) {
          hour24 = 0;
        }
        const timeString = `${hour24.toString().padStart(2, '0')}:${formData.scheduled_minute}:00`;
        startsAt = new Date(`${formData.scheduled_date}T${timeString}Z`);
      } else {
        // Start immediately
        startsAt = new Date();
      }

      // Calculate total duration in milliseconds (hours + minutes separately)
      const hours = parseInt(formData.duration_hours) || 0;
      const minutes = parseInt(formData.duration_minutes) || 0;
      const totalDurationMs = (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
      
      if (totalDurationMs < 5 * 60 * 1000) {
        toast.error('Duration must be at least 5 minutes');
        setCreating(false);
        return;
      }
      
      const endsAt = new Date(startsAt.getTime() + totalDurationMs);

      const { error } = await supabase.from('arena_battles').insert({
        title: formData.title,
        description: formData.description || null,
        side_a_name: formData.side_a_name,
        side_a_color: formData.side_a_color,
        side_b_name: formData.side_b_name,
        side_b_color: formData.side_b_color,
        category: formData.category,
        duration_hours: hours, // Store just the hours as integer
        prize_pool: parseFloat(formData.prize_pool) || 0,
        bonus_percentage: parseFloat(formData.bonus_percentage) || 200,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        is_active: true,
      });

      if (error) throw error;

      const isScheduled = formData.schedule_type === 'scheduled';
      toast.success(isScheduled ? 'Market scheduled successfully! It will go live at the set time.' : 'Market created and is now live!');
      setShowCreateDialog(false);
      setFormData({
        title: '',
        description: '',
        side_a_name: '',
        side_a_color: '#4ade80',
        side_b_name: '',
        side_b_color: '#f87171',
        category: 'crypto',
        duration_hours: '24',
        duration_minutes: '0',
        prize_pool: '0',
        bonus_percentage: '200',
        schedule_type: 'now',
        scheduled_date: '',
        scheduled_hour: '12',
        scheduled_minute: '00',
        scheduled_period: 'PM',
      });
      fetchBattles();
    } catch (error: any) {
      console.error('Error creating battle:', error);
      toast.error(error.message || 'Failed to create market');
    } finally {
      setCreating(false);
    }
  };

  const [resolving, setResolving] = useState<string | null>(null);

  const handleManualResolve = async (battleId: string, winnerSide: 'a' | 'b', force = false) => {
    setResolving(battleId);
    try {
      const { data, error } = await supabase.functions.invoke('resolve-arena-battle', {
        body: { battle_id: battleId, winner_side: winnerSide, force }
      });

      if (error) {
        // Try to parse the error body for more detail
        const errorBody = typeof error === 'object' && error.message ? error.message : String(error);
        throw new Error(errorBody);
      }
      
      // Check if the response contains an error
      if (data?.error) {
        throw new Error(data.error);
      }

      const result = data?.results?.[0];
      if (result?.error) {
        throw new Error(result.error);
      }

      const distributed = result?.totalDistributed || 0;
      const winnersCount = result?.winnersCount || 0;
      const losersCount = result?.losersCount || 0;
      
      toast.success(
        `✅ Resolved! ${winnersCount} winners, ${losersCount} losers. ${Math.round(distributed).toLocaleString()} ARX-P distributed.`
      );
      fetchBattles();
    } catch (error: any) {
      console.error('Error resolving battle:', error);
      toast.error(error.message || 'Failed to resolve market');
    } finally {
      setResolving(null);
    }
  };

  const handleDelete = async (battleId: string) => {
    if (!confirm('Are you sure you want to delete this market? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('arena_battles')
        .delete()
        .eq('id', battleId);

      if (error) throw error;
      
      toast.success('Market deleted');
      fetchBattles();
    } catch (error: any) {
      console.error('Error deleting battle:', error);
      toast.error(error.message || 'Failed to delete market');
    }
  };

  const handleToggleActive = async (battle: ArenaBattle) => {
    try {
      const { error } = await supabase
        .from('arena_battles')
        .update({ is_active: !battle.is_active })
        .eq('id', battle.id);

      if (error) throw error;
      
      toast.success(`Market ${battle.is_active ? 'paused' : 'activated'}`);
      fetchBattles();
    } catch (error: any) {
      toast.error('Failed to update market');
    }
  };

  const handleOpenEdit = (battle: ArenaBattle) => {
    setEditingBattle(battle);
    const endsAt = new Date(battle.ends_at);
    let h = endsAt.getUTCHours();
    const m = endsAt.getUTCMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    const dateStr = `${endsAt.getUTCFullYear()}-${String(endsAt.getUTCMonth() + 1).padStart(2, '0')}-${String(endsAt.getUTCDate()).padStart(2, '0')}`;
    setEditFormData({
      title: battle.title,
      description: battle.description || '',
      side_a_name: battle.side_a_name,
      side_a_color: battle.side_a_color,
      side_b_name: battle.side_b_name,
      side_b_color: battle.side_b_color,
      category: battle.category,
      prize_pool: String(battle.prize_pool || 0),
      bonus_percentage: String(battle.bonus_percentage || 200),
      ends_at_date: dateStr,
      ends_at_hour: String(h),
      ends_at_minute: String(m).padStart(2, '0'),
      ends_at_period: period as 'AM' | 'PM',
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!editingBattle) return;
    
    if (!editFormData.title || !editFormData.side_a_name || !editFormData.side_b_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUpdating(true);
    try {
      // Build updated ends_at from edit form
      let hour24 = parseInt(editFormData.ends_at_hour);
      if (editFormData.ends_at_period === 'PM' && hour24 !== 12) hour24 += 12;
      else if (editFormData.ends_at_period === 'AM' && hour24 === 12) hour24 = 0;
      const timeStr = `${hour24.toString().padStart(2, '0')}:${editFormData.ends_at_minute}:00`;
      const newEndsAt = new Date(`${editFormData.ends_at_date}T${timeStr}Z`);

      const { error } = await supabase
        .from('arena_battles')
        .update({
          title: editFormData.title,
          description: editFormData.description || null,
          side_a_name: editFormData.side_a_name,
          side_a_color: editFormData.side_a_color,
          side_b_name: editFormData.side_b_name,
          side_b_color: editFormData.side_b_color,
          category: editFormData.category,
          prize_pool: parseFloat(editFormData.prize_pool) || 0,
          bonus_percentage: parseFloat(editFormData.bonus_percentage) || 200,
          ends_at: newEndsAt.toISOString(),
        })
        .eq('id', editingBattle.id);

      if (error) throw error;

      toast.success('Market updated successfully!');
      setShowEditDialog(false);
      setEditingBattle(null);
      fetchBattles();
    } catch (error: any) {
      console.error('Error updating battle:', error);
      toast.error(error.message || 'Failed to update market');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (battle: ArenaBattle) => {
    const now = new Date();
    const startsAt = new Date(battle.starts_at);
    const endsAt = new Date(battle.ends_at);
    
    if (battle.winner_side) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
          Resolved
        </span>
      );
    }
    if (!battle.is_active) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-500">
          Paused
        </span>
      );
    }
    // Check if it's upcoming (start time is in the future)
    if (startsAt > now) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-500">
          Upcoming
        </span>
      );
    }
    if (endsAt < now) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-500">
          Pending Resolution
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
        Live
      </span>
    );
  };

  // Stats
  const now = new Date();
  const upcomingCount = battles.filter(b => b.is_active && !b.winner_side && new Date(b.starts_at) > now).length;
  const liveCount = battles.filter(b => b.is_active && !b.winner_side && new Date(b.starts_at) <= now && new Date(b.ends_at) > now).length;
  const pendingCount = battles.filter(b => !b.winner_side && new Date(b.ends_at) < now).length;
  const resolvedCount = battles.filter(b => b.winner_side).length;
  const totalStaked = battles.reduce((sum, b) => sum + b.side_a_power + b.side_b_power, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Arena Markets</h1>
          <p className="text-muted-foreground">Create and manage prediction markets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchBattles}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Market
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Market</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Market Title *</Label>
                  <Input
                    id="title"
                    placeholder="Will BTC hit $100K by end of week?"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Additional details about the prediction..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Sides */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Side A (YES) *</Label>
                    <Input
                      placeholder="YES - It will hit"
                      value={formData.side_a_name}
                      onChange={(e) => setFormData({ ...formData, side_a_name: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.side_a_color}
                        onChange={(e) => setFormData({ ...formData, side_a_color: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground">Color</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Side B (NO) *</Label>
                    <Input
                      placeholder="NO - It won't"
                      value={formData.side_b_name}
                      onChange={(e) => setFormData({ ...formData, side_b_name: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.side_b_color}
                        onChange={(e) => setFormData({ ...formData, side_b_color: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground">Color</span>
                    </div>
                  </div>
                </div>

                {/* Category & Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Duration - Hours */}
                  <div className="space-y-2">
                    <Label>Hours</Label>
                    <div className="flex flex-wrap gap-1">
                      {HOUR_OPTIONS.map((h) => (
                        <Button
                          key={h}
                          type="button"
                          size="sm"
                          variant={formData.duration_hours === String(h) ? 'default' : 'outline'}
                          className="min-w-[40px]"
                          onClick={() => setFormData({ ...formData, duration_hours: String(h) })}
                        >
                          {h}h
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Duration - Minutes */}
                <div className="space-y-2">
                  <Label>Minutes</Label>
                  <div className="flex flex-wrap gap-1">
                    {MINUTE_OPTIONS.map((m) => (
                      <Button
                        key={m}
                        type="button"
                        size="sm"
                        variant={formData.duration_minutes === String(m) ? 'default' : 'outline'}
                        className="min-w-[40px]"
                        onClick={() => setFormData({ ...formData, duration_minutes: String(m) })}
                      >
                        {m}m
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Duration Preview */}
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Total duration: {formData.duration_hours}h {formData.duration_minutes}m
                </div>

                {/* Schedule Type */}
                <div className="space-y-2">
                  <Label>When to Start</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={formData.schedule_type === 'now' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setFormData({ ...formData, schedule_type: 'now', scheduled_date: '', scheduled_hour: '12', scheduled_minute: '00', scheduled_period: 'PM' })}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Start Now
                    </Button>
                    <Button
                      type="button"
                      variant={formData.schedule_type === 'scheduled' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setFormData({ ...formData, schedule_type: 'scheduled' })}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule (UTC)
                    </Button>
                  </div>
                </div>

                {/* Scheduled Date/Time (shown only when scheduling) */}
                {formData.schedule_type === 'scheduled' && (
                  <div className="space-y-4 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
                    <div className="space-y-2">
                      <Label>Start Date (UTC) *</Label>
                      <Input
                        type="date"
                        value={formData.scheduled_date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Time (UTC) *</Label>
                      <div className="flex gap-2">
                        <Select
                          value={formData.scheduled_hour}
                          onValueChange={(v) => setFormData({ ...formData, scheduled_hour: v })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                              <SelectItem key={h} value={String(h)}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="flex items-center text-muted-foreground">:</span>
                        <Select
                          value={formData.scheduled_minute}
                          onValueChange={(v) => setFormData({ ...formData, scheduled_minute: v })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['00', '15', '30', '45'].map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={formData.scheduled_period}
                          onValueChange={(v) => setFormData({ ...formData, scheduled_period: v as 'AM' | 'PM' })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-xs text-blue-400">
                      ⏰ All times are in UTC. The market will appear as "Upcoming" until the scheduled time, then automatically go live for voting.
                    </p>
                  </div>
                )}

                {/* Prize Pool & Bonus */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prize Pool (ARX-P)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.prize_pool}
                      onChange={(e) => setFormData({ ...formData, prize_pool: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Extra pool distributed to winners</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Bonus %</Label>
                    <Input
                      type="number"
                      placeholder="200"
                      value={formData.bonus_percentage}
                      onChange={(e) => setFormData({ ...formData, bonus_percentage: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Heat bonus multiplier (200-500%)</p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Market'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{upcomingCount}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Play className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{liveCount}</p>
                <p className="text-sm text-muted-foreground">Live Markets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{resolvedCount}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalStaked.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Staked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Markets List */}
      <Card>
        <CardHeader>
          <CardTitle>All Markets</CardTitle>
          <CardDescription>Manage your prediction markets</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : battles.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No markets yet. Create your first one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {battles.map((battle) => (
                <motion.div
                  key={battle.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(battle)}
                        <span className="text-xs text-muted-foreground">
                          {CATEGORIES.find(c => c.value === battle.category)?.label || battle.category}
                        </span>
                      </div>
                      <h3 className="font-medium text-foreground truncate">{battle.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: battle.side_a_color }}
                          />
                          {battle.side_a_name}: {battle.side_a_power.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: battle.side_b_color }}
                          />
                          {battle.side_b_name}: {battle.side_b_power.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span><Users className="w-3 h-3 inline mr-1" />{battle.total_participants} voters</span>
                        <span><Gift className="w-3 h-3 inline mr-1" />Pool: {battle.prize_pool?.toLocaleString() || 0}</span>
                        <span><Zap className="w-3 h-3 inline mr-1" />Bonus: {battle.bonus_percentage}%</span>
                        {new Date(battle.starts_at) > now ? (
                          <span className="text-blue-400"><Calendar className="w-3 h-3 inline mr-1" />Starts: {format(new Date(battle.starts_at), 'MMM d, HH:mm')}</span>
                        ) : (
                          <span><Clock className="w-3 h-3 inline mr-1" />Ends: {format(new Date(battle.ends_at), 'MMM d, HH:mm')}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Resolution buttons */}
                      {!battle.winner_side && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={resolving === battle.id}
                            onClick={() => {
                              if (!confirm(`Resolve: Winner = ${battle.side_a_name} (Side A)?\n\nThis will distribute rewards immediately.`)) return;
                              handleManualResolve(battle.id, 'a');
                            }}
                            className="text-xs"
                            style={{ borderColor: battle.side_a_color, color: battle.side_a_color }}
                          >
                            {resolving === battle.id ? '⏳ Resolving...' : `${battle.side_a_name} Wins`}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={resolving === battle.id}
                            onClick={() => {
                              if (!confirm(`Resolve: Winner = ${battle.side_b_name} (Side B)?\n\nThis will distribute rewards immediately.`)) return;
                              handleManualResolve(battle.id, 'b');
                            }}
                            className="text-xs"
                            style={{ borderColor: battle.side_b_color, color: battle.side_b_color }}
                          >
                            {resolving === battle.id ? '⏳ Resolving...' : `${battle.side_b_name} Wins`}
                          </Button>
                        </>
                      )}
                      {/* Force re-resolve for battles with winner but no rewards */}
                      {battle.winner_side && (!battle.total_rewards_distributed || battle.total_rewards_distributed === 0) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={resolving === battle.id}
                          onClick={() => {
                            if (!confirm(`Force re-resolve "${battle.title}"?\n\nThis battle was partially resolved (no rewards distributed). This will retry reward distribution.`)) return;
                            handleManualResolve(battle.id, battle.winner_side as 'a' | 'b', true);
                          }}
                          className="text-xs"
                        >
                          {resolving === battle.id ? '⏳ Resolving...' : '🔄 Re-resolve'}
                        </Button>
                      )}

                      {/* Edit */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEdit(battle)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      
                      {/* Pause/Resume */}
                      {!battle.winner_side && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleToggleActive(battle)}
                        >
                          {battle.is_active ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      
                      {/* Delete */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(battle.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Market Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Market</DialogTitle>
            <DialogDescription>
              Update market details. Changes to title, description, side names, and colors are safe and won't affect ongoing voting.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Market Title *</Label>
              <Input
                id="edit-title"
                placeholder="Will BTC hit $100K by end of week?"
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Additional details about the prediction..."
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Sides */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Side A Name *</Label>
                <Input
                  placeholder="YES - It will hit"
                  value={editFormData.side_a_name}
                  onChange={(e) => setEditFormData({ ...editFormData, side_a_name: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editFormData.side_a_color}
                    onChange={(e) => setEditFormData({ ...editFormData, side_a_color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground">Color</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Side B Name *</Label>
                <Input
                  placeholder="NO - It won't"
                  value={editFormData.side_b_name}
                  onChange={(e) => setEditFormData({ ...editFormData, side_b_name: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editFormData.side_b_color}
                    onChange={(e) => setEditFormData({ ...editFormData, side_b_color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground">Color</span>
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={editFormData.category}
                onValueChange={(v) => setEditFormData({ ...editFormData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prize Pool & Bonus (editable - affects future payouts only) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prize Pool (ARX-P)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={editFormData.prize_pool}
                  onChange={(e) => setEditFormData({ ...editFormData, prize_pool: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Extra pool for winners</p>
              </div>
              <div className="space-y-2">
                <Label>Bonus %</Label>
                <Input
                  type="number"
                  placeholder="200"
                  value={editFormData.bonus_percentage}
                  onChange={(e) => setEditFormData({ ...editFormData, bonus_percentage: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Heat bonus (200-500%)</p>
              </div>
            </div>

            {/* End Time Editor */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                End Time (UTC)
              </Label>
              <div className="grid grid-cols-4 gap-2">
                <Input
                  type="date"
                  value={editFormData.ends_at_date}
                  onChange={(e) => setEditFormData({ ...editFormData, ends_at_date: e.target.value })}
                  className="col-span-2"
                />
                <Select
                  value={editFormData.ends_at_hour}
                  onValueChange={(v) => setEditFormData({ ...editFormData, ends_at_hour: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <SelectItem key={h} value={String(h)}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={editFormData.ends_at_minute}
                  onValueChange={(v) => setEditFormData({ ...editFormData, ends_at_minute: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Select
                value={editFormData.ends_at_period}
                onValueChange={(v) => setEditFormData({ ...editFormData, ends_at_period: v as 'AM' | 'PM' })}
              >
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">⚠️ Changing end time affects the countdown for all users immediately.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminArena;