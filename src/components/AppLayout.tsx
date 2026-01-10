import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Paintbrush, Eye, FileText, HelpCircle, Menu } from "lucide-react";
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
  { icon: Paintbrush, label: "Styles", path: "/styles" },
  { icon: Eye, label: "Generator", path: "/" },
  { icon: FileText, label: "My Library", path: "/cloud-files" },
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
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Left Navigation Rail - Desktop */}
      <nav className="hidden lg:flex w-14 flex-shrink-0 bg-background flex-col items-center pt-4">
        {/* Hamburger Menu */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-lg mb-6 text-foreground hover:bg-muted"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Nav Items */}
        <div className="flex flex-col items-center gap-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-10 w-10 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-amber-400 text-foreground hover:bg-amber-400' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
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
      </nav>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-background border-b border-border px-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] p-0 bg-background overflow-hidden">
              {/* Mobile Nav */}
              <div className="p-4 border-b border-border">
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Button
                        key={item.path}
                        variant="ghost"
                        className={`w-full justify-start ${isActive ? 'bg-amber-400 text-foreground' : ''}`}
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
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
          </Button>
          {userEmail && (
            <Avatar className="h-8 w-8 cursor-pointer" onClick={handleSignOut}>
              <AvatarImage src="" />
              <AvatarFallback className="bg-rose-400 text-white text-xs">
                {userEmail.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
        {/* Top Header - Desktop */}
        <header className="hidden lg:flex h-14 items-center justify-end px-6 bg-background">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-5 h-9 border-border font-medium"
              onClick={() => navigate("/cloud-files")}
            >
              My Library
            </Button>

            <Button
              size="sm"
              className="rounded-full px-5 h-9 bg-foreground text-background hover:bg-foreground/90 font-semibold"
            >
              PRO
            </Button>

            {userEmail && (
              <Avatar
                className="h-10 w-10 cursor-pointer border-2 border-background shadow-sm"
                onClick={handleSignOut}
              >
                <AvatarImage src="" />
                <AvatarFallback className="bg-rose-400 text-white text-sm font-medium">
                  {userEmail.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </header>

        {/* Content with optional sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Desktop */}
          {sidebar && (
            <aside className="hidden lg:flex w-[300px] min-w-[280px] bg-background border-r border-border flex-col overflow-hidden">
              {sidebar}
            </aside>
          )}

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
