import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PanelLeft, FolderOpen, LogOut, BarChart3, ChevronRight, Search, Gem, Compass } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getNavItem, getPageTitle, categoryClasses, CreateMenu } from "@/components/IconRail";
import { NotificationsMenu } from "@/components/NotificationsMenu";
import { LogoMark } from "@/components/brand/Logo";
import { useCommandPalette, isMac } from "@/components/command/CommandPalette";
import { isDemoMode } from "@/lib/demo";
import { cn } from "@/lib/utils";

interface TopHeaderProps {
  userEmail?: string;
  onSignOut: () => void;
  onMenuClick?: () => void;
  /** Mobil/tablette açılacak ikincil panel var mı (sayfaya özel sidebar) */
  hasPanel?: boolean;
}

/**
 * Top bar — ayrı bir şerit değil, ana yüzeyin içinde (Magnific App §6).
 * Sol: breadcrumb (Lumra › Sayfa, araçlarda kategori renkli kare).
 * Sağ: kenarlıklı "Library", ikon buton (tema), avatar menüsü.
 */
export const TopHeader = ({ userEmail, onSignOut, onMenuClick, hasPanel }: TopHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const title = getPageTitle(location.pathname);
  const item = getNavItem(location.pathname);
  const cat = item?.category ? categoryClasses[item.category] : undefined;
  const initial = userEmail?.charAt(0).toUpperCase() || "U";
  const { open: openSearch } = useCommandPalette();
  const demo = isDemoMode();

  return (
    <header className="h-header-mobile md:h-header flex items-center gap-2 px-3 md:px-4 shrink-0 safe-top" role="banner">
      {hasPanel && (
        <Button variant="ghost" size="icon" className="lg:hidden -ml-1" onClick={() => onMenuClick?.()} aria-label="Open panel">
          <PanelLeft />
        </Button>
      )}

      {/* Mobilde pembe oluştur butonu top bar'da (rail yok) */}
      <div className="md:hidden">
        <CreateMenu side="bottom" />
      </div>

      {/* Breadcrumb / sayfa seçici */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 min-w-0 flex-1 text-label-md">
        <button
          type="button"
          onClick={() => navigate("/home")}
          className="hidden sm:inline-flex items-center gap-2 h-8 px-2 rounded-md text-muted-foreground hover:bg-control hover:text-foreground transition-colors duration-fast"
        >
          <LogoMark size={16} />
          Lumra
        </button>
        <ChevronRight className="hidden sm:block size-3.5 text-tertiary-foreground" aria-hidden="true" />
        <h1 className="inline-flex items-center gap-2 h-8 px-2 text-foreground truncate" aria-current="page">
          {cat && <span className={cn("h-3 w-3 rounded-[3px]", cat.dot)} aria-hidden="true" />}
          {title}
        </h1>
      </nav>

      {/* Sağ aksiyonlar */}
      <div className="flex items-center gap-1.5">
        {demo && (
          <span className="hidden lg:inline-flex h-6 items-center rounded-full bg-control px-2.5 text-micro text-muted-foreground">
            Demo workspace
          </span>
        )}

        <button
          type="button"
          onClick={openSearch}
          aria-label="Search"
          aria-keyshortcuts={isMac() ? "Meta+K" : "Control+K"}
          className="hidden md:inline-flex items-center gap-2 h-8 w-[220px] pl-2.5 pr-1.5 rounded-md bg-control text-label-md text-tertiary-foreground hover:bg-control-hover transition-colors duration-fast"
        >
          <Search className="size-4" strokeWidth={1.5} aria-hidden="true" />
          <span className="flex-1 text-left">Search</span>
          <kbd className="inline-flex h-5 items-center rounded-xs bg-card px-1.5 text-micro text-muted-foreground">{isMac() ? "⌘K" : "Ctrl K"}</kbd>
        </button>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={openSearch} aria-label="Search">
          <Search />
        </Button>

        <button
          type="button"
          onClick={() => navigate("/usage")}
          className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-label-md text-brand hover:bg-brand-soft transition-colors duration-fast"
        >
          <Gem className="size-4" strokeWidth={1.75} aria-hidden="true" />
          Upgrade
        </button>

        <Button variant="outline" size="md" className="hidden xl:inline-flex" onClick={() => navigate("/explore")}>
          <Compass />
          Explore
        </Button>

        <div className="md:hidden">
          <NotificationsMenu side="bottom" align="end" variant="header" />
        </div>

        <ThemeToggle />

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Account menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-foreground text-background text-label-sm">{initial}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Account</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuLabel className="font-normal px-2">
              <p className="text-label-md text-foreground truncate">{userEmail ?? "Signed in"}</p>
              <p className="text-caption text-tertiary-foreground">Lumra Image Studio</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/usage")}>
              <BarChart3 className="size-4" strokeWidth={1.5} />
              Usage &amp; cost
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/cloud-files")}>
              <FolderOpen className="size-4" strokeWidth={1.5} />
              My library
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-danger-text focus:text-danger-text focus:bg-danger-bg">
              <LogOut className="size-4" strokeWidth={1.5} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
