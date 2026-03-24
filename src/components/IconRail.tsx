import { useNavigate, useLocation } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Paintbrush, Eye, FileText, Layers, Sparkles, Quote, Glasses, MessageSquarePlus } from "lucide-react";

export const navItems = [
  { icon: Paintbrush, label: "Styles", path: "/styles" },
  { icon: Eye, label: "Packs", path: "/" },
  { icon: Sparkles, label: "Pack Creator", path: "/pack-creator" },
  { icon: Layers, label: "Bulk Generator", path: "/generator" },
  { icon: MessageSquarePlus, label: "Text to Image", path: "/text-to-image" },
  { icon: Quote, label: "Quote Generator", path: "/quote-generator" },
  { icon: Glasses, label: "Glasses Try-On", path: "/glasses-generator" },
  { icon: FileText, label: "My Library", path: "/cloud-files" },
];

export const IconRail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="w-[60px] h-full flex-shrink-0 bg-foreground dark:bg-card flex flex-col items-center py-3 gap-1 border-r border-transparent dark:border-border/50">
      {/* Logo */}
      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center mb-4">
        <span className="text-white font-bold text-sm">L</span>
      </div>

      {/* Navigation Icons */}
      <div className="flex flex-col items-center gap-0.5 flex-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <button
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-white/40 hover:text-white/70 hover:bg-white/5"
                  }`}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2 : 1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </nav>
  );
};
