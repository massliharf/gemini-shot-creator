import { useNavigate, useLocation } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Paintbrush,
  Eye,
  FileText,
  Layers,
  Sparkles,
  Quote,
  Glasses,
  MessageSquarePlus,
  Wand2,
  BarChart3,
  Plus,
  House,
  Compass,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { NotificationsMenu } from "@/components/NotificationsMenu";

/* ------------------------------------------------------------------
 * Navigasyon modeli — route'lar ve etiketler aynen korunur.
 * Magnific App rail'i: etiketsiz 32×32 ikonlar, isim tooltip'te;
 * birincil hedefler → ayırıcı → araç kısayolları → alta sabit öğeler.
 * Her araç türünün bir kategori rengi vardır (ikon + %10 zemin).
 * ------------------------------------------------------------------ */
export type NavGroup = "primary" | "tools" | "footer";
export type Category = "image" | "video" | "audio" | "design" | "3d" | "spaces" | "stock";

export interface NavItem {
  icon: LucideIcon;
  label: string;
  /** Bottom nav / kısa etiket */
  short?: string;
  path: string;
  group: NavGroup;
  /** Araç kategorisi rengi (yalnızca araçlarda) */
  category?: Category;
  /** Kısa açıklama (oluştur menüsü ve Home ızgarası) */
  description?: string;
}

export const navItems: NavItem[] = [
  { icon: House, label: "Home", path: "/home", group: "primary", description: "Start creating" },
  { icon: Compass, label: "Explore", path: "/explore", group: "primary", description: "Templates and use cases" },
  { icon: Eye, label: "Packs", path: "/", group: "primary", description: "Browse and generate your packs" },
  { icon: Paintbrush, label: "Styles", path: "/styles", group: "primary", description: "Style packs you uploaded" },
  { icon: FileText, label: "My Library", short: "Library", path: "/cloud-files", group: "primary", description: "Generated files in the cloud" },
  { icon: Sparkles, label: "Pack Creator", short: "Creator", path: "/pack-creator", group: "tools", category: "spaces", description: "Build a pack from references" },
  { icon: Layers, label: "Bulk Generator", short: "Bulk", path: "/generator", group: "tools", category: "image", description: "Generate many scenes at once" },
  { icon: MessageSquarePlus, label: "Text to Image", short: "Text", path: "/text-to-image", group: "tools", category: "image", description: "Describe it, get an image" },
  { icon: Wand2, label: "Prompt Generator", short: "Prompts", path: "/prompt-generator", group: "tools", category: "design", description: "Prompts from reference styles" },
  { icon: Quote, label: "Quote Generator", short: "Quotes", path: "/quote-generator", group: "tools", category: "audio", description: "Stylized quote images" },
  { icon: Glasses, label: "Glasses Try-On", short: "Glasses", path: "/glasses-generator", group: "tools", category: "video", description: "Try glasses on a photo" },
  { icon: BarChart3, label: "Usage & Cost", short: "Usage", path: "/usage", group: "footer", description: "Tokens and estimated cost" },
];

/** Kategori rengi → ikon/zemin sınıfları */
export const categoryClasses: Record<Category, { icon: string; box: string; dot: string }> = {
  spaces: { icon: "text-cat-spaces", box: "bg-cat-spaces/10", dot: "bg-cat-spaces" },
  image: { icon: "text-cat-image", box: "bg-cat-image/10", dot: "bg-cat-image" },
  video: { icon: "text-cat-video", box: "bg-cat-video/10", dot: "bg-cat-video" },
  audio: { icon: "text-cat-audio", box: "bg-cat-audio/10", dot: "bg-cat-audio" },
  design: { icon: "text-cat-design", box: "bg-cat-design/10", dot: "bg-cat-design" },
  "3d": { icon: "text-cat-3d", box: "bg-cat-3d/10", dot: "bg-cat-3d" },
  stock: { icon: "text-cat-stock", box: "bg-cat-stock/10", dot: "bg-cat-stock" },
};

/** Mobil bottom nav'da gösterilen 4 birincil hedef; kalanı "More" sheet'inde. */
export const primaryMobileNav = ["/home", "/explore", "/", "/text-to-image"];

