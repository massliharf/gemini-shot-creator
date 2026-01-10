import type { ReactNode } from "react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { TopHeader } from "@/components/TopHeader";
import { IconRail, navItems } from "@/components/IconRail";

interface AppLayoutProps {
  children: ReactNode;
  userEmail?: string;
  sidebar?: ReactNode;
}

export const AppLayout = ({ children, userEmail, sidebar }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Signed out successfully");
  };

  return (
    <div className="min-h-screen bg-background flex w-full overflow-hidden">
      {/* Left Navigation Rail (desktop) */}
      <div className="hidden lg:block">
        <IconRail />
      </div>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top Header (all pages) */}
        <TopHeader
          userEmail={userEmail}
          onSignOut={handleSignOut}
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        {/* Mobile menu: route nav + optional sidebar */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-[320px] p-0 bg-background overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Button
                      key={item.path}
                      variant="ghost"
                      className={`w-full justify-start ${
                        isActive ? "bg-warning text-warning-foreground hover:bg-warning" : "hover:bg-muted"
                      }`}
                      onClick={() => {
                        navigate(item.path);
                        setMobileMenuOpen(false);
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

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar (desktop) */}
          {sidebar && (
            <aside className="hidden lg:flex w-[300px] min-w-[280px] bg-background border-r border-border flex-col overflow-hidden">
              {sidebar}
            </aside>
          )}

          {/* Main */}
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col">{children}</div>
        </div>
      </div>
    </div>
  );
};

