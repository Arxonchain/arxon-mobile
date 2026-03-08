import { useState } from "react";
import { User, Bell, Shield, ChevronRight, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileSettings from "@/components/settings/ProfileSettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";

const settingsSections = [
  {
    id: "profile",
    icon: User,
    title: "Profile",
    description: "Manage your account information",
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Notifications",
    description: "Configure notification preferences",
  },
  {
    id: "security",
    icon: Shield,
    title: "Security",
    description: "Update password and security settings",
  },
];

const Settings = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Mobile: Show section list or specific section
  // Desktop: Show tabs layout
  const renderMobileView = () => {
    if (activeSection) {
      const section = settingsSections.find((s) => s.id === activeSection);
      return (
        <div className="space-y-4">
          <button
            onClick={() => setActiveSection(null)}
            className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Settings
          </button>
          
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/30">
              {section && (
                <>
                  <div className="p-2 rounded-lg bg-accent/20 text-accent">
                    <section.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">{section.title}</h2>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </>
              )}
            </div>
            
            {activeSection === "profile" && <ProfileSettings />}
            {activeSection === "notifications" && <NotificationSettings />}
            {activeSection === "security" && <SecuritySettings />}
          </div>
        </div>
      );
    }

    return (
      <div className="grid gap-2 sm:gap-3">
        {settingsSections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className="glass-card p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:bg-secondary/50 transition-colors text-left group"
          >
            <div className="p-2 sm:p-2.5 rounded-lg bg-accent/20 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors shrink-0">
              <section.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">{section.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{section.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </button>
        ))}
      </div>
    );
  };

  const renderDesktopView = () => (
    <Tabs defaultValue="profile" className="space-y-4">
      <TabsList className="bg-secondary/50 border border-border/30 p-1 w-full justify-start flex-wrap h-auto gap-1">
        {settingsSections.map((section) => (
          <TabsTrigger
            key={section.id}
            value={section.id}
            className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground flex items-center gap-2 px-4 py-2"
          >
            <section.icon className="h-4 w-4" />
            {section.title}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="glass-card p-4 lg:p-6">
        <TabsContent value="profile" className="mt-0">
          <ProfileSettings />
        </TabsContent>
        <TabsContent value="notifications" className="mt-0">
          <NotificationSettings />
        </TabsContent>
        <TabsContent value="security" className="mt-0">
          <SecuritySettings />
        </TabsContent>
      </div>
    </Tabs>
  );

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate('/')}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Settings</h1>
      </div>

      {/* Mobile view */}
      <div className="lg:hidden">
        {renderMobileView()}
      </div>

      {/* Desktop view */}
      <div className="hidden lg:block">
        {renderDesktopView()}
      </div>
    </div>
  );
};

export default Settings;