export const getPageTitle = (pathname: string) =>
  navItems.find((i) => i.path === pathname)?.label ?? (pathname === "/studio" ? "Studio" : pathname === "/auth" ? "Sign in" : "Lumra");

export const getNavItem = (pathname: string) => navItems.find((i) => i.path === pathname);

/* Geriye dönük uyumluluk: eski gruplama API'si */
export const navGroups: { key: NavGroup; label: string }[] = [
  { key: "primary", label: "Workspace" },
  { key: "tools", label: "Tools" },
  { key: "footer", label: "Account" },
];

/* ------------------------------------------------------------------
 * Logo
 * ------------------------------------------------------------------ */
export const BrandMark = ({ size = "md", className }: { size?: "sm" | "md"; className?: string }) => (
  <LogoMark size={size === "sm" ? 28 : 32} className={className} />
);

/* ------------------------------------------------------------------
 * "+" Oluştur menüsü — pembe 32×32, ikon koyu. 224px menü, kategoriler
 * kategori renginde ikonlarla. Yalnızca navigasyon yapar.
 * ------------------------------------------------------------------ */
export const CreateMenu = ({ align = "start", side = "right" }: { align?: "start" | "center" | "end"; side?: "right" | "bottom" }) => {
  const navigate = useNavigate();
  const tools = navItems.filter((i) => i.group === "tools");
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Create"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand text-brand-foreground transition-[filter] duration-fast hover:brightness-95 active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side={side}>Create</TooltipContent>
      </Tooltip>
      <DropdownMenuContent side={side} align={align} sideOffset={8} className="w-56">
        <DropdownMenuLabel className="text-overline text-muted-foreground px-2">Create</DropdownMenuLabel>
        {tools.map((t) => {
          const cat = t.category ? categoryClasses[t.category] : undefined;
          return (
            <DropdownMenuItem key={t.path} onClick={() => navigate(t.path)}>
              <t.icon className={cn("size-4", cat?.icon)} strokeWidth={1.75} aria-hidden="true" />
              {t.label}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/styles")}>
          <Paintbrush className="size-4" strokeWidth={1.75} aria-hidden="true" />
          Styles
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/explore")}>
          <Compass className="size-4" strokeWidth={1.75} aria-hidden="true" />
          Browse templates
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/* ------------------------------------------------------------------
 * Rail (≥768): 72px, beyaz, r16, padding 16/20; yalnızca 32×32 ikonlar.
 * ------------------------------------------------------------------ */
const RailButton = ({ item }: { item: NavItem }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === item.path;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => navigate(item.path)}
          aria-current={isActive ? "page" : undefined}
          aria-label={item.label}
          className="rail-item"
        >
          <item.icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
};

export const NavRail = () => {
  const navigate = useNavigate();
  const primary = navItems.filter((i) => i.group === "primary");
  const tools = navItems.filter((i) => i.group === "tools");
  const footer = navItems.filter((i) => i.group === "footer");

  return (
    <nav
      aria-label="Primary"
      className="h-full w-rail flex-shrink-0 bg-card rounded-lg flex flex-col items-center py-4 px-5 gap-1 overflow-y-auto no-scrollbar"
    >
      <div className="flex flex-col items-center gap-3 mb-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => navigate("/home")}
              aria-label="Lumra home"
              className="rounded-md transition-transform duration-fast hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              <BrandMark />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Lumra</TooltipContent>
        </Tooltip>
        <CreateMenu />
      </div>

      <div className="flex flex-col items-center gap-1">
        {primary.map((item) => (
          <RailButton key={item.path} item={item} />
        ))}
      </div>

      <div className="my-2 h-px w-6 bg-border" aria-hidden="true" />

      <div className="flex flex-col items-center gap-1">
        {tools.map((item) => (
          <RailButton key={item.path} item={item} />
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center gap-1 pt-3">
        <NotificationsMenu side="right" align="end" />
        {footer.map((item) => (
          <RailButton key={item.path} item={item} />
        ))}
      </div>
    </nav>
  );
};

/* Geriye dönük uyumluluk */
export const Sidebar = NavRail;
export const IconRail = NavRail;
export function useSidebarCollapsed() {
  return [false, (_: boolean | ((c: boolean) => boolean)) => void 0] as const;
}
