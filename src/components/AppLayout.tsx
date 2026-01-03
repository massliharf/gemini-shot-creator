import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, Home, Wand2, Cloud, HelpCircle, Settings, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface AppLayoutProps {
  children: React.ReactNode;
  userEmail?: string;
  sidebar?: React.ReactNode;
}

const navItems = [
  { icon: Home, label: "Ana Sayfa", path: "/" },
  { icon: Wand2, label: "Pack Generator", path: "/generator" },
  { icon: Cloud, label: "Cloud Dosyaları", path: "/cloud-files" },
];

export const AppLayout = ({ children, userEmail, sidebar }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Signed out successfully");
  };

  return (
    <div className="h-screen bg-muted/30 flex overflow-hidden p-4 gap-4">
      {/* Left Navigation Rail - Desktop */}
      <nav className="hidden lg:flex w-16 flex-shrink-0 bg-card rounded-2xl border border-border/50 flex-col items-center py-4 gap-2">
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        
        {/* Nav Items */}
        <div className="flex-1 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="icon"
                    className={`h-10 w-10 rounded-xl transition-colors ${isActive ? 'bg-primary/10 text-primary' : ''}`}
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        
        {/* Bottom Actions */}
        <div className="flex flex-col gap-1 mt-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
                <HelpCircle className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Yardım</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
                <Settings className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Ayarlar</TooltipContent>
          </Tooltip>
          
          {userEmail && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-10 w-10 cursor-pointer" onClick={handleSignOut}>
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-secondary text-xs">
                    {userEmail.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right">Çıkış Yap</TooltipContent>
            </Tooltip>
          )}
        </div>
      </nav>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border/50 px-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] p-0 bg-card overflow-hidden">
              {/* Mobile Nav */}
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-base font-semibold">Lumra</span>
                </div>
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Button
                        key={item.path}
                        variant={isActive ? "secondary" : "ghost"}
                        className={`w-full justify-start ${isActive ? 'bg-primary/10 text-primary' : ''}`}
                        onClick={() => {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }}
                      >
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              {sidebar}
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-base font-semibold">Lumra</span>
          </div>
        </div>

        {userEmail && (
          <Avatar className="h-8 w-8 cursor-pointer" onClick={handleSignOut}>
            <AvatarImage src="" />
            <AvatarFallback className="bg-secondary text-xs">
              {userEmail.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Sidebar - Desktop */}
      {sidebar && (
        <aside className="hidden lg:flex w-[300px] min-w-[280px] bg-card rounded-2xl border border-border/50 flex-col overflow-hidden">
          {sidebar}
        </aside>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col gap-4 min-w-0 ${sidebar ? 'lg:pt-0' : ''} pt-14 lg:pt-0`}>
        {children}
      </div>
    </div>
  );
};
