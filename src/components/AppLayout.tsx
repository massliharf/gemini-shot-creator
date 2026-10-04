import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

import { TopHeader } from "@/components/TopHeader";
import { NavRail, navItems, navGroups, primaryMobileNav, getPageTitle, categoryClasses, normalizePath } from "@/components/IconRail";

interface AppLayoutProps {
  children: ReactNode;
  userEmail?: string;
  sidebar?: ReactNode;
}

/**
 * Kabuk (Magnific App §6): #F5F5F5 zemin üzerinde 8px boşlukla duran,
 * 16px köşeli iki yüzen kart — sol rail (72px, beyaz) ve ana yüzey (#FAFAFA).
 * Top bar ana yüzeyin içinde. Sayfaya özel panel (~300px) ana yüzeyin solunda.
 * Mobil (<768): rail yok → top bar + bottom navigation; panel Sheet'te açılır.
 */
export const AppLayout = ({ children, userEmail, sidebar }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [panelOpen, setPanelOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // Pages that don't pass the e-mail still get the right avatar initial.
  const [sessionEmail, setSessionEmail] = useState<string | undefined>();
  useEffect(() => {
    if (userEmail) return;
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setSessionEmail(session?.user.email ?? undefined);
    });
    return () => {
      active = false;
    };
  }, [userEmail]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Signed out");
  };

  const primaryItems = primaryMobileNav.map((p) => navItems.find((i) => i.path === p)!).filter(Boolean);
  const currentPath = normalizePath(location.pathname);
  const moreActive = !primaryMobileNav.includes(currentPath) && navItems.some((i) => i.path === currentPath);

  return (
    <div className="h-screen w-full bg-app flex overflow-hidden md:p-shell md:gap-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      {/* Rail (tablet + desktop) */}
      <div className="hidden md:block h-full">
        <NavRail />
      </div>

      {/* Ana yüzey */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-background md:rounded-lg">
        <TopHeader userEmail={userEmail ?? sessionEmail} onSignOut={handleSignOut} onMenuClick={() => setPanelOpen(true)} hasPanel={!!sidebar} />

        {/* Mobil / tablet: sayfaya özel panel (Sheet) */}
        {sidebar && (
          <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
            <SheetContent side="left" className="w-[min(320px,85vw)] p-0 overflow-hidden flex flex-col rounded-r-lg">
              <SheetHeader className="px-4 py-3">
                <SheetTitle className="text-heading-sm">{getPageTitle(location.pathname)}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{sidebar}</div>
            </SheetContent>
          </Sheet>
        )}

        <div className="flex-1 min-h-0 flex overflow-hidden">
          {sidebar && (
            <aside
              aria-label="Page panel"
              className="hidden lg:flex w-tool-panel min-w-[280px] flex-col overflow-hidden h-full min-h-0 pl-2 pb-2"
            >
              <div className="flex flex-col h-full min-h-0 overflow-hidden bg-card rounded-lg">{sidebar}</div>
            </aside>
          )}

          <div id="main-content" className="flex-1 min-w-0 overflow-hidden flex flex-col pb-bottom-nav md:pb-0">
            {children}
          </div>
        </div>
      </div>

      {/* Mobil: Bottom Navigation */}
      <nav aria-label="Primary" className="md:hidden fixed bottom-0 inset-x-0 z-header bg-card border-t border-border safe-bottom">
        <ul className="grid grid-cols-5 h-bottom-nav">
          {primaryItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <li key={item.path}>
                <button
                  type="button"
                  onClick={() => navigate(item.path)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 w-full h-full text-muted-foreground transition-colors duration-fast",
                    isActive && "text-foreground",
                  )}
                >
                  <span className={cn("flex items-center justify-center h-7 w-10 rounded-md transition-colors duration-fast", isActive && "bg-active")}>
                    <item.icon className="size-5" strokeWidth={isActive ? 2 : 1.5} aria-hidden="true" />
                  </span>
                  <span className="text-micro">{item.short ?? item.label}</span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full text-muted-foreground transition-colors duration-fast",
                moreActive && "text-foreground",
              )}
            >
              <span className={cn("flex items-center justify-center h-7 w-10 rounded-md transition-colors duration-fast", moreActive && "bg-active")}>
                <MoreHorizontal className="size-5" strokeWidth={moreActive ? 2 : 1.5} aria-hidden="true" />
              </span>
              <span className="text-micro">More</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Mobil: "More" → bottom sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-lg p-0 max-h-[85vh] overflow-y-auto safe-bottom">
          <div className="mx-auto mt-2 h-1 w-8 rounded-full bg-border-strong" aria-hidden="true" />
          <SheetHeader className="px-4 pt-3 pb-1">
            <SheetTitle className="text-heading-sm">All tools</SheetTitle>
          </SheetHeader>
          <div className="px-2 pb-4 space-y-3">
            {navGroups.map((group) => (
              <div key={group.key}>
                <p className="text-overline text-muted-foreground px-3 mb-1">{group.label}</p>
                <ul>
                  {navItems
                    .filter((i) => i.group === group.key)
                    .map((item) => {
                      const isActive = currentPath === item.path;
                      const cat = item.category ? categoryClasses[item.category] : undefined;
                      return (
                        <li key={item.path}>
                          <button
                            type="button"
                            onClick={() => {
                              navigate(item.path);
                              setMoreOpen(false);
                            }}
                            aria-current={isActive ? "page" : undefined}
                            className="nav-item w-full px-3 min-h-touch"
                          >
                            <item.icon className={cn("size-4", cat?.icon)} strokeWidth={1.5} aria-hidden="true" />
                            <span>{item.label}</span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
