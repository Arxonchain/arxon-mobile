import { useState, useEffect } from "react";
import { Send, Trash2, Edit2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  created_at: string;
}

const AdminAnnouncements = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both title and message.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("announcements").insert({
        title,
        message,
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: "Announcement Sent",
        description: "Your announcement has been published to all miners.",
      });
      setTitle("");
      setMessage("");
      fetchAnnouncements();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send announcement",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Announcement has been removed.",
      });
      fetchAnnouncements();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete announcement",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Announcements</h1>
        <p className="text-sm md:text-base text-muted-foreground">Send announcements to all miners</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Create Announcement */}
        <div className="glass-card p-4 md:p-6 space-y-3 md:space-y-4">
          <h3 className="font-semibold text-sm md:text-base text-foreground">New Announcement</h3>

          <div className="space-y-3 md:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm">Title</Label>
              <Input
                id="title"
                placeholder="Enter announcement title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-muted/50 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm">Message</Label>
              <Textarea
                id="message"
                placeholder="Write your announcement message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-muted/50 min-h-[150px] md:min-h-[200px] text-sm"
              />
            </div>

            <Button onClick={handleSend} className="w-full" size="sm">
              <Send className="h-4 w-4 mr-2" />
              Send Announcement
            </Button>
          </div>
        </div>

        {/* Recent Announcements */}
        <div className="glass-card p-4 md:p-6 space-y-3 md:space-y-4">
          <h3 className="font-semibold text-sm md:text-base text-foreground">Recent Announcements</h3>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No announcements yet</p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3 max-h-[350px] md:max-h-[400px] overflow-y-auto">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-3 md:p-4 bg-muted/30 rounded-lg space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm md:text-base text-foreground line-clamp-1">{announcement.title}</h4>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8">
                        <Edit2 className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 md:h-8 md:w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(announcement.id)}
                      >
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                    {announcement.message}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDate(announcement.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncements;
