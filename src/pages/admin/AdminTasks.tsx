import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Edit2, Save, X, ExternalLink,
  Twitter, Youtube, CheckCircle, Zap, Bell
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  points_reward: number;
  external_url: string | null;
  task_type: string;
  is_active: boolean;
  created_at: string;
}

const TASK_TYPES = [
  { value: "social",  label: "X / Twitter", icon: "🐦" },
  { value: "youtube", label: "YouTube",      icon: "▶️" },
  { value: "daily",   label: "Daily",        icon: "📅" },
  { value: "special", label: "Special",      icon: "⭐" },
  { value: "general", label: "General",      icon: "📋" },
];

const empty = {
  title: "", description: "", points_reward: 500,
  external_url: "", task_type: "social", is_active: true,
};

export default function AdminTasks() {
  const { toast } = useToast();
  const [tasks, setTasks]           = useState<Task[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [notifying, setNotifying]   = useState(false);
  const [form, setForm]             = useState(empty);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    setTasks((data || []) as Task[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(empty); setEditingId(null); setShowForm(false); };

  const startEdit = (t: Task) => {
    setForm({
      title: t.title, description: t.description || "",
      points_reward: t.points_reward, external_url: t.external_url || "",
      task_type: t.task_type, is_active: t.is_active,
    });
    setEditingId(t.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (form.points_reward < 1) { toast({ title: "Points must be at least 1", variant: "destructive" }); return; }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      points_reward: Number(form.points_reward),
      external_url: form.external_url.trim() || null,
      task_type: form.task_type,
      is_active: form.is_active,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("tasks").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("tasks").insert(payload));
    }

    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    toast({ title: editingId ? "Task updated ✓" : "Task created ✓",
      description: "Users will see it immediately — no app update needed." });
    resetForm();
    load();
  };

  const toggle = async (t: Task) => {
    await supabase.from("tasks").update({ is_active: !t.is_active }).eq("id", t.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    await supabase.from("tasks").delete().eq("id", id);
    toast({ title: "Task deleted" });
    load();
  };

  // Notify ALL users about new tasks via user_notifications table
  const notifyAll = async () => {
    setNotifying(true);
    try {
      // Get all user IDs
      const { data: profiles } = await supabase.from("profiles").select("user_id");
      if (!profiles || profiles.length === 0) {
        toast({ title: "No users found", variant: "destructive" });
        return;
      }

      const rows = profiles.map((p: any) => ({
        user_id: p.user_id,
        notification_type: "new_tasks",
        title: "🎯 New Tasks Available!",
        message: "New tasks have been added. Complete them now to earn ARX-P rewards!",
        amount: 0,
        read: false,
      }));

      // Insert in batches of 500
      for (let i = 0; i < rows.length; i += 500) {
        await supabase.from("user_notifications").insert(rows.slice(i, i + 500));
      }

      toast({
        title: "Notification sent to all users ✓",
        description: `${profiles.length} users notified about new tasks.`,
      });
    } catch (err: any) {
      toast({ title: "Error sending notifications", description: err.message, variant: "destructive" });
    } finally {
      setNotifying(false);
    }
  };

  const typeInfo = (type: string) => TASK_TYPES.find(t => t.value === type) || TASK_TYPES[4];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Task Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add X/Twitter & YouTube tasks. Users see them instantly — no app update needed.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={notifyAll} disabled={notifying} className="gap-2">
            <Bell className="h-4 w-4" />
            {notifying ? "Sending…" : "Notify All Users"}
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Task
          </Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-foreground">{editingId ? "Edit Task" : "New Task"}</h2>
            <button onClick={resetForm}><X className="h-5 w-5 text-muted-foreground hover:text-foreground" /></button>
          </div>

          {/* Task type selector */}
          <div>
            <Label className="mb-2 block">Task Type</Label>
            <div className="flex flex-wrap gap-2">
              {TASK_TYPES.map(t => (
                <button key={t.value} type="button"
                  onClick={() => setForm(f => ({ ...f, task_type: t.value }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all
                    ${form.task_type === t.value
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted/30 border-border text-muted-foreground hover:border-primary/50"}`}>
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input id="title" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={form.task_type === "social"
                  ? "Retweet our launch post" : "Subscribe to Arxon YouTube"} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">Points Reward *</Label>
              <Input id="points" type="number" min={1} value={form.points_reward}
                onChange={e => setForm(f => ({ ...f, points_reward: Number(e.target.value) }))}
                placeholder="500" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">
              {form.task_type === "social" ? "X / Twitter Post URL" : "YouTube Video or Channel URL"}
              <span className="text-muted-foreground text-xs ml-2">(button opens this link)</span>
            </Label>
            <div className="relative">
              <Input id="url" value={form.external_url}
                onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))}
                placeholder={form.task_type === "social"
                  ? "https://x.com/arxonchain/status/..." : "https://youtube.com/watch?v=..."}
                className="pr-10" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {form.task_type === "social" ? <Twitter className="h-4 w-4" /> : <Youtube className="h-4 w-4" />}
              </div>
            </div>
            {form.external_url && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                Users will be taken to this link when they click the task button
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={form.task_type === "social"
                ? "Retweet our post and earn ARX-P rewards!"
                : "Subscribe to our YouTube channel and earn ARX-P rewards!"}
              rows={2} />
          </div>

          <div className="flex items-center gap-3">
            <button type="button"
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? "bg-primary" : "bg-muted"}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.is_active ? "left-6" : "left-1"}`} />
            </button>
            <Label className="cursor-pointer" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
              {form.is_active ? "Active — visible to users" : "Inactive — hidden from users"}
            </Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={save} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : editingId ? "Save Changes" : "Create Task"}
            </Button>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Total Tasks",  value: tasks.length,                           color: "text-foreground" },
          { label: "Active",       value: tasks.filter(t => t.is_active).length,  color: "text-green-400"  },
          { label: "Inactive",     value: tasks.filter(t => !t.is_active).length, color: "text-yellow-400" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-card rounded-xl border border-border animate-pulse" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Zap className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-foreground mb-1">No tasks yet</p>
          <p className="text-sm text-muted-foreground">Click "Add Task" to create your first task</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(t => {
            const info = typeInfo(t.task_type);
            return (
              <div key={t.id}
                className={`bg-card border rounded-xl p-4 flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 transition-all
                  ${t.is_active ? "border-border" : "border-border/40 opacity-60"}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0 basis-full sm:basis-0">
                <div className="text-2xl flex-shrink-0">{info.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground truncate">{t.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${t.is_active ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {info.label}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-bold text-accent flex items-center gap-1">
                      <Zap className="h-3 w-3" />+{t.points_reward.toLocaleString()} ARX-P
                    </span>
                    {t.external_url && (
                      <a href={t.external_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors">
                        <ExternalLink className="h-3 w-3" />
                        {t.external_url.includes("x.com") || t.external_url.includes("twitter")
                          ? "X/Twitter" : t.external_url.includes("youtube") || t.external_url.includes("youtu.be")
                          ? "YouTube" : "Link"}
                      </a>
                    )}
                  </div>
                </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-auto sm:ml-0">
                  <button onClick={() => toggle(t)} title={t.is_active ? "Deactivate" : "Activate"}
                    className={`relative w-10 h-5 rounded-full transition-colors ${t.is_active ? "bg-green-500" : "bg-muted"}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${t.is_active ? "left-5" : "left-0.5"}`} />
                  </button>
                  <Button size="sm" variant="outline" onClick={() => startEdit(t)} className="gap-1">
                    <Edit2 className="h-3 w-3" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(t.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
