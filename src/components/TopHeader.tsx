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
import { PanelLeft, FolderOpen, LogOut, BarChart3, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getNavItem, getPageTitle, categoryClasses, CreateMenu } from "@/components/IconRail";
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
          onClick={() => navigate("/")}
          className="hidden sm:inline-flex items-center gap-2 h-8 px-2 rounded-md text-muted-foreground hover:bg-control hover:text-foreground transition-colors duration-fast"
        >
          <span className="h-3 w-3 rounded-[3px] bg-foreground" aria-hidden="true" />
          Lumra
        </button>
        <ChevronRight className="hidden sm:block size-3.5 text-tertiary-foreground" aria-hidden="true" />
        <h1 className="inline-flex items-center gap-2 h-8 px-2 text-foreground truncate" aria-current="page">
          {cat && <span className={cn("h-3 w-3 rounded-[3px]", cat.box, "ring-1 ring-inset", cat.icon.replace("text-", "ring-"))} aria-hidden="true" />}
          {title}
        </h1>
      </nav>

      {/* Sağ aksiyonlar */}
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="md" className="hidden md:inline-flex" onClick={() => navigate("/cloud-files")}>
          <FolderOpen />
          Library
        </Button>

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
