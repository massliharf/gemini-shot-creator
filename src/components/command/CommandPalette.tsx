import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Command as CommandPrimitive } from "cmdk";
import { ArrowRight, CornerDownLeft, LogOut, Moon, Search, Sparkles, Sun, Wand2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { navItems, categoryClasses } from "@/components/IconRail";
import { mockImage, samplePromptIdeas, sampleTemplates } from "@/data/mock";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
 * ⌘K command palette — one search box for tools, pages, templates,
 * prompt ideas and quick actions. Opened with ⌘K / Ctrl+K, the Home
 * search field or the top bar search button.
 * ------------------------------------------------------------------ */

interface CommandPaletteContextValue {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  open: () => {},
  close: () => {},
  isOpen: false,
});

export const useCommandPalette = () => useContext(CommandPaletteContext);

export const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

const itemClass =
  "group flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-md px-2 text-label-md text-foreground outline-none data-[selected=true]:bg-control aria-selected:bg-control";
const groupClass =
  "px-2 pb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-overline [&_[cmdk-group-heading]]:text-muted-foreground";

export const CommandPaletteProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = useCallback(
    (fn: () => void) => {
      setIsOpen(false);
      // let the dialog close before navigating so focus returns cleanly
      requestAnimationFrame(fn);
    },
    [],
  );

  const tools = navItems.filter((i) => i.group === "tools");
  const pages = navItems.filter((i) => i.group !== "tools");
  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="top-[18%] translate-y-0 data-[state=closed]:slide-out-to-top-[16%] data-[state=open]:slide-in-from-top-[16%] max-w-[600px] gap-0 overflow-hidden p-0 [&>button:last-child]:hidden">
          <DialogTitle className="sr-only">Search Lumra</DialogTitle>
          <CommandPrimitive loop className="flex flex-col">
            <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border">
              <Search className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
              <CommandPrimitive.Input
                autoFocus
                placeholder="Search tools, templates, prompts…"
                className="h-full flex-1 bg-transparent text-body-md text-foreground outline-none placeholder:text-tertiary-foreground"
              />
              <kbd className="meta-chip h-5 px-1.5 text-micro">Esc</kbd>
            </div>
            <CommandPrimitive.List className="max-h-[min(440px,60vh)] overflow-y-auto overscroll-contain pb-2">
              <CommandPrimitive.Empty className="py-10 text-center text-body-sm text-muted-foreground">
                No results. Try “portrait” or “pack”.
              </CommandPrimitive.Empty>

              <CommandPrimitive.Group heading="Create" className={groupClass}>
                {tools.map((t) => {
                  const cat = t.category ? categoryClasses[t.category] : undefined;
                  return (
                    <CommandPrimitive.Item
                      key={t.path}
                      value={`create ${t.label} ${t.description ?? ""}`}
                      onSelect={() => run(() => navigate(t.path))}
                      className={itemClass}
                    >
                      <span className={cn("flex size-6 items-center justify-center rounded-md", cat?.box)}>
                        <t.icon className={cn("size-3.5", cat?.icon)} strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <span className="flex-1 truncate">{t.label}</span>
                      <span className="hidden sm:block text-caption text-tertiary-foreground truncate">{t.description}</span>
                    </CommandPrimitive.Item>
                  );
                })}
              </CommandPrimitive.Group>

              <CommandPrimitive.Group heading="Templates" className={groupClass}>
                {sampleTemplates.slice(0, 5).map((t) => (
                  <CommandPrimitive.Item
                    key={t.id}
                    value={`template ${t.title} ${t.description}`}
                    onSelect={() => run(() => navigate(`${t.path}?prompt=${encodeURIComponent(t.prompt)}`))}
                    className={itemClass}
                  >
                    <img src={mockImage(t.cover)} alt="" className="size-6 rounded-[6px] object-cover" />
                    <span className="flex-1 truncate">{t.title}</span>
                    <span className="text-caption text-tertiary-foreground">{t.kind}</span>
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>

              <CommandPrimitive.Group heading="Prompt ideas" className={groupClass}>
                {samplePromptIdeas.map((p) => (
                  <CommandPrimitive.Item
                    key={p}
                    value={`prompt ${p}`}
                    onSelect={() => run(() => navigate(`/text-to-image?prompt=${encodeURIComponent(p)}`))}
                    className={itemClass}
                  >
                    <Wand2 className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                    <span className="flex-1 truncate">{p}</span>
                    <ArrowRight className="size-3.5 text-tertiary-foreground opacity-0 group-data-[selected=true]:opacity-100" aria-hidden="true" />
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>

              <CommandPrimitive.Group heading="Go to" className={groupClass}>
                {pages.map((p) => (
                  <CommandPrimitive.Item
                    key={p.path}
                    value={`go ${p.label}`}
                    onSelect={() => run(() => navigate(p.path))}
                    className={itemClass}
                  >
                    <p.icon className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                    <span className="flex-1 truncate">{p.label}</span>
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>

              <CommandPrimitive.Group heading="Actions" className={groupClass}>
                <CommandPrimitive.Item
                  value="toggle theme dark light mode"
                  onSelect={() => run(() => setTheme(theme === "dark" ? "light" : "dark"))}
                  className={itemClass}
                >
                  {theme === "dark" ? (
                    <Sun className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                  ) : (
                    <Moon className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                  )}
                  <span className="flex-1">{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</span>
                </CommandPrimitive.Item>
                <CommandPrimitive.Item
                  value="guided tour onboarding help"
                  onSelect={() => run(() => window.dispatchEvent(new Event("lumra:tour")))}
                  className={itemClass}
                >
                  <Sparkles className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                  <span className="flex-1">Take the guided tour</span>
                </CommandPrimitive.Item>
                <CommandPrimitive.Item
                  value="sign out log out"
                  onSelect={() =>
                    run(async () => {
                      await supabase.auth.signOut();
                      navigate("/auth");
                    })
                  }
                  className={itemClass}
                >
                  <LogOut className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                  <span className="flex-1">Sign out</span>
                </CommandPrimitive.Item>
              </CommandPrimitive.Group>
            </CommandPrimitive.List>
            <div className="flex items-center gap-4 border-t border-border bg-background px-4 h-10 text-caption text-tertiary-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CornerDownLeft className="size-3.5" aria-hidden="true" /> Open
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="font-sans">↑↓</kbd> Navigate
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5">
                <kbd className="font-sans">{isMac() ? "⌘" : "Ctrl"} K</kbd> Toggle
              </span>
            </div>
          </CommandPrimitive>
        </DialogContent>
      </Dialog>
    </CommandPaletteContext.Provider>
  );
};
